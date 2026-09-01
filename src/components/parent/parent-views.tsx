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
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { EVENT_TYPE_META } from "@/components/calendar/calendar-meta";
import { percentTone, toMarks } from "@/components/exams/exam-meta";
import { PAYMENT_MODE_LABELS, toAmount } from "@/components/fees/fee-meta";
import { childName, classLabel, useParentPortal } from "@/components/parent/parent-context";
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
  type ParentChild,
  type Payment,
  type ReportCard,
  type StudentAttendance,
  type StudentAttendanceEntry,
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
    return "This record is outside your parent account access. Please select a linked child or contact the school office.";
  }
  return cause instanceof Error ? cause.message : fallback;
}

function percent(value: number | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed <= 1 ? Math.round(parsed * 100) : Math.round(parsed);
}

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
          {href && <ArrowUpRight className="size-4 opacity-45 group-hover:opacity-90" />}
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
    <Link href={href} className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
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

function useSelectedChildReady() {
  const state = useParentPortal();
  return state.status === "ready" && state.selectedChild ? state : null;
}

export function ParentDashboardView() {
  const state = useParentPortal();

  if (state.status !== "ready") return <LoadingCards />;
  const child = state.selectedChild;
  if (!child) return null;

  const attendance = percent(child.attendance_pct);
  const feesDue = toAmount(child.fees_due);
  const unread = Number(state.dashboard.unread_notifications ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-brand-600 uppercase">
          <UsersRound className="size-4" />
          Parent portal
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
          {childName(child)} at a glance
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
          href="/parent/attendance"
          tone="bg-emerald-200/85 text-emerald-950 ring-emerald-200"
        />
        <StatusCard
          label="Fees Due"
          value={formatCurrency(feesDue)}
          helper={feesDue > 0 ? "Outstanding" : "All clear"}
          icon={Wallet}
          href="/parent/fees"
          tone="bg-amber-200/90 text-amber-950 ring-amber-200"
        />
        <StatusCard
          label="Class"
          value={classLabel(child) || "Not set"}
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

function AttendanceRow({ row }: { row: StudentAttendanceEntry }) {
  const normalized = row.status?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const isPresent = normalized === "present" || normalized === "late";

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl ring-1",
          isPresent
            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
            : "bg-amber-50 text-amber-700 ring-amber-100"
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

export function ParentAttendanceView() {
  const state = useSelectedChildReady();
  const child = state?.selectedChild;
  const [loaded, setLoaded] = React.useState<{
    childId: string;
    data: StudentAttendance;
  } | null>(null);
  const [error, setError] = React.useState<{
    childId: string;
    message: string;
  } | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    if (!child) return;
    let cancelled = false;
    const childId = String(child.id);

    getStudentAttendance(child.id)
      .then((loaded) => {
        if (cancelled) return;
        setLoaded({
          childId,
          data: {
            ...loaded,
            history: [...loaded.history].sort((a, b) => b.date.localeCompare(a.date)),
          },
        });
        setError(null);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError({
            childId,
            message: messageFor(cause, "Could not load attendance."),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [child, reloadKey]);

  if (!child) return <LoadingCards />;

  const childId = String(child.id);
  const data = loaded?.childId === childId ? loaded.data : null;
  const activeError = error?.childId === childId ? error.message : null;
  const attendance = percent(data?.attendance_pct ?? child.attendance_pct);
  const total = data?.total_days ?? data?.history.length ?? 0;
  const present =
    data?.present_days ??
    data?.history.filter((row) => row.status?.toLowerCase() === "present").length ??
    0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatusCard label="Attendance" value={attendance !== null ? `${attendance}%` : "No data"} helper="Overall" icon={ClipboardCheck} tone="bg-emerald-200/85 text-emerald-950 ring-emerald-200" />
        <StatusCard label="Present" value={formatNumber(present)} helper="Marked present" icon={CheckCircle2} tone="bg-sky-200/85 text-sky-950 ring-sky-200" />
        <StatusCard label="Total Days" value={formatNumber(total)} helper="Records found" icon={CalendarDays} tone="bg-violet-200/75 text-violet-950 ring-violet-200" />
      </div>

      <Panel title="Attendance history" description={`Daily register for ${childName(child)}.`} icon={ClipboardCheck}>
        {activeError ? (
          <SectionError message={activeError} onRetry={() => { setError(null); setReloadKey((key) => key + 1); }} />
        ) : !data ? (
          <RowsSkeleton />
        ) : data.history.length === 0 ? (
          <SectionEmpty icon={ClipboardCheck} title="No attendance yet" description="Attendance marked by the school will appear here." />
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
          {PAYMENT_MODE_LABELS[payment.payment_mode] ?? humanizeToken(payment.payment_mode)}
          {payment.transaction_reference ? ` - ${payment.transaction_reference}` : ""}
        </p>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatDate(payment.payment_date)}
      </span>
    </li>
  );
}

export function ParentFeesView() {
  const state = useSelectedChildReady();
  const child = state?.selectedChild;
  const [loaded, setLoaded] = React.useState<{
    childId: string;
    payments: Payment[];
  } | null>(null);
  const [error, setError] = React.useState<{
    childId: string;
    message: string;
  } | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    if (!child) return;
    let cancelled = false;
    const childId = String(child.id);

    listStudentPayments(child.id)
      .then((loaded) => {
        if (cancelled) return;
        setLoaded({
          childId,
          payments: [...loaded].sort((a, b) =>
            String(b.payment_date ?? "").localeCompare(String(a.payment_date ?? ""))
          ),
        });
        setError(null);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError({
            childId,
            message: messageFor(cause, "Could not load payments."),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [child, reloadKey]);

  if (!child) return <LoadingCards />;

  const childId = String(child.id);
  const payments = loaded?.childId === childId ? loaded.payments : null;
  const activeError = error?.childId === childId ? error.message : null;
  const paid = payments?.reduce((sum, payment) => sum + toAmount(payment.amount), 0) ?? 0;
  const due = toAmount(child.fees_due);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatusCard label="Fees Due" value={formatCurrency(due)} helper={due > 0 ? "Outstanding" : "No balance"} icon={CircleDollarSign} tone="bg-amber-200/90 text-amber-950 ring-amber-200" />
        <StatusCard label="Paid" value={formatCurrency(paid)} helper="Payment history total" icon={Wallet} tone="bg-emerald-200/85 text-emerald-950 ring-emerald-200" />
      </div>

      <Panel title="Payment history" description={`Receipts recorded for ${childName(child)}.`} icon={Receipt}>
        {activeError ? (
          <SectionError message={activeError} onRetry={() => { setError(null); setReloadKey((key) => key + 1); }} />
        ) : payments === null ? (
          <RowsSkeleton />
        ) : payments.length === 0 ? (
          <SectionEmpty icon={Receipt} title="No payments yet" description="Receipts will appear here after the school records a payment." />
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

function enrollmentCandidates(child: ParentChild): (string | number)[] {
  return [child.enrollment_id, child.id].filter(
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
          {card.generated_at ? `Generated ${formatDate(card.generated_at)}` : "Published"}
        </p>
      </div>
      <div className="flex gap-5 text-right">
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">Total</p>
          <p className="mt-0.5 text-sm tabular-nums">{total !== null ? formatNumber(total) : "-"}</p>
        </div>
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">Rank</p>
          <p className="mt-0.5 text-sm tabular-nums">{card.rank != null ? `#${card.rank}` : "-"}</p>
        </div>
      </div>
      {card.overall_grade && (
        <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-semibold">
          {card.overall_grade}
        </span>
      )}
      <span className={cn("rounded-lg px-2 py-0.5 text-xs font-semibold ring-1 tabular-nums", percentTone(percentage))}>
        {percentage !== null ? `${percentage}%` : "-"}
      </span>
    </li>
  );
}

export function ParentReportCardsView() {
  const state = useSelectedChildReady();
  const child = state?.selectedChild;
  const [loaded, setLoaded] = React.useState<{
    childId: string;
    cards: ReportCard[];
  } | null>(null);
  const [error, setError] = React.useState<{
    childId: string;
    message: string;
  } | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    if (!child) return;
    let cancelled = false;
    const selectedChild = child;
    const childId = String(selectedChild.id);

    async function load() {
      const candidates = enrollmentCandidates(selectedChild);
      for (const candidate of candidates) {
        try {
          const loaded = await listReportCards(candidate);
          if (!cancelled) setLoaded({ childId, cards: loaded });
          return;
        } catch (cause) {
          if (isForbiddenError(cause)) throw cause;
        }
      }
      if (!cancelled) setLoaded({ childId, cards: [] });
    }

    load().catch((cause) => {
      if (!cancelled) {
        setError({
          childId,
          message: messageFor(cause, "Could not load report cards."),
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [child, reloadKey]);

  if (!child) return <LoadingCards />;

  const childId = String(child.id);
  const cards = loaded?.childId === childId ? loaded.cards : null;
  const activeError = error?.childId === childId ? error.message : null;

  return (
    <Panel title="Report cards" description={`Published term results for ${childName(child)}.`} icon={FileBadge}>
      {activeError ? (
        <SectionError message={activeError} onRetry={() => { setError(null); setReloadKey((key) => key + 1); }} />
      ) : cards === null ? (
        <RowsSkeleton />
      ) : cards.length === 0 ? (
        <SectionEmpty icon={FileBadge} title="No report cards yet" description="When the school publishes a report card for this child, it will appear here." />
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

function EventRow({ event }: { event: CalendarEvent }) {
  const type = toCalendarEventType(event.event_type) ?? "other";
  const meta = EVENT_TYPE_META[type];

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        <span className="text-[0.5625rem] font-medium tracking-wide uppercase">
          {new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(event.start_date))}
        </span>
        <span className="text-base leading-none font-semibold tabular-nums">
          {String(new Date(event.start_date).getDate()).padStart(2, "0")}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{event.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("rounded-md px-1.5 py-0.5 font-medium ring-1", meta.pill)}>
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

export function ParentCalendarView() {
  const state = useParentPortal();
  const [loaded, setLoaded] = React.useState<{
    reloadKey: number;
    events: CalendarEvent[];
    yearName: string;
  } | null>(null);
  const [error, setError] = React.useState<{
    reloadKey: number;
    message: string;
  } | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      const year = await getCurrentAcademicYear();
      if (!year) {
        if (!cancelled) setLoaded({ reloadKey, events: [], yearName: "" });
        return;
      }
      const loaded = await listCalendarEvents({ academic_year_id: year.id });
      const today = new Date().toISOString().slice(0, 10);
      if (!cancelled) {
        setLoaded({
          reloadKey,
          yearName: year.name?.trim() || `Year ${year.id}`,
          events: loaded
            .filter((event) => (event.end_date || event.start_date).slice(0, 10) >= today)
            .sort((a, b) => a.start_date.localeCompare(b.start_date)),
        });
      }
    }

    load()
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError({
            reloadKey,
            message: messageFor(cause, "Could not load calendar."),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (state.status !== "ready") return <RowsSkeleton />;

  const events = loaded?.reloadKey === reloadKey ? loaded.events : null;
  const yearName = loaded?.reloadKey === reloadKey ? loaded.yearName : "";
  const activeError = error?.reloadKey === reloadKey ? error.message : null;

  return (
    <Panel
      title="School calendar"
      description={yearName ? `Upcoming events for ${yearName}.` : "Upcoming school events."}
      icon={CalendarClock}
    >
      {activeError ? (
        <SectionError message={activeError} onRetry={() => { setError(null); setReloadKey((key) => key + 1); }} />
      ) : events === null ? (
        <RowsSkeleton />
      ) : events.length === 0 ? (
        <SectionEmpty icon={CalendarClock} title="No upcoming events" description="Events added by the school will appear here." />
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
