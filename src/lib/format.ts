/**
 * Display formatters. All locale-aware on `en-IN`, so counts group in the
 * Indian system (1,23,456) and money renders with ₹.
 */

const numberFormatter = new Intl.NumberFormat("en-IN");

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// en-GB for dates: same day-month-year order as en-IN but abbreviates to "Sep"
// rather than "Sept", which sits better in the compact event tiles.
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "short" });

/** 123456 → "1,23,456". Non-finite input renders as an em dash. */
export function formatNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return numberFormatter.format(value);
}

/** 250000 → "₹2,50,000". Paise are dropped — these are summary figures. */
export function formatCurrency(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return currencyFormatter.format(value);
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "2026-09-14" → "14 Sep 2026". Unparseable input renders as an em dash. */
export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "—";
}

/** "Mon" — pairs with formatDate for the event date blocks. */
export function formatWeekday(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? weekdayFormatter.format(date) : "";
}

/** Splits a date into its parts, for the calendar-tile look on event rows. */
export function dateParts(value: string | Date | null | undefined) {
  const date = toDate(value);
  if (!date) return null;
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date),
    weekday: weekdayFormatter.format(date),
  };
}

/** "Today", "Tomorrow", "In 5 days" — relative to now, for event subtitles. */
export function relativeDay(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTarget = new Date(date);
  startOfTarget.setHours(0, 0, 0, 0);

  const days = Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000
  );

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}

/**
 * Backend event types arrive as tokens like `PARENT_TEACHER_MEETING`.
 * Render them as "Parent Teacher Meeting".
 */
export function humanizeToken(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Initials for the avatar — "Asha Mehta" → "AM", "admin@x.com" → "AD". */
export function initialsFrom(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0]?.replace(/[._-]+/g, " ");
  if (!source) return "?";

  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * "2010-05-04T00:00:00Z" -> "2010-05-04", the shape a date input needs.
 * Anything that is not an ISO-ish date renders as an empty field.
 */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : "";
}
