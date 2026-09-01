"use client";

import * as React from "react";
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  PartyPopper,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  EVENT_TYPE_META,
  HOLIDAY_PILL,
  HOLIDAY_TYPE_LABELS,
  WEEKDAY_LABELS,
  addMonths,
  bucketByDay,
  dateFromISO,
  formatTime,
  gridDays,
  isMultiDay,
  monthLabel,
  monthOf,
  todayISO,
} from "@/components/calendar/calendar-meta";
import { EventDialog } from "@/components/calendar/event-dialog";
import { HolidayDialog } from "@/components/calendar/holiday-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SectionError } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteCalendarEvent,
  deleteHoliday,
  listCalendarEvents,
  listHolidays,
  toCalendarEventType,
  toHolidayType,
  type AcademicYear,
  type CalendarEvent,
  type Holiday,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Loaded = {
  /** The month this data answers — see `requestKey` below. */
  requestKey: string;
  events: CalendarEvent[];
  holidays: Holiday[];
};

function eventPill(event: CalendarEvent): string {
  const type = toCalendarEventType(event.event_type);
  return type ? EVENT_TYPE_META[type].pill : EVENT_TYPE_META.other.pill;
}

/* -------------------------------------------------------------------------- */
/*                                    Grid                                    */
/* -------------------------------------------------------------------------- */

function DayCell({
  day,
  month,
  events,
  holidays,
  isSelected,
  onSelect,
}: {
  day: string;
  month: string;
  events: CalendarEvent[];
  holidays: Holiday[];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isOutside = monthOf(day) !== month;
  const isToday = day === todayISO();
  const isHoliday = holidays.length > 0;
  const isWeekend = [0, 6].includes(dateFromISO(day).getDay());

  const shown = events.slice(0, 2);
  const hidden = events.length - shown.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={formatDate(day)}
      className={cn(
        "flex min-h-24 flex-col gap-1 border-t border-l p-1.5 text-left outline-none transition-colors first:border-l-0 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
        isOutside ? "bg-muted/30" : isWeekend ? "bg-muted/15" : "bg-card",
        isHoliday && "bg-rose-50/60 dark:bg-rose-500/10",
        isSelected && "bg-brand-50/80 dark:bg-brand-500/10",
        !isSelected && "hover:bg-muted/50"
      )}
    >
      <span className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-lg text-xs font-medium tabular-nums",
            isToday && "bg-brand-600 font-semibold text-white",
            !isToday && isOutside && "text-muted-foreground/50",
            !isToday && !isOutside && "text-foreground"
          )}
        >
          {Number(day.slice(8, 10))}
        </span>
        {isHoliday && (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full bg-rose-500"
          />
        )}
      </span>

      <span className="flex min-w-0 flex-col gap-1">
        {holidays.slice(0, 1).map((holiday) => (
          <span
            key={holiday.id}
            className={cn(
              "truncate rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium ring-1",
              HOLIDAY_PILL
            )}
          >
            {holiday.name}
          </span>
        ))}
        {shown.map((event) => (
          <span
            key={event.id}
            className={cn(
              "truncate rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium ring-1",
              eventPill(event)
            )}
          >
            {event.title}
          </span>
        ))}
        {hidden > 0 && (
          <span className="px-1 text-[0.6875rem] font-medium text-muted-foreground">
            +{hidden} more
          </span>
        )}
      </span>
    </button>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-7 border-r border-b">
      {Array.from({ length: 42 }, (_, index) => (
        <div
          key={index}
          className="min-h-24 space-y-1.5 border-t border-l p-1.5 first:border-l-0"
        >
          <Skeleton className="size-6 rounded-lg" />
          {index % 3 === 0 && <Skeleton className="h-4 w-full rounded-md" />}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Day panel                                 */
/* -------------------------------------------------------------------------- */

function EventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const type = toCalendarEventType(event.event_type);
  const meta = type ? EVENT_TYPE_META[type] : EVENT_TYPE_META.other;

  return (
    <li className="group/row rounded-xl border bg-card p-3">
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className={cn("mt-1.5 size-2 shrink-0 rounded-full", meta.dot)}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{event.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 font-medium ring-1",
                meta.pill
              )}
            >
              {meta.label}
            </span>
            {event.is_all_day ? (
              <span>All day</span>
            ) : (
              (event.start_time || event.end_time) && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatTime(event.start_time)}
                  {event.end_time ? ` – ${formatTime(event.end_time)}` : ""}
                </span>
              )
            )}
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {event.location}
              </span>
            )}
          </div>
          {isMultiDay(event) && (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(event.start_date)} – {formatDate(event.end_date)}
            </p>
          )}
          {event.description && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {event.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-lg text-muted-foreground hover:text-foreground"
            aria-label={`Edit ${event.title}`}
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Delete ${event.title}`}
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );
}

function HolidayCard({
  holiday,
  onDelete,
}: {
  holiday: Holiday;
  onDelete: () => void;
}) {
  const type = toHolidayType(holiday.holiday_type);

  return (
    <li className="group/row rounded-xl border bg-card p-3">
      <div className="flex items-start gap-2.5">
        <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-rose-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{holiday.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 font-medium ring-1",
                HOLIDAY_PILL
              )}
            >
              {type ? HOLIDAY_TYPE_LABELS[type] : "Holiday"}
            </span>
            {holiday.is_recurring && <span>Recurring</span>}
          </div>
          {isMultiDay(holiday) && (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(holiday.start_date)} – {formatDate(holiday.end_date)}
            </p>
          )}
          {holiday.description && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {holiday.description}
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 rounded-lg text-muted-foreground opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100"
          aria-label={`Delete ${holiday.name}`}
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Tab                                     */
/* -------------------------------------------------------------------------- */

export function MonthTab({ year }: { year: AcademicYear }) {
  const [month, setMonth] = React.useState(() => monthOf(todayISO()));
  const [selected, setSelected] = React.useState(todayISO);
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [eventDialog, setEventDialog] = React.useState<{
    open: boolean;
    event: CalendarEvent | null;
  }>({ open: false, event: null });
  const [isHolidayOpen, setIsHolidayOpen] = React.useState(false);
  const [deletingEvent, setDeletingEvent] = React.useState<CalendarEvent | null>(
    null
  );
  const [deletingHoliday, setDeletingHoliday] = React.useState<Holiday | null>(
    null
  );

  const days = React.useMemo(() => gridDays(month), [month]);
  const from = days[0];
  const to = days[days.length - 1];

  // Identifies the month the controls ask for. Loading is then simply "what we
  // hold isn't what we asked for" — no loading flag to keep in sync.
  const requestKey = `${year.id}|${from}|${to}`;

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([
      listCalendarEvents({ academic_year_id: year.id, from, to }),
      // Holidays have no range filter, so the year's set is narrowed here.
      listHolidays(year.id),
    ])
      .then(([events, holidays]) => {
        if (cancelled) return;
        setLoaded({ requestKey, events, holidays });
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
  }, [requestKey, year.id, from, to, reloadKey]);

  const isStale = loaded?.requestKey !== requestKey;
  const buckets = React.useMemo(
    () => bucketByDay(days, loaded?.events ?? [], loaded?.holidays ?? []),
    [days, loaded]
  );

  const selectedItems = buckets.get(selected) ?? { events: [], holidays: [] };

  function goToMonth(next: string) {
    setMonth(next);
    // Land on the first of the month so the panel always matches the grid.
    setSelected(`${next}-01`);
  }

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ------------------------------ Grid ------------------------------ */}
        <Card className="gap-0 overflow-hidden py-0 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/25 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-lg"
                className="rounded-xl"
                aria-label="Previous month"
                onClick={() => goToMonth(addMonths(month, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <h3 className="min-w-40 text-center text-sm font-semibold tracking-tight">
                {monthLabel(month)}
              </h3>
              <Button
                variant="outline"
                size="icon-lg"
                className="rounded-xl"
                aria-label="Next month"
                onClick={() => goToMonth(addMonths(month, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="lg"
                className="rounded-xl"
                onClick={() => {
                  setMonth(monthOf(todayISO()));
                  setSelected(todayISO());
                }}
              >
                Today
              </Button>
            </div>
          </div>

          {error ? (
            <SectionError
              message={error}
              onRetry={() => {
                setError(null);
                refresh();
              }}
            />
          ) : (
            <>
              <div className="grid grid-cols-7 border-b bg-muted/25">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="px-1.5 py-2 text-center text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase"
                  >
                    {label}
                  </div>
                ))}
              </div>

              {isStale ? (
                <GridSkeleton />
              ) : (
                <div className="grid grid-cols-7 border-r border-b">
                  {days.map((day) => {
                    const items = buckets.get(day) ?? {
                      events: [],
                      holidays: [],
                    };
                    return (
                      <DayCell
                        key={day}
                        day={day}
                        month={month}
                        events={items.events}
                        holidays={items.holidays}
                        isSelected={day === selected}
                        onSelect={() => setSelected(day)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Legend — the cell pills carry meaning, so name the colours. */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t bg-muted/25 px-4 py-3">
                {Object.entries(EVENT_TYPE_META).map(([key, meta]) => (
                  <span
                    key={key}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <span
                      aria-hidden
                      className={cn("size-2 rounded-full", meta.dot)}
                    />
                    {meta.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* ---------------------------- Day panel ---------------------------- */}
        <Card className="gap-0 py-0 shadow-card xl:h-fit">
          <div className="border-b bg-muted/25 px-4 py-3.5">
            <p className="text-sm font-semibold tracking-tight">
              {formatDate(selected)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isStale
                ? "Loading…"
                : selectedItems.events.length + selectedItems.holidays.length ===
                    0
                  ? "Nothing scheduled"
                  : `${selectedItems.events.length + selectedItems.holidays.length} ${
                      selectedItems.events.length +
                        selectedItems.holidays.length ===
                      1
                        ? "item"
                        : "items"
                    }`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 border-b p-4">
            <Button
              size="lg"
              onClick={() => setEventDialog({ open: true, event: null })}
              className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
            >
              <CalendarPlus className="size-4" />
              Add Event
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsHolidayOpen(true)}
              className="rounded-xl"
            >
              <PartyPopper className="size-4" />
              Add Holiday
            </Button>
          </div>

          <div className="p-4">
            {isStale ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : selectedItems.events.length + selectedItems.holidays.length ===
              0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <CalendarDays className="size-5" />
                </span>
                <p className="mt-3 text-sm font-medium">Nothing on this day</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add an event or holiday to fill it in.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {selectedItems.holidays.map((holiday) => (
                  <HolidayCard
                    key={`holiday-${holiday.id}`}
                    holiday={holiday}
                    onDelete={() => setDeletingHoliday(holiday)}
                  />
                ))}
                {selectedItems.events.map((event) => (
                  <EventCard
                    key={`event-${event.id}`}
                    event={event}
                    onEdit={() => setEventDialog({ open: true, event })}
                    onDelete={() => setDeletingEvent(event)}
                  />
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <EventDialog
        open={eventDialog.open}
        onOpenChange={(open) =>
          setEventDialog((current) => ({ ...current, open }))
        }
        academicYearId={year.id}
        event={eventDialog.event}
        defaultDate={selected}
        onSaved={refresh}
      />

      <HolidayDialog
        open={isHolidayOpen}
        onOpenChange={setIsHolidayOpen}
        academicYearId={year.id}
        defaultDate={selected}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={deletingEvent != null}
        onOpenChange={(next) => {
          if (!next) setDeletingEvent(null);
        }}
        title="Remove this event?"
        description={
          <>
            {deletingEvent?.title ?? "This event"} will be taken off the
            calendar. This cannot be undone.
          </>
        }
        confirmLabel="Remove event"
        pendingLabel="Removing"
        errorTitle="Could not remove the event"
        onConfirm={async () => {
          if (!deletingEvent) return;
          await deleteCalendarEvent(deletingEvent.id);
          toast.success("Event removed");
          setDeletingEvent(null);
          refresh();
        }}
      />

      <ConfirmDialog
        open={deletingHoliday != null}
        onOpenChange={(next) => {
          if (!next) setDeletingHoliday(null);
        }}
        title="Remove this holiday?"
        description={
          <>
            {deletingHoliday?.name ?? "This holiday"} will be taken off the
            calendar and the school will count as open on those days.
          </>
        }
        confirmLabel="Remove holiday"
        pendingLabel="Removing"
        errorTitle="Could not remove the holiday"
        onConfirm={async () => {
          if (!deletingHoliday) return;
          await deleteHoliday(deletingHoliday.id);
          toast.success("Holiday removed");
          setDeletingHoliday(null);
          refresh();
        }}
      />
    </>
  );
}
