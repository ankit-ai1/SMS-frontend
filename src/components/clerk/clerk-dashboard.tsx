"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  Layers,
  Library,
  Plus,
  RefreshCw,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { useClerkScope, yearLabel } from "@/components/clerk/use-clerk-scope";
import { SectionEmpty } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listCalendarEvents,
  listStudents,
  toCalendarEventType,
  type CalendarEvent,
} from "@/lib/api";
import { dateParts, formatDate, formatNumber, relativeDay } from "@/lib/format";
import { EVENT_TYPE_META, todayISO } from "@/components/calendar/calendar-meta";
import { cn } from "@/lib/utils";

/**
 * The office board. Every figure here comes from a list the clerk already has
 * access to — the roll count is the students endpoint's own `meta.total`, and
 * the classes and sections come from the scope — so there is no dashboard
 * endpoint behind this screen to wait on.
 */

type Stat = {
  key: string;
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
  href?: string;
};

function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;

  const card = (
    <Card
      className={cn(
        "group min-h-36 border-0 p-0 shadow-card ring-1 transition-all",
        stat.href && "hover:-translate-y-0.5 hover:shadow-lift",
        stat.tone
      )}
    >
      <CardContent className="flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">{stat.label}</p>
            <p className="mt-1 text-xs font-semibold opacity-65">
              {stat.helper}
            </p>
          </div>
          {stat.href && (
            <ArrowUpRight className="size-4 opacity-45 transition-opacity group-hover:opacity-90" />
          )}
        </div>
        <div className="mt-8 flex items-end justify-between gap-3">
          <p className="min-w-0 truncate text-3xl font-black tabular-nums sm:text-4xl">
            {stat.value}
          </p>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/45">
            <Icon className="size-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return stat.href ? (
    <Link
      href={stat.href}
      className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      {card}
    </Link>
  ) : (
    card
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
          <Skeleton className="size-9 rounded-2xl" />
        </div>
        <Skeleton className="mt-10 h-9 w-28 rounded-md" />
      </CardContent>
    </Card>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const parts = dateParts(event.start_date);
  const meta = EVENT_TYPE_META[toCalendarEventType(event.event_type) ?? "other"];

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        <span className="text-[0.5625rem] font-medium tracking-wide uppercase">
          {parts?.month ?? "—"}
        </span>
        <span className="text-base leading-none font-semibold tabular-nums">
          {parts?.day ?? "--"}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{event.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn("rounded-md px-1.5 py-0.5 font-medium ring-1", meta.pill)}
          >
            {meta.label}
          </span>
          <span>{formatDate(event.start_date)}</span>
        </p>
      </div>

      <span className="hidden shrink-0 text-xs font-medium text-muted-foreground sm:block">
        {relativeDay(event.start_date)}
      </span>
    </li>
  );
}

function RowsSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-[55%] rounded-md" />
            <Skeleton className="h-3 w-56 max-w-[75%] rounded-md" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function ClerkDashboardView() {
  const { scope, error, reload } = useClerkScope();

  const [rollTotal, setRollTotal] = React.useState<number | null>(null);
  const [events, setEvents] = React.useState<CalendarEvent[] | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  // The roll count rides on the list endpoint's own meta — one row is enough,
  // the total is what matters.
  React.useEffect(() => {
    let cancelled = false;

    listStudents({ page: 1, per_page: 1 })
      .then((loaded) => {
        if (!cancelled) setRollTotal(loaded.meta.total);
      })
      .catch(() => {
        if (!cancelled) setRollTotal(null);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const yearId = scope?.year?.id;

  React.useEffect(() => {
    if (yearId == null) return;
    let cancelled = false;

    listCalendarEvents({ academic_year_id: yearId })
      .then((loaded) => {
        if (cancelled) return;
        const today = todayISO();
        setEvents(
          loaded
            .filter(
              (event) =>
                (event.end_date || event.start_date).slice(0, 10) >= today
            )
            .sort((a, b) => a.start_date.localeCompare(b.start_date))
        );
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });

    return () => {
      cancelled = true;
    };
  }, [yearId, reloadKey]);

  if (error) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" />
          </span>
          <p className="mt-4 text-sm font-medium">
            We couldn&rsquo;t load your dashboard
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
          <Button
            size="lg"
            onClick={() => {
              setReloadKey((key) => key + 1);
              reload();
            }}
            className="mt-5 rounded-xl shadow-brand transition-all hover:bg-brand-700 hover:shadow-lift"
          >
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stats: Stat[] | null =
    scope && rollTotal !== null
      ? [
          {
            key: "students",
            label: "Students",
            value: formatNumber(rollTotal),
            helper: "On the roll",
            icon: GraduationCap,
            href: "/clerk/students",
            tone: "bg-pink-200/80 text-pink-950 ring-pink-200",
          },
          {
            key: "classes",
            label: "Classes",
            value: formatNumber(scope.classes.length),
            helper: "Set up this year",
            icon: Library,
            tone: "bg-amber-200/90 text-amber-950 ring-amber-200",
          },
          {
            key: "sections",
            label: "Sections",
            value: formatNumber(scope.sections.length),
            helper: "Registers to mark",
            icon: Layers,
            href: "/clerk/attendance",
            tone: "bg-sky-200/80 text-sky-950 ring-sky-200",
          },
        ]
      : null;

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-brand-600 uppercase">
            <ClipboardCheck className="size-4" />
            Front office
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
            The register, at a glance
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Roll strength, the classes it is spread across, and what is coming
            up on the calendar.
          </p>
        </div>

        {yearLabel(scope?.year) && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
            <CalendarClock className="size-3.5" />
            {yearLabel(scope?.year)}
          </span>
        )}
      </div>

      {/* ------------------------------- Stats ------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats
          ? stats.map((stat) => <StatCard key={stat.key} stat={stat} />)
          : Array.from({ length: 3 }, (_, index) => (
              <StatCardSkeleton key={index} />
            ))}
      </div>

      {/* ------------------------------ Panels ------------------------------ */}
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Upcoming events"
          description="The next dates on the school calendar."
          icon={CalendarClock}
          action={
            <Button variant="outline" size="lg" asChild className="rounded-xl">
              <Link href="/clerk/calendar">Calendar</Link>
            </Button>
          }
        >
          {!scope ? (
            <RowsSkeleton />
          ) : !scope.year ? (
            <SectionEmpty
              icon={CalendarDays}
              title="No academic year set up"
              description="The calendar is kept per year. Ask the office to set one as current."
            />
          ) : !events ? (
            <RowsSkeleton />
          ) : events.length === 0 ? (
            <SectionEmpty
              icon={CalendarDays}
              title="No upcoming events"
              description="Events added to the school calendar will show up here."
            />
          ) : (
            <ul className="divide-y">
              {events.slice(0, 6).map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Quick actions"
          description="The two things this desk does most."
          icon={ClipboardCheck}
        >
          <div className="grid gap-3 p-4">
            <Button
              asChild
              variant="outline"
              className="h-14 justify-between rounded-2xl px-4"
            >
              <Link href="/clerk/students">
                <span className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <GraduationCap className="size-4" />
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-bold">
                      Admit a student
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Record, guardians, papers
                    </span>
                  </span>
                </span>
                <Plus className="size-5 text-muted-foreground" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-14 justify-between rounded-2xl px-4"
            >
              <Link href="/clerk/attendance">
                <span className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <ClipboardCheck className="size-4" />
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-bold">
                      Mark the register
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Any section, any day
                    </span>
                  </span>
                </span>
                <ArrowUpRight className="size-5 text-muted-foreground" />
              </Link>
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
