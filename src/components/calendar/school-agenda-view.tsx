"use client";

import * as React from "react";
import { CalendarClock, CalendarDays, PartyPopper } from "lucide-react";

import {
  EVENT_TYPE_META,
  HOLIDAY_PILL,
  HOLIDAY_TYPE_LABELS,
  isMultiDay,
  todayISO,
} from "@/components/calendar/calendar-meta";
import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listCalendarEvents,
  listHolidays,
  toCalendarEventType,
  toHolidayType,
  type AcademicYear,
  type CalendarEvent,
  type Holiday,
} from "@/lib/api";
import { dateParts, formatDate, relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The school's diary, read only: every event and holiday still ahead, merged
 * into one running list.
 *
 * It is a panel rather than a page because the roles that show it differ only
 * in their header — each owns its own scope hook and page chrome, and drops
 * this in for the part that is genuinely the same.
 */

/** Events and holidays are two shapes; the agenda renders them as one list. */
type AgendaItem =
  | { kind: "event"; id: string; date: string; event: CalendarEvent }
  | { kind: "holiday"; id: string; date: string; holiday: Holiday };

type Loaded = {
  /** The year this data answers — see `requestKey` below. */
  requestKey: string;
  items: AgendaItem[];
};

function itemDate(item: { start_date: string; end_date?: string | null }): string {
  return (item.start_date || "").slice(0, 10);
}

function DateTile({ date }: { date: string }) {
  const parts = dateParts(date);

  return (
    <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
      <span className="text-[0.5625rem] font-medium tracking-wide uppercase">
        {parts?.month ?? "—"}
      </span>
      <span className="text-base leading-none font-semibold tabular-nums">
        {parts?.day ?? "--"}
      </span>
    </span>
  );
}

function AgendaRow({ item }: { item: AgendaItem }) {
  const isHoliday = item.kind === "holiday";
  const source = isHoliday ? item.holiday : item.event;
  const title = isHoliday ? item.holiday.name : item.event.title;

  const pill = isHoliday
    ? HOLIDAY_PILL
    : EVENT_TYPE_META[toCalendarEventType(item.event.event_type) ?? "other"].pill;
  const label = isHoliday
    ? HOLIDAY_TYPE_LABELS[toHolidayType(item.holiday.holiday_type) ?? "school"]
    : EVENT_TYPE_META[toCalendarEventType(item.event.event_type) ?? "other"].label;

  const span = isMultiDay(source)
    ? `${formatDate(source.start_date)} – ${formatDate(source.end_date)}`
    : formatDate(source.start_date);

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <DateTile date={item.date} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title || "Untitled"}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("rounded-md px-1.5 py-0.5 font-medium ring-1", pill)}>
            {label}
          </span>
          <span>{span}</span>
          {!isHoliday && item.event.location && (
            <span className="truncate">{item.event.location}</span>
          )}
        </p>
      </div>

      <span className="hidden shrink-0 text-xs font-medium text-muted-foreground sm:block">
        {relativeDay(item.date)}
      </span>
    </li>
  );
}

function RowsSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-[55%] rounded-md" />
            <Skeleton className="h-3 w-56 max-w-[75%] rounded-md" />
          </div>
          <Skeleton className="h-4 w-16 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Panel                                   */
/* -------------------------------------------------------------------------- */

export function SchoolAgendaPanel({ year }: { year: AcademicYear }) {
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Identifies the data the year asks for. Loading is then simply "what we
  // hold isn't what we asked for" — no loading flag to keep in sync.
  const requestKey = `${year.id}|${reloadKey}`;

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([
      listCalendarEvents({ academic_year_id: year.id }),
      // Holidays are a second list; losing them costs a section, not the page.
      listHolidays(year.id).catch(() => [] as Holiday[]),
    ])
      .then(([events, holidays]) => {
        if (cancelled) return;
        const today = todayISO();

        const items: AgendaItem[] = [
          ...events.map((event) => ({
            kind: "event" as const,
            id: `event-${event.id}`,
            date: itemDate(event),
            event,
          })),
          ...holidays.map((holiday) => ({
            kind: "holiday" as const,
            id: `holiday-${holiday.id}`,
            date: itemDate(holiday),
            holiday,
          })),
        ]
          // Anything already finished belongs to the archive, not the agenda.
          .filter((item) => {
            const source = item.kind === "event" ? item.event : item.holiday;
            return (source.end_date || source.start_date).slice(0, 10) >= today;
          })
          .sort((a, b) => a.date.localeCompare(b.date));

        setLoaded({ requestKey, items });
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading the calendar."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, year.id]);

  const isStale = loaded?.requestKey !== requestKey;
  const items = loaded?.items ?? [];
  const holidayCount = items.filter((item) => item.kind === "holiday").length;

  return (
    <Panel
      title="Upcoming"
      description="Every event and holiday still ahead this academic year."
      icon={CalendarClock}
      action={
        !isStale && items.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100 tabular-nums">
            <PartyPopper className="size-3.5" />
            {holidayCount} holidays ahead
          </span>
        ) : undefined
      }
    >
      {error ? (
        <SectionError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      ) : isStale ? (
        <RowsSkeleton />
      ) : items.length === 0 ? (
        <SectionEmpty
          icon={CalendarDays}
          title="Nothing scheduled ahead"
          description="Events and holidays added to the school calendar will appear here."
        />
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <AgendaRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
