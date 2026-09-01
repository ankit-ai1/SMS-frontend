"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CalendarX2,
  GraduationCap,
  IndianRupee,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Send,
  TriangleAlert,
  UserPlus,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminDashboard, type AdminDashboard } from "@/lib/api";
import {
  dateParts,
  formatCurrency,
  formatDate,
  formatNumber,
  humanizeToken,
  relativeDay,
} from "@/lib/format";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: AdminDashboard }
  | { status: "error"; message: string };

/* -------------------------------------------------------------------------- */
/*                                 Stat cards                                 */
/* -------------------------------------------------------------------------- */

type Stat = {
  key: string;
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon chip — keeps each metric visually distinct. */
  tone: string;
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_ROWS = ["09:00", "10:00", "11:00", "12:00"];
type CalendarMode = "week" | "month";

function buildStats(data: AdminDashboard): Stat[] {
  return [
    {
      key: "students",
      label: "Students",
      value: formatNumber(data.students_total),
      helper: "Active roll",
      icon: GraduationCap,
      tone: "bg-pink-200/80 text-pink-950 ring-pink-200",
    },
    {
      key: "staff",
      label: "Staff",
      value: formatNumber(data.staff_total),
      helper: "Team members",
      icon: UsersRound,
      tone: "bg-amber-200/90 text-amber-950 ring-amber-200",
    },
    {
      key: "collected",
      label: "Collected",
      value: formatCurrency(data.fees_collected_this_month),
      helper: "This month",
      icon: Wallet,
      tone: "bg-sky-200/80 text-sky-950 ring-sky-200",
    },
    {
      key: "pending",
      label: "Pending",
      value: formatCurrency(data.fees_pending),
      helper: "Fees due",
      icon: IndianRupee,
      tone: "bg-violet-200/75 text-violet-950 ring-violet-200",
    },
  ];
}

function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;

  return (
    <Card className={`min-h-36 border-0 p-0 shadow-card ring-1 ${stat.tone}`}>
      <CardContent className="flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">{stat.label}</p>
            <p className="mt-1 text-xs font-semibold opacity-65">{stat.helper}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full bg-white/55 text-current hover:bg-white/75"
            aria-label={`${stat.label} options`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl font-black tabular-nums sm:text-4xl">
            {stat.value}
          </p>
          <span className="flex size-10 items-center justify-center rounded-2xl bg-white/45">
            <Icon className="size-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="min-h-36 border-0 shadow-card">
      <CardContent className="p-4">
        <div className="flex justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
          <Skeleton className="size-8 rounded-full" />
        </div>
        <Skeleton className="mt-10 h-9 w-32 rounded-md" />
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Upcoming events                               */
/* -------------------------------------------------------------------------- */

function EventRow({ event }: { event: AdminDashboard["upcoming_events"][number] }) {
  const parts = dateParts(event.start_date);
  const relative = relativeDay(event.start_date);

  return (
    <li className="flex items-center gap-4 rounded-2xl px-3 py-3 transition-all hover:-translate-y-0.5 hover:bg-card hover:shadow-soft">
      {/* Calendar tile — scannable at a glance down the left edge. */}
      <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-50 text-brand-700 shadow-soft ring-1 ring-brand-100">
        <span className="text-[0.625rem] font-bold tracking-wide uppercase">
          {parts?.month ?? "—"}
        </span>
        <span className="text-lg leading-none font-black tabular-nums">
          {parts?.day ?? "--"}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{event.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {event.event_type && (
            <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-bold text-cyan-700 ring-1 ring-cyan-100">
              {humanizeToken(event.event_type)}
            </span>
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {formatDate(event.start_date)}
          </span>
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

function EventsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <CalendarX2 className="size-6" />
      </span>
      <p className="mt-4 text-sm font-medium">No upcoming events</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Events added to the school calendar will show up here.
      </p>
    </div>
  );
}

function EventRowSkeleton() {
  return (
    <li className="flex items-center gap-4 px-3 py-3">
      <Skeleton className="size-12 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-48 max-w-full rounded-md" />
        <Skeleton className="h-3 w-32 rounded-md" />
      </div>
    </li>
  );
}

function EventPill({
  event,
  index,
}: {
  event: AdminDashboard["upcoming_events"][number];
  index: number;
}) {
  const tones = [
    "bg-violet-100 text-violet-800 ring-violet-200",
    "bg-amber-100 text-amber-800 ring-amber-200",
    "bg-sky-100 text-sky-800 ring-sky-200",
    "bg-pink-100 text-pink-800 ring-pink-200",
  ];

  return (
    <span
      className={`block truncate rounded-md px-2 py-1 text-[0.7rem] font-bold ring-1 ${tones[index % tones.length]}`}
      title={event.title}
    >
      {event.title}
    </span>
  );
}

function ScheduleBoard({
  events,
  isLoading,
}: {
  events: AdminDashboard["upcoming_events"];
  isLoading: boolean;
}) {
  const [mode, setMode] = React.useState<CalendarMode>("week");
  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(events[0]?.start_date ? new Date(events[0].start_date) : new Date());

  const eventsByDay = new Map<number, AdminDashboard["upcoming_events"]>();
  for (const event of events.slice(0, 8)) {
    const day = new Date(event.start_date).getDay();
    const mondayIndex = day === 0 ? 6 : day - 1;
    const dayEvents = eventsByDay.get(mondayIndex) ?? [];
    dayEvents.push(event);
    eventsByDay.set(mondayIndex, dayEvents);
  }

  const monthBase = events[0]?.start_date
    ? new Date(events[0].start_date)
    : new Date();
  const monthStart = new Date(monthBase.getFullYear(), monthBase.getMonth(), 1);
  const monthEnd = new Date(monthBase.getFullYear(), monthBase.getMonth() + 1, 0);
  const leadingBlanks = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1;
  const monthCells = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: monthEnd.getDate() }, (_, index) => index + 1),
  ];
  const eventsByDate = new Map<number, AdminDashboard["upcoming_events"]>();
  for (const event of events) {
    const date = new Date(event.start_date);
    if (
      date.getMonth() !== monthBase.getMonth() ||
      date.getFullYear() !== monthBase.getFullYear()
    ) {
      continue;
    }
    const dateEvents = eventsByDate.get(date.getDate()) ?? [];
    dateEvents.push(event);
    eventsByDate.set(date.getDate(), dateEvents);
  }

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card/60 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <CalendarDays className="size-5" />
          </span>
          <div>
            <h3 className="text-base font-black">Calendar</h3>
            <p className="text-xs font-semibold text-muted-foreground">
              {monthLabel}
            </p>
          </div>
        </div>
        <div className="flex rounded-full bg-muted p-1 text-xs font-bold text-muted-foreground">
          <button
            type="button"
            onClick={() => setMode("week")}
            className={`rounded-full px-3 py-1 transition-colors ${
              mode === "week"
                ? "bg-card text-foreground shadow-soft"
                : "hover:text-foreground"
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setMode("month")}
            className={`rounded-full px-3 py-1 transition-colors ${
              mode === "month"
                ? "bg-card text-foreground shadow-soft"
                : "hover:text-foreground"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        {mode === "week" ? (
        <div className="min-w-[42rem] rounded-2xl border bg-white/55">
          <div className="grid grid-cols-[4.5rem_repeat(7,1fr)] border-b text-xs font-black text-muted-foreground">
            <div className="px-3 py-3">Time</div>
            {WEEK_DAYS.map((day) => (
              <div key={day} className="border-l px-3 py-3 text-center">
                {day}
              </div>
            ))}
          </div>

          {TIME_ROWS.map((time, rowIndex) => (
            <div
              key={time}
              className="grid min-h-16 grid-cols-[4.5rem_repeat(7,1fr)] border-b last:border-b-0"
            >
              <div className="px-3 py-3 text-xs font-bold text-muted-foreground">
                {time}
              </div>
              {WEEK_DAYS.map((day, dayIndex) => {
                const dayEvents = eventsByDay.get(dayIndex) ?? [];
                const event =
                  dayEvents.length > 0
                    ? dayEvents[rowIndex % dayEvents.length]
                    : undefined;

                return (
                  <div key={day} className="border-l p-2">
                    {isLoading ? (
                      rowIndex === 0 && dayIndex < 3 ? (
                        <Skeleton className="h-6 rounded-md" />
                      ) : null
                    ) : event ? (
                      <EventPill event={event} index={dayIndex + rowIndex} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        ) : (
          <div className="min-w-[42rem] rounded-2xl border bg-white/55">
            <div className="grid grid-cols-7 border-b text-xs font-black text-muted-foreground">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="border-l first:border-l-0 px-3 py-3 text-center">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthCells.map((day, index) => {
                const dateEvents = day ? eventsByDate.get(day) ?? [] : [];
                return (
                  <div
                    key={`${day ?? "blank"}-${index}`}
                    className="min-h-28 border-l border-t first:border-l-0 p-2"
                  >
                    {day && (
                      <>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-black text-muted-foreground">
                            {day}
                          </span>
                          {dateEvents.length > 0 && (
                            <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[0.65rem] font-black text-brand-700">
                              {dateEvents.length}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {isLoading ? (
                            index < 3 ? (
                              <Skeleton className="h-6 rounded-md" />
                            ) : null
                          ) : (
                            dateEvents
                              .slice(0, 2)
                              .map((event, eventIndex) => (
                                <EventPill
                                  key={event.id}
                                  event={event}
                                  index={index + eventIndex}
                                />
                              ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function QuickActions() {
  return (
    <Card className="gap-3 py-3">
      <CardContent className="grid gap-3 px-3">
        <Button
          asChild
          variant="ghost"
          className="h-12 justify-between rounded-2xl bg-pink-300 text-pink-950 shadow-none hover:bg-pink-300/90 hover:text-pink-950"
        >
          <Link href="/students">
            <span className="flex items-center gap-2">
              <GraduationCap className="size-4" />
              Add Student
            </span>
            <Plus className="size-5" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-12 justify-between rounded-2xl"
        >
          <Link href="/staff">
            <span className="flex items-center gap-2">
              <UserPlus className="size-4" />
              Add Employee
            </span>
            <Plus className="size-5" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-12 justify-between rounded-2xl"
        >
          <Link href="/calendar">
            <span className="flex items-center gap-2">
              <Send className="size-4" />
              Send Invite
            </span>
            <ArrowUpRight className="size-5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ActivityPanel({
  events,
  isLoading,
}: {
  events: AdminDashboard["upcoming_events"];
  isLoading: boolean;
}) {
  return (
    <Card className="gap-0 py-0">
      <div className="border-b px-4 py-4">
        <h3 className="text-base font-black">Recent Activity</h3>
      </div>
      <CardContent className="p-3">
        {isLoading ? (
          <ul className="space-y-1">
            {Array.from({ length: 5 }, (_, index) => (
              <EventRowSkeleton key={index} />
            ))}
          </ul>
        ) : events.length === 0 ? (
          <EventsEmptyState />
        ) : (
          <ul className="space-y-1">
            {events.slice(0, 6).map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownRow({
  color,
  label,
  value,
  percent,
}: {
  color: string;
  label: string;
  value: string;
  percent: number;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`size-4 rounded-md ${color}`} />
      <span className="flex-1 font-bold">{label}</span>
      <span className="font-semibold text-muted-foreground">{value}</span>
      <span className="w-10 text-right font-black text-emerald-600">
        {percent}%
      </span>
    </div>
  );
}

function FeeBreakdown({ data }: { data?: AdminDashboard }) {
  const collected = data?.fees_collected_this_month ?? 0;
  const pending = data?.fees_pending ?? 0;
  const total = collected + pending;
  const collectedPercent = total > 0 ? Math.round((collected / total) * 100) : 0;
  const pendingPercent = total > 0 ? 100 - collectedPercent : 0;

  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-4">
        <h3 className="text-base font-black">Fee Breakdown</h3>
        <span className="text-xs font-bold text-muted-foreground">This month</span>
      </div>
      <CardContent className="p-5">
        <div
          className="mx-auto grid size-44 place-items-center rounded-full bg-[conic-gradient(#f9a8d4_0_var(--collected),#fde68a_var(--collected)_100%)] p-5"
          style={
            {
              "--collected": `${collectedPercent}%`,
            } as React.CSSProperties
          }
        >
          <div className="grid size-30 place-items-center rounded-full bg-card text-center shadow-soft">
            <div>
              <p className="text-3xl font-black tabular-nums">
                {collectedPercent}%
              </p>
              <p className="text-xs font-bold text-muted-foreground">
                collected
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <BreakdownRow
            color="bg-pink-300"
            label="Collected"
            value={formatCurrency(collected)}
            percent={collectedPercent}
          />
          <BreakdownRow
            color="bg-amber-300"
            label="Pending"
            value={formatCurrency(pending)}
            percent={pendingPercent}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
  const [state, setState] = React.useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = React.useState(0);

  // The initial state is already "loading"; retry resets it before bumping the
  // key, so the effect never has to set it synchronously.
  function handleRetry() {
    setState({ status: "loading" });
    setReloadKey((k) => k + 1);
  }

  React.useEffect(() => {
    let cancelled = false;

    getAdminDashboard()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Something went wrong while loading the dashboard.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const isLoading = state.status === "loading";
  const data = state.status === "ready" ? state.data : undefined;
  const events = data?.upcoming_events ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black sm:text-3xl">Dashboard</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            A clean snapshot of admissions, fees and school activity.
          </p>
        </div>
        <Button
          variant="outline"
          size="lg"
          className="rounded-2xl"
          onClick={handleRetry}
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      {state.status === "error" ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" />
            </span>
            <p className="mt-4 text-sm font-bold">
              We couldn&rsquo;t load your dashboard
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {state.message}
            </p>
            <Button
              size="lg"
              onClick={handleRetry}
              className="mt-5 rounded-2xl"
            >
              <RefreshCw className="size-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18.5rem]">
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {isLoading
                ? Array.from({ length: 4 }, (_, i) => (
                    <StatCardSkeleton key={i} />
                  ))
                : buildStats(data as AdminDashboard).map((stat) => (
                    <StatCard key={stat.key} stat={stat} />
                  ))}
            </section>

            <ScheduleBoard events={events} isLoading={isLoading} />
          </div>

          <aside className="space-y-4">
            <QuickActions />
            <ActivityPanel events={events} isLoading={isLoading} />
            <FeeBreakdown data={data} />
          </aside>
        </div>
      )}
    </div>
  );
}
