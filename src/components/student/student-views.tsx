"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileBadge,
  GraduationCap,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { EVENT_TYPE_META } from "@/components/calendar/calendar-meta";
import { percentTone, toMarks } from "@/components/exams/exam-meta";
import { PAYMENT_MODE_LABELS, toAmount } from "@/components/fees/fee-meta";
import {
  classLabel,
  studentName,
  useStudentPortal,
} from "@/components/student/student-context";
import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCurrentAcademicYear,
  getStudentAttendance,
  isForbiddenError,
  listCalendarEvents,
  listReportCards,
  listStudentPayments,
  toCalendarEventType,
  type CalendarEvent,
  type Payment,
  type ReportCard,
  type StudentAttendance,
  type StudentAttendanceEntry,
  type StudentSelf,
} from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  humanizeToken,
  relativeDay,
} from "@/lib/format";
import { cn } from "@/lib/utils";

function messageFor(cause: unknown, fallback: string): string {
  if (isForbiddenError(cause)) {
    return "This record is outside your student account access. Please contact the school office.";
  }
  return cause instanceof Error ? cause.message : fallback;
}

/** Backends send either a 0–1 fraction or a whole percentage. Read both. */
function percent(value: number | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed <= 1 ? Math.round(parsed * 100) : Math.round(parsed);
}

/* -------------------------------------------------------------------------- */
/*                                    Cards                                   */
/* -------------------------------------------------------------------------- */

function StatusCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
  href?: string;
}) {
  const body = (
    <Card
      className={cn(
        "group min-h-34 border-0 p-0 shadow-card ring-1 transition-all hover:-translate-y-0.5 hover:shadow-lift",
        tone
      )}
    >
      <CardContent className="flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">{label}</p>
            <p className="mt-1 text-xs font-semibold opacity-65">{helper}</p>
          </div>
          {href && (
            <ArrowUpRight className="size-4 opacity-45 group-hover:opacity-90" />
          )}
        </div>
        <div className="mt-8 flex items-end justify-between gap-3">
          <p className="min-w-0 truncate text-3xl font-black tabular-nums sm:text-4xl">
            {value}
          </p>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/45">
            <Icon className="size-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link
      href={href}
      className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      {body}
    </Link>
  ) : (
    body
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="min-h-34 shadow-card">
          <CardContent className="p-4">
            <div className="flex justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
              <Skeleton className="size-9 rounded-2xl" />
            </div>
            <Skeleton className="mt-9 h-9 w-28 rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RowsSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="size-9 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-3 w-56 max-w-full rounded-md" />
          </div>
          <Skeleton className="h-6 w-20 rounded-lg" />
        </li>
      ))}
    </ul>
  );
}

/** Narrows the portal state to a resolved student, or null while it isn't. */
function useResolvedStudent(): StudentSelf | null {
  const state = useStudentPortal();
  return state.status === "ready" ? state.student : null;
}

/* -------------------------------------------------------------------------- */
/*                                  Dashboard                                 */
/* -------------------------------------------------------------------------- */

export function StudentDashboardView() {
  const state = useStudentPortal();

  if (state.status !== "ready") return <LoadingCards />;
  const student = state.student;
  if (!student) return null;

  const attendance = percent(student.attendance_pct);
  const feesDue = toAmount(student.fees_due);
  const unread = Number(state.dashboard.unread_notifications ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-brand-600 uppercase">
          <GraduationCap className="size-4" />
          Student portal
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
          Your year at a glance
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Attendance, fee status, class placement, and school notices in one
          calm view.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          label="Attendance"
          value={attendance !== null ? `${attendance}%` : "No data"}
          helper="Present summary"
          icon={ClipboardCheck}
          href="/student/attendance"
          tone="bg-emerald-200/85 text-emerald-950 ring-emerald-200"
        />
        <StatusCard
          label="Fees Due"
          value={formatCurrency(feesDue)}
          helper={feesDue > 0 ? "Outstanding" : "All clear"}
          icon={Wallet}
          href="/student/fees"
          tone="bg-amber-200/90 text-amber-950 ring-amber-200"
        />
        <StatusCard
          label="Class"
          value={classLabel(student) || "Not set"}
          helper="Current section"
          icon={GraduationCap}
          tone="bg-sky-200/85 text-sky-950 ring-sky-200"
        />
        <StatusCard
          label="Notifications"
          value={formatNumber(unread)}
          helper={unread === 1 ? "Unread notice" : "Unread notices"}
          icon={Bell}
          tone="bg-violet-200/75 text-violet-950 ring-violet-200"
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Attendance                                 */
/* -------------------------------------------------------------------------- */

function AttendanceRow({ row }: { row: StudentAttendanceEntry }) {
  const normalized = row.status?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const isPresent = normalized === "present" || normalized === "late";

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl ring-1",
          isPresent
            ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20"
            : "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/20"
        )}
      >
        <CheckCircle2 className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{formatDate(row.date)}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {humanizeToken(row.status)}
          {row.subject ? ` - ${row.subject}` : ""}
          {row.remarks ? ` - ${row.remarks}` : ""}
        </p>
      </div>
      <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-semibold">
        {humanizeToken(row.status)}
      </span>
    </li>
  );
}

export function StudentAttendanceView() {
  const student = useResolvedStudent();
  const [data, setData] = React.useState<StudentAttendance | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const studentId = student?.id;

  React.useEffect(() => {
    if (studentId == null) return;
    let cancelled = false;

    getStudentAttendance(studentId)
      .then((loaded) => {
        if (cancelled) return;
        setData({
          ...loaded,
          history: [...loaded.history].sort((a, b) =>
            b.date.localeCompare(a.date)
          ),
        });
        setError(null);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(messageFor(cause, "Could not load attendance."));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, reloadKey]);

  if (!student) return <LoadingCards />;

  const attendance = percent(data?.attendance_pct ?? student.attendance_pct);
  const total = data?.total_days ?? data?.history.length ?? 0;
  const present =
    data?.present_days ??
    data?.history.filter((row) => row.status?.toLowerCase() === "present")
      .length ??
    0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatusCard
          label="Attendance"
          value={attendance !== null ? `${attendance}%` : "No data"}
          helper="Overall"
          icon={ClipboardCheck}
          tone="bg-emerald-200/85 text-emerald-950 ring-emerald-200"
        />
        <StatusCard
          label="Present"
          value={formatNumber(present)}
          helper="Marked present"
          icon={CheckCircle2}
          tone="bg-sky-200/85 text-sky-950 ring-sky-200"
        />
        <StatusCard
          label="Total Days"
          value={formatNumber(total)}
          helper="Records found"
          icon={CalendarDays}
          tone="bg-violet-200/75 text-violet-950 ring-violet-200"
        />
      </div>

      <Panel
        title="Attendance history"
        description="Your daily register, newest first."
        icon={ClipboardCheck}
      >
        {error ? (
          <SectionError
            message={error}
            onRetry={() => {
              setError(null);
              setReloadKey((key) => key + 1);
            }}
          />
        ) : !data ? (
          <RowsSkeleton />
        ) : data.history.length === 0 ? (
          <SectionEmpty
            icon={ClipboardCheck}
            title="No attendance yet"
            description="Attendance marked by the school will appear here."
          />
        ) : (
          <ul className="divide-y">
            {data.history.map((row, index) => (
              <AttendanceRow key={`${row.id ?? row.date}-${index}`} row={row} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Fees                                    */
/* -------------------------------------------------------------------------- */

function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <Receipt className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold tabular-nums">
          {formatCurrency(toAmount(payment.amount))}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {PAYMENT_MODE_LABELS[payment.payment_mode] ??
            humanizeToken(payment.payment_mode)}
          {payment.transaction_reference
            ? ` - ${payment.transaction_reference}`
            : ""}
        </p>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatDate(payment.payment_date)}
      </span>
    </li>
  );
}

export function StudentFeesView() {
  const student = useResolvedStudent();
  const [payments, setPayments] = React.useState<Payment[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const studentId = student?.id;

  React.useEffect(() => {
    if (studentId == null) return;
    let cancelled = false;

    listStudentPayments(studentId)
      .then((loaded) => {
        if (cancelled) return;
        // Newest first — the recent receipt is what anyone opens this for.
        setPayments(
          [...loaded].sort((a, b) =>
            String(b.payment_date ?? "").localeCompare(
              String(a.payment_date ?? "")
            )
          )
        );
        setError(null);
      })
      .catch((cause) => {
        if (!cancelled) setError(messageFor(cause, "Could not load payments."));
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, reloadKey]);

  if (!student) return <LoadingCards />;

  const paid =
    payments?.reduce((sum, payment) => sum + toAmount(payment.amount), 0) ?? 0;
  const due = toAmount(student.fees_due);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatusCard
          label="Fees Due"
          value={formatCurrency(due)}
          helper={due > 0 ? "Outstanding" : "No balance"}
          icon={CircleDollarSign}
          tone="bg-amber-200/90 text-amber-950 ring-amber-200"
        />
        <StatusCard
          label="Paid"
          value={formatCurrency(paid)}
          helper="Payment history total"
          icon={Wallet}
          tone="bg-emerald-200/85 text-emerald-950 ring-emerald-200"
        />
      </div>

      <Panel
        title="Payment history"
        description="Receipts the school has recorded against your name."
        icon={Receipt}
      >
        {error ? (
          <SectionError
            message={error}
            onRetry={() => {
              setError(null);
              setReloadKey((key) => key + 1);
            }}
          />
        ) : payments === null ? (
          <RowsSkeleton />
        ) : payments.length === 0 ? (
          <SectionEmpty
            icon={Receipt}
            title="No payments yet"
            description="Receipts will appear here after the school records a payment."
          />
        ) : (
          <ul className="divide-y">
            {payments.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Report cards                                */
/* -------------------------------------------------------------------------- */

/**
 * Report cards are keyed by enrolment, but a backend that has not sent one can
 * still be tried with the student id — the same fallback the parent portal
 * uses, so a school where the two happen to match still works.
 */
function enrollmentCandidates(student: StudentSelf): (string | number)[] {
  return [student.enrollment_id, student.id].filter(
    (value): value is string | number => value != null && value !== ""
  );
}

function ReportCardRow({ card }: { card: ReportCard }) {
  const percentage = toMarks(card.percentage);
  const total = toMarks(card.total_marks);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <FileBadge className="size-4" />
      </span>
      <div className="min-w-0 flex-1 basis-44">
        <p className="truncate text-sm font-semibold">
          {card.term_id ? `Term ${card.term_id}` : "Report card"}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {card.generated_at
            ? `Generated ${formatDate(card.generated_at)}`
            : "Published"}
        </p>
      </div>
      <div className="flex gap-5 text-right">
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
            Total
          </p>
          <p className="mt-0.5 text-sm tabular-nums">
            {total !== null ? formatNumber(total) : "-"}
          </p>
        </div>
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
            Rank
          </p>
          <p className="mt-0.5 text-sm tabular-nums">
            {card.rank != null ? `#${card.rank}` : "-"}
          </p>
        </div>
      </div>
      {card.overall_grade && (
        <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-semibold">
          {card.overall_grade}
        </span>
      )}
      <span
        className={cn(
          "rounded-lg px-2 py-0.5 text-xs font-semibold ring-1 tabular-nums",
          percentTone(percentage)
        )}
      >
        {percentage !== null ? `${percentage}%` : "-"}
      </span>
    </li>
  );
}

export function StudentReportCardsView() {
  const student = useResolvedStudent();
  const [cards, setCards] = React.useState<ReportCard[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    if (!student) return;
    let cancelled = false;
    const subject = student;

    async function load() {
      for (const candidate of enrollmentCandidates(subject)) {
        try {
          const loaded = await listReportCards(candidate);
          if (!cancelled) setCards(loaded);
          return;
        } catch (cause) {
          if (isForbiddenError(cause)) throw cause;
        }
      }
      if (!cancelled) setCards([]);
    }

    load().catch((cause) => {
      if (!cancelled) {
        setError(messageFor(cause, "Could not load report cards."));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [student, reloadKey]);

  if (!student) return <LoadingCards />;

  return (
    <Panel
      title="Report cards"
      description={`Published term results for ${studentName(student)}.`}
      icon={FileBadge}
    >
      {error ? (
        <SectionError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      ) : cards === null ? (
        <RowsSkeleton />
      ) : cards.length === 0 ? (
        <SectionEmpty
          icon={FileBadge}
          title="No report cards yet"
          description="When the school publishes a report card for you, it will appear here."
        />
      ) : (
        <ul className="divide-y">
          {cards.map((card) => (
            <ReportCardRow key={card.id} card={card} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Calendar                                  */
/* -------------------------------------------------------------------------- */

function EventRow({ event }: { event: CalendarEvent }) {
  const type = toCalendarEventType(event.event_type) ?? "other";
  const meta = EVENT_TYPE_META[type];

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        <span className="text-[0.5625rem] font-medium tracking-wide uppercase">
          {new Intl.DateTimeFormat("en-GB", { month: "short" }).format(
            new Date(event.start_date)
          )}
        </span>
        <span className="text-base leading-none font-semibold tabular-nums">
          {String(new Date(event.start_date).getDate()).padStart(2, "0")}
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
          {event.location && <span>{event.location}</span>}
        </p>
      </div>
      <span className="hidden text-xs font-medium text-muted-foreground sm:block">
        {relativeDay(event.start_date)}
      </span>
    </li>
  );
}

export function StudentCalendarView() {
  const state = useStudentPortal();
  const [loaded, setLoaded] = React.useState<{
    reloadKey: number;
    events: CalendarEvent[];
    yearName: string;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      const year = await getCurrentAcademicYear();
      if (!year) {
        if (!cancelled) setLoaded({ reloadKey, events: [], yearName: "" });
        return;
      }
      const events = await listCalendarEvents({ academic_year_id: year.id });
      const today = new Date().toISOString().slice(0, 10);
      if (!cancelled) {
        setLoaded({
          reloadKey,
          yearName: year.name?.trim() || `Year ${year.id}`,
          events: events
            .filter(
              (event) =>
                (event.end_date || event.start_date).slice(0, 10) >= today
            )
            .sort((a, b) => a.start_date.localeCompare(b.start_date)),
        });
      }
    }

    load()
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((cause) => {
        if (!cancelled) setError(messageFor(cause, "Could not load calendar."));
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (state.status !== "ready") return <RowsSkeleton />;

  const events = loaded?.reloadKey === reloadKey ? loaded.events : null;
  const yearName = loaded?.reloadKey === reloadKey ? loaded.yearName : "";

  return (
    <Panel
      title="School calendar"
      description={
        yearName ? `Upcoming events for ${yearName}.` : "Upcoming school events."
      }
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
      ) : events === null ? (
        <RowsSkeleton />
      ) : events.length === 0 ? (
        <SectionEmpty
          icon={CalendarClock}
          title="No upcoming events"
          description="Events added by the school will appear here."
        />
      ) : (
        <ul className="divide-y">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
