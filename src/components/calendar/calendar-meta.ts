import type { CalendarEvent, CalendarEventType, Holiday, HolidayType } from "@/lib/api";

/* -------------------------------------------------------------------------- */
/*                                   Palette                                  */
/* -------------------------------------------------------------------------- */

/**
 * One accent per event type. `pill` is for the compact chips in calendar
 * cells; `dot` marks the type in legends and lists.
 */
export const EVENT_TYPE_META: Record<
  CalendarEventType,
  { label: string; pill: string; dot: string }
> = {
  academic: {
    label: "Academic",
    pill: "bg-brand-50 text-brand-700 ring-brand-100",
    dot: "bg-brand-500",
  },
  cultural: {
    label: "Cultural",
    pill: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:ring-fuchsia-500/20",
    dot: "bg-fuchsia-500",
  },
  sports: {
    label: "Sports",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
  examination: {
    label: "Examination",
    pill: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/20",
    dot: "bg-amber-500",
  },
  holiday: {
    label: "Holiday",
    pill: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/20",
    dot: "bg-rose-500",
  },
  administrative: {
    label: "Administrative",
    pill: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-400/15 dark:text-slate-300 dark:ring-slate-400/20",
    dot: "bg-slate-500",
  },
  other: {
    label: "Other",
    pill: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-400 dark:ring-sky-500/20",
    dot: "bg-sky-500",
  },
};

/** Holidays share one accent — the type is a label, not a colour. */
export const HOLIDAY_PILL =
  "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/20";

export const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  national: "National",
  regional: "Regional",
  religious: "Religious",
  school: "School",
  weather: "Weather",
  emergency: "Emergency",
};

/* -------------------------------------------------------------------------- */
/*                                    Dates                                   */
/* -------------------------------------------------------------------------- */

/**
 * All date maths here is on local calendar components, never UTC: the calendar
 * shows the user's days, and a UTC round-trip would shift them by one.
 */

export function isoFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromISO(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function todayISO(): string {
  return isoFromDate(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const date = dateFromISO(iso);
  date.setDate(date.getDate() + days);
  return isoFromDate(date);
}

/** "YYYY-MM" for the month an ISO date falls in. */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(year, index - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function firstOfMonth(month: string): string {
  return `${month}-01`;
}

/**
 * The 42 days a month grid shows, always six full weeks starting Monday, so
 * the grid never changes height as you page through months.
 */
export function gridDays(month: string): string[] {
  const first = dateFromISO(firstOfMonth(month));
  // getDay(): 0 = Sunday. Shift so Monday is the first column.
  const offset = (first.getDay() + 6) % 7;
  const start = addDaysISO(isoFromDate(first), -offset);
  return Array.from({ length: 42 }, (_, index) => addDaysISO(start, index));
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Day codes in the same Monday-first order the settings screen shows. */
export const DAY_CODES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** "monday", "MON", "Mon." all collapse to "mon". */
export function normaliseDay(value: string): string | null {
  const key = value.trim().toLowerCase().slice(0, 3);
  return DAY_CODES.includes(key) ? key : null;
}

export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(dateFromISO(firstOfMonth(month)));
}

/** "09:30:00" → "9:30 am". Anything unparseable is returned untouched. */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return value;

  const hours = Number(match[1]);
  const minutes = match[2];
  if (!Number.isFinite(hours)) return value;

  const suffix = hours >= 12 ? "pm" : "am";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${minutes} ${suffix}`;
}

/** `<input type="time">` wants "HH:MM"; the backend may send seconds too. */
export function toTimeInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
}

/* -------------------------------------------------------------------------- */
/*                                  Spanning                                  */
/* -------------------------------------------------------------------------- */

/** True when `iso` falls inside the item's start..end range, inclusive. */
export function coversDay(
  item: { start_date: string; end_date?: string | null },
  iso: string
): boolean {
  const start = item.start_date?.slice(0, 10);
  if (!start) return false;
  const end = (item.end_date || item.start_date).slice(0, 10);
  // ISO dates compare correctly as strings.
  return start <= iso && iso <= end;
}

export function isMultiDay(item: {
  start_date: string;
  end_date?: string | null;
}): boolean {
  const start = item.start_date?.slice(0, 10);
  const end = (item.end_date || item.start_date)?.slice(0, 10);
  return Boolean(start && end && start !== end);
}

export type DayItems = {
  events: CalendarEvent[];
  holidays: Holiday[];
};

/** Buckets every event and holiday into each day it covers. */
export function bucketByDay(
  days: string[],
  events: CalendarEvent[],
  holidays: Holiday[]
): Map<string, DayItems> {
  const buckets = new Map<string, DayItems>();
  for (const day of days) buckets.set(day, { events: [], holidays: [] });

  for (const event of events) {
    for (const day of days) {
      if (coversDay(event, day)) buckets.get(day)?.events.push(event);
    }
  }
  for (const holiday of holidays) {
    for (const day of days) {
      if (coversDay(holiday, day)) buckets.get(day)?.holidays.push(holiday);
    }
  }

  return buckets;
}
