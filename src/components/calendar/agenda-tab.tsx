"use client";

import * as React from "react";
import { CalendarClock, Clock, MapPin } from "lucide-react";

import {
  EVENT_TYPE_META,
  HOLIDAY_PILL,
  HOLIDAY_TYPE_LABELS,
  addDaysISO,
  dateFromISO,
  formatTime,
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
import { formatDate, relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";

/** How far ahead the agenda looks. */
const HORIZON_DAYS = 120;

type AgendaItem =
  | { kind: "event"; date: string; event: CalendarEvent }
  | { kind: "holiday"; date: string; holiday: Holiday };

function buildAgenda(
  events: CalendarEvent[],
  holidays: Holiday[],
  from: string,
  to: string
): AgendaItem[] {
  const items: AgendaItem[] = [];

  for (const event of events) {
    // Anchored to the start, or to today for something already running.
    const start = event.start_date.slice(0, 10);
    const end = (event.end_date || event.start_date).slice(0, 10);
    if (end < from || start > to) continue;
    items.push({ kind: "event", date: start < from ? from : start, event });
  }

  for (const holiday of holidays) {
    const start = holiday.start_date.slice(0, 10);
    const end = (holiday.end_date || holiday.start_date).slice(0, 10);
    if (end < from || start > to) continue;
    items.push({ kind: "holiday", date: start < from ? from : start, holiday });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

function DateTile({ date }: { date: string }) {
  const parsed = dateFromISO(date);

  return (
    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
      <span className="text-[0.5625rem] font-medium tracking-wide uppercase">
        {new Intl.DateTimeFormat("en-GB", { month: "short" }).format(parsed)}
      </span>
      <span className="text-base leading-none font-semibold tabular-nums">
        {String(parsed.getDate()).padStart(2, "0")}
      </span>
    </div>
  );
}

function AgendaRow({ item }: { item: AgendaItem }) {
  const isHoliday = item.kind === "holiday";
  const type = isHoliday
    ? null
    : toCalendarEventType(item.event.event_type) ?? "other";
  const meta = type ? EVENT_TYPE_META[type] : null;

  const title = isHoliday ? item.holiday.name : item.event.title;
  const source = isHoliday ? item.holiday : item.event;
  const relative = relativeDay(item.date);

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <DateTile date={item.date} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 font-medium ring-1",
              isHoliday ? HOLIDAY_PILL : meta?.pill
            )}
          >
            {isHoliday
              ? (HOLIDAY_TYPE_LABELS[
                  toHolidayType(item.holiday.holiday_type) ?? "school"
                ] ?? "Holiday")
              : meta?.label}
          </span>

          <span>
            {isMultiDay(source)
              ? `${formatDate(source.start_date)} – ${formatDate(source.end_date)}`
              : formatDate(source.start_date)}
          </span>

          {!isHoliday && !item.event.is_all_day && item.event.start_time && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatTime(item.event.start_time)}
              {item.event.end_time
                ? ` – ${formatTime(item.event.end_time)}`
                : ""}
            </span>
          )}

          {!isHoliday && item.event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {item.event.location}
            </span>
          )}
        </div>
      </div>

      {relative && (
        <span className="hidden shrink-0 text-xs font-medium text-muted-foreground sm:block">
          {relative}
        </span>
      )}
    </li>
  );
}

export function AgendaTab({ year }: { year: AcademicYear }) {
  const [items, setItems] = React.useState<AgendaItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const from = todayISO();
  const to = addDaysISO(from, HORIZON_DAYS);

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([
      listCalendarEvents({ academic_year_id: year.id, from, to }),
      listHolidays(year.id),
    ])
      .then(([events, holidays]) => {
        if (cancelled) return;
        setItems(buildAgenda(events, holidays, from, to));
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading the agenda."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [year.id, from, to, reloadKey]);

  return (
    <Panel
      title="Upcoming"
      description={`Events and holidays over the next ${HORIZON_DAYS} days.`}
      icon={CalendarClock}
    >
      {error ? (
        <SectionError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      ) : items === null ? (
        <ul className="divide-y">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="size-12 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48 max-w-full rounded-md" />
                <Skeleton className="h-3 w-40 max-w-full rounded-md" />
              </div>
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <SectionEmpty
          icon={CalendarClock}
          title="Nothing coming up"
          description="Events and holidays added to the calendar will appear here in date order."
        />
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <AgendaRow
              key={`${item.kind}-${
                item.kind === "event" ? item.event.id : item.holiday.id
              }`}
              item={item}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}
