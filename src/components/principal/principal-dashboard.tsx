"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  GraduationCap,
  IndianRupee,
  School,
  UsersRound,
  Wallet,
} from "lucide-react";

import {
  LoadErrorCard,
  PageHeader,
  RowsSkeleton,
  StatCard,
  StatCardSkeleton,
  ViewOnlyChip,
  type Stat,
} from "@/components/principal/principal-chrome";
import { SectionEmpty } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { getPrincipalDashboard, type PrincipalDashboard } from "@/lib/api";
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
  | { status: "ready"; data: PrincipalDashboard }
  | { status: "error"; message: string };

function buildStats(data: PrincipalDashboard): Stat[] {
  const collected = data.fees_collected_this_month ?? 0;
  const pending = data.fees_pending ?? 0;

  return [
    {
      key: "students",
      label: "Students",
      value: formatNumber(data.students_total),
      helper: "On the roll",
      icon: GraduationCap,
      href: "/principal/students",
      tone: "bg-pink-200/80 text-pink-950 ring-pink-200",
    },
    {
      key: "staff",
      label: "Staff",
      value: formatNumber(data.staff_total),
      helper: "Team members",
      icon: UsersRound,
      href: "/principal/staff",
      tone: "bg-amber-200/90 text-amber-950 ring-amber-200",
    },
    {
      key: "collected",
      label: "Collected",
      value: formatCurrency(collected),
      helper: "This month",
      icon: Wallet,
      href: "/principal/fees",
      tone: "bg-sky-200/80 text-sky-950 ring-sky-200",
    },
    {
      key: "pending",
      label: "Pending",
      value: formatCurrency(pending),
      helper: "Fees outstanding",
      icon: IndianRupee,
      href: "/principal/fees",
      tone: "bg-violet-200/75 text-violet-950 ring-violet-200",
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*                                    Rows                                    */
/* -------------------------------------------------------------------------- */

function EventRow({
  event,
}: {
  event: PrincipalDashboard["upcoming_events"][number];
}) {
  const parts = dateParts(event.start_date);

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
          {event.event_type && (
            <span className="rounded-md bg-sky-50 px-1.5 py-0.5 font-medium text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-400 dark:ring-sky-500/20">
              {humanizeToken(event.event_type)}
            </span>
          )}
          <span>{formatDate(event.start_date)}</span>
        </p>
      </div>

      <span className="hidden shrink-0 text-xs font-medium text-muted-foreground sm:block">
        {relativeDay(event.start_date)}
      </span>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Collection                                 */
/* -------------------------------------------------------------------------- */

/** The collected-versus-pending split, the one figure a principal is asked for. */
function CollectionPanel({ data }: { data: PrincipalDashboard | null }) {
  const collected = data?.fees_collected_this_month ?? 0;
  const pending = data?.fees_pending ?? 0;
  const total = collected + pending;
  const collectedPercent = total > 0 ? Math.round((collected / total) * 100) : 0;

  return (
    <Panel
      title="Fee collection"
      description="How much of what was billed this month has come in."
      icon={Wallet}
      action={
        <Button variant="outline" size="lg" asChild className="rounded-xl">
          <Link href="/principal/fees">Fee reports</Link>
        </Button>
      }
    >
      <div className="p-5">
        <div
          className="mx-auto grid size-40 place-items-center rounded-full bg-[conic-gradient(var(--brand-500)_0_var(--collected),var(--muted)_var(--collected)_100%)] p-4"
          style={
            {
              "--collected": `${collectedPercent}%`,
            } as React.CSSProperties
          }
        >
          <div className="grid size-28 place-items-center rounded-full bg-card text-center shadow-soft">
            <div>
              <p className="text-2xl font-black tabular-nums">
                {data ? `${collectedPercent}%` : "—"}
              </p>
              <p className="text-xs font-semibold text-muted-foreground">
                collected
              </p>
            </div>
          </div>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="size-3 rounded-md bg-brand-500" />
            <dt className="flex-1 font-semibold">Collected</dt>
            <dd className="font-semibold tabular-nums">
              {data ? formatCurrency(collected) : "—"}
            </dd>
          </div>
          <div className="flex items-center gap-3">
            <span className="size-3 rounded-md bg-muted-foreground/35" />
            <dt className="flex-1 font-semibold">Pending</dt>
            <dd className="font-semibold tabular-nums">
              {data ? formatCurrency(pending) : "—"}
            </dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function PrincipalDashboardView() {
  const [state, setState] = React.useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    getPrincipalDashboard()
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

  if (state.status === "error") {
    return (
      <LoadErrorCard
        title="We couldn't load your dashboard"
        message={state.message}
        onRetry={() => {
          setState({ status: "loading" });
          setReloadKey((key) => key + 1);
        }}
      />
    );
  }

  const data = state.status === "ready" ? state.data : null;
  const events = data?.upcoming_events ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Principal's office"
        eyebrowIcon={School}
        title="Your school at a glance"
        description="Roll strength, staffing, this month's collection and what is coming up — the whole school, read only."
        action={<ViewOnlyChip />}
      />

      {/* ------------------------------- Stats ------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data
          ? buildStats(data).map((stat) => (
              <StatCard key={stat.key} stat={stat} />
            ))
          : Array.from({ length: 4 }, (_, index) => (
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
              <Link href="/principal/calendar">Calendar</Link>
            </Button>
          }
        >
          {!data ? (
            <RowsSkeleton rows={4} />
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

        <CollectionPanel data={data} />
      </div>
    </div>
  );
}
