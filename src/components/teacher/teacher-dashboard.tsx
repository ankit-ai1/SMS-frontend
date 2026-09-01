"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarCheck,
  CalendarClock,
  Clock,
  Library,
  RefreshCw,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { LeaveStatusBadge } from "@/components/teacher/leave-status-badge";
import { leaveDayCount } from "@/components/teacher/leave-meta";
import { SectionEmpty } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTeacherDashboard,
  teacherSectionCount,
  type LeaveRequest,
  type TeacherDashboard,
  type TimetableSlot,
} from "@/lib/api";
import { formatDate, formatNumber, relativeDay } from "@/lib/format";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: TeacherDashboard }
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
  href: string;
  /** Tailwind classes for the card — keeps each metric visually distinct. */
  tone: string;
};

function buildStats(data: TeacherDashboard): Stat[] {
  const sections = teacherSectionCount(data);
  const timetable = data.todays_timetable ?? [];
  const pending = data.pending_leave_requests ?? [];

  return [
    {
      key: "sections",
      label: "My Sections",
      value: sections !== null ? formatNumber(sections) : "—",
      helper: "Assigned to you",
      icon: Library,
      href: "/teacher/classes",
      tone: "bg-sky-200/80 text-sky-950 ring-sky-200",
    },
    {
      key: "today",
      label: "Today's Classes",
      value: formatNumber(timetable.length),
      helper: timetable.length === 0 ? "Nothing scheduled" : "On your board",
      icon: CalendarClock,
      href: "/teacher/attendance",
      tone: "bg-amber-200/90 text-amber-950 ring-amber-200",
    },
    {
      key: "leave",
      label: "Pending Leave",
      value: formatNumber(pending.length),
      helper: pending.length === 0 ? "Nothing awaiting" : "Awaiting a decision",
      icon: CalendarCheck,
      href: "/teacher/leave",
      tone: "bg-violet-200/75 text-violet-950 ring-violet-200",
    },
  ];
}

function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;

  return (
    <Card
      className={`group min-h-36 border-0 p-0 shadow-card ring-1 transition-all hover:-translate-y-0.5 hover:shadow-lift ${stat.tone}`}
    >
      <CardContent className="h-full p-0">
        <Link
          href={stat.href}
          className="flex h-full flex-col justify-between rounded-xl p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold">{stat.label}</p>
              <p className="mt-1 text-xs font-semibold opacity-65">
                {stat.helper}
              </p>
            </div>
            <ArrowUpRight className="size-4 opacity-45 transition-opacity group-hover:opacity-90" />
          </div>
          <div className="flex items-end justify-between gap-3">
            <p className="text-3xl font-black tabular-nums sm:text-4xl">
              {stat.value}
            </p>
            <span className="flex size-10 items-center justify-center rounded-2xl bg-white/45">
              <Icon className="size-5" />
            </span>
          </div>
        </Link>
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
        <Skeleton className="mt-10 h-9 w-24 rounded-md" />
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Rows                                    */
/* -------------------------------------------------------------------------- */

function SlotRow({ slot }: { slot: TimetableSlot }) {
  const subject = slot.subject?.trim() || "Class";
  const where =
    [slot.class_name?.trim(), slot.section_name?.trim()]
      .filter(Boolean)
      .join(" — ") || `Section ${slot.section_id}`;

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      {/* The period reads as a time chip down the left edge. */}
      <span className="flex min-w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-50 px-2.5 py-2 text-brand-700 shadow-soft ring-1 ring-brand-100">
        <Clock className="size-3.5 opacity-70" />
        <span className="mt-0.5 text-xs leading-none font-bold tabular-nums">
          {slot.slot?.trim() || "—"}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{subject}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{where}</p>
      </div>

      <Button variant="outline" size="sm" asChild className="rounded-lg">
        <Link href="/teacher/attendance">Mark attendance</Link>
      </Button>
    </li>
  );
}

function LeaveRow({ leave }: { leave: LeaveRequest }) {
  const days = leaveDayCount(leave.start_date, leave.end_date);

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <CalendarCheck className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {leave.leave_type_name?.trim() || "Leave request"}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatDate(leave.start_date)} – {formatDate(leave.end_date)}
          {days !== null && ` · ${days} ${days === 1 ? "day" : "days"}`}
          {` · ${relativeDay(leave.start_date)}`}
        </p>
      </div>

      <LeaveStatusBadge status={leave.status} />
    </li>
  );
}

function RowsSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 3 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="size-10 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-[60%] rounded-md" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
          <Skeleton className="h-6 w-20 rounded-lg" />
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function TeacherDashboardView() {
  const [state, setState] = React.useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    getTeacherDashboard()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            cause instanceof Error
              ? cause.message
              : "Something went wrong while loading your dashboard.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const data = state.status === "ready" ? state.data : null;
  const timetable = data?.todays_timetable ?? [];
  const pending = data?.pending_leave_requests ?? [];
  const today = new Date().toISOString().slice(0, 10);

  if (state.status === "error") {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" />
          </span>
          <p className="mt-4 text-sm font-medium">
            We couldn&rsquo;t load your dashboard
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {state.message}
          </p>
          <Button
            size="lg"
            onClick={() => {
              setState({ status: "loading" });
              setReloadKey((key) => key + 1);
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

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-brand-600 uppercase">
            <Library className="size-4" />
            Teaching desk
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
            Your day at a glance
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Today&rsquo;s classes, the sections you hold, and where your leave
            stands.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
          <CalendarClock className="size-3.5" />
          {formatDate(today)}
        </span>
      </div>

      {/* ------------------------------- Stats ------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data
          ? buildStats(data).map((stat) => (
              <StatCard key={stat.key} stat={stat} />
            ))
          : Array.from({ length: 3 }, (_, index) => (
              <StatCardSkeleton key={index} />
            ))}
      </div>

      {/* ------------------------------ Panels ------------------------------ */}
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Today's classes"
          description="Every period on your board for today, in order."
          icon={CalendarClock}
          action={
            <Button variant="outline" size="lg" asChild className="rounded-xl">
              <Link href="/teacher/classes">My Classes</Link>
            </Button>
          }
        >
          {!data ? (
            <RowsSkeleton />
          ) : timetable.length === 0 ? (
            <SectionEmpty
              icon={CalendarClock}
              title="No classes scheduled today"
              description="When your timetable has periods for today, they show up here ready to mark."
            />
          ) : (
            <ul className="divide-y">
              {timetable.map((slot) => (
                <SlotRow key={slot.id} slot={slot} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Pending leave"
          description="Requests you have raised that are still awaiting a decision."
          icon={CalendarCheck}
          action={
            <Button variant="outline" size="lg" asChild className="rounded-xl">
              <Link href="/teacher/leave">My Leave</Link>
            </Button>
          }
        >
          {!data ? (
            <RowsSkeleton />
          ) : pending.length === 0 ? (
            <SectionEmpty
              icon={CalendarCheck}
              title="Nothing awaiting approval"
              description="Leave you apply for shows here until it is approved or rejected."
            />
          ) : (
            <ul className="divide-y">
              {pending.map((leave) => (
                <LeaveRow key={leave.id} leave={leave} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
