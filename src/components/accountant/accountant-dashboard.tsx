"use client";

import * as React from "react";
import Link from "next/link";
import {
  BadgePercent,
  Calculator,
  CircleDollarSign,
  IndianRupee,
  Layers,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";

import {
  LoadErrorCard,
  PageHeader,
  RowsSkeleton,
  StatCard,
  StatCardSkeleton,
  type Stat,
} from "@/components/accountant/accountant-chrome";
import {
  useFinanceScope,
  yearLabel,
} from "@/components/accountant/use-finance-scope";
import { toAmount } from "@/components/fees/fee-meta";
import { SectionEmpty } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import {
  getAccountantDashboard,
  listFeeStructures,
  sameId,
  type AccountantDashboard,
  type FeeStructure,
  type SchoolClass,
} from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/format";

function buildStats(data: AccountantDashboard): Stat[] {
  const collected = data.fees_collected_this_month ?? 0;
  const pending = data.fees_pending ?? 0;
  const total = collected + pending;
  const rate = total > 0 ? Math.round((collected / total) * 100) : 0;

  return [
    {
      key: "collected",
      label: "Collected",
      value: formatCurrency(collected),
      helper: "This month",
      icon: Wallet,
      href: "/accountant/payments",
      tone: "bg-emerald-200/85 text-emerald-950 ring-emerald-200",
    },
    {
      key: "pending",
      label: "Outstanding",
      value: formatCurrency(pending),
      helper: "Still to come in",
      icon: CircleDollarSign,
      href: "/accountant/reports",
      tone: "bg-amber-200/90 text-amber-950 ring-amber-200",
    },
    {
      key: "rate",
      label: "Collection Rate",
      value: `${rate}%`,
      helper: "Of what was billed",
      icon: TrendingUp,
      tone: "bg-sky-200/85 text-sky-950 ring-sky-200",
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*                                    Rows                                    */
/* -------------------------------------------------------------------------- */

function StructureRow({
  structure,
  fallbackClassName,
}: {
  structure: FeeStructure;
  fallbackClassName: string;
}) {
  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <IndianRupee className="size-4" />
      </span>

      <div className="min-w-0 flex-1 basis-44">
        <p className="truncate text-sm font-semibold">
          {structure.category_name?.trim() ||
            `Category ${structure.fee_category_id}`}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {structure.class_name?.trim() ||
            fallbackClassName ||
            `Class ${structure.class_id}`}
        </p>
      </div>

      <span className="text-sm font-semibold tabular-nums">
        {formatCurrency(toAmount(structure.amount))}
      </span>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function AccountantDashboardView() {
  const { scope, error, reload } = useFinanceScope();

  const [dashboard, setDashboard] = React.useState<AccountantDashboard | null>(
    null
  );
  const [dashboardError, setDashboardError] = React.useState<string | null>(null);
  const [structures, setStructures] = React.useState<FeeStructure[] | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  // The headline figures come from one endpoint and the price list from
  // another, loaded separately: one failing leaves the other on screen.
  React.useEffect(() => {
    let cancelled = false;

    getAccountantDashboard()
      .then((loaded) => {
        if (cancelled) return;
        setDashboard(loaded);
        setDashboardError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setDashboardError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading your figures."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const yearId = scope?.year?.id;

  React.useEffect(() => {
    if (yearId == null) return;
    let cancelled = false;

    listFeeStructures({ academic_year_id: yearId })
      .then((loaded) => {
        if (!cancelled) setStructures(loaded);
      })
      .catch(() => {
        if (!cancelled) setStructures([]);
      });

    return () => {
      cancelled = true;
    };
  }, [yearId, reloadKey]);

  function classNameFor(id: FeeStructure["class_id"]): string {
    return (
      scope?.classes.find((entry: SchoolClass) => sameId(entry.id, id))?.name?.trim() ??
      ""
    );
  }

  if (error) {
    return (
      <LoadErrorCard
        title="We couldn't load your fee setup"
        message={error}
        onRetry={reload}
      />
    );
  }

  const billed =
    structures?.reduce(
      (sum, structure) => sum + toAmount(structure.amount),
      0
    ) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance desk"
        eyebrowIcon={Calculator}
        title="The money, at a glance"
        description="What has come in this month, what is still owed, and the price list it is all billed from."
        year={yearLabel(scope?.year)}
      />

      {/* ------------------------------- Stats ------------------------------ */}
      {dashboardError ? (
        <LoadErrorCard
          title="We couldn't load your figures"
          message={dashboardError}
          onRetry={() => {
            setDashboardError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {dashboard
            ? buildStats(dashboard).map((stat) => (
                <StatCard key={stat.key} stat={stat} />
              ))
            : Array.from({ length: 3 }, (_, index) => (
                <StatCardSkeleton key={index} />
              ))}
        </div>
      )}

      {/* ------------------------------ Panels ------------------------------ */}
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Fee structure"
          description="What each class is charged this year, per category."
          icon={IndianRupee}
          action={
            <Button variant="outline" size="lg" asChild className="rounded-xl">
              <Link href="/accountant/fees">Fee setup</Link>
            </Button>
          }
        >
          {!scope ? (
            <RowsSkeleton rows={4} />
          ) : !scope.year ? (
            <SectionEmpty
              icon={Layers}
              title="No academic year set up"
              description="Fee structures are priced per year. Ask the office to set one as current."
            />
          ) : !structures ? (
            <RowsSkeleton rows={4} />
          ) : structures.length === 0 ? (
            <SectionEmpty
              icon={IndianRupee}
              title="No fee structure yet"
              description="Set what each class is charged on the Fees screen, then collect against it."
            >
              <Button variant="outline" size="lg" asChild className="rounded-xl">
                <Link href="/accountant/fees">Set up fees</Link>
              </Button>
            </SectionEmpty>
          ) : (
            <>
              <div className="flex flex-wrap gap-6 border-b bg-muted/25 px-4 py-3.5">
                <div>
                  <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                    Heads
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {formatNumber(structures.length)}
                  </p>
                </div>
                <div>
                  <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                    Combined value
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {formatCurrency(billed)}
                  </p>
                </div>
              </div>

              <ul className="divide-y">
                {structures.slice(0, 8).map((structure) => (
                  <StructureRow
                    key={structure.id}
                    structure={structure}
                    fallbackClassName={classNameFor(structure.class_id)}
                  />
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel
          title="Where to go next"
          description="The three things this desk does."
          icon={Calculator}
        >
          <div className="grid gap-3 p-4">
            <Button
              asChild
              variant="outline"
              className="h-14 justify-between rounded-2xl px-4"
            >
              <Link href="/accountant/fees">
                <span className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <Wallet className="size-4" />
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-bold">Fees</span>
                    <span className="block text-xs text-muted-foreground">
                      Set structures, then collect
                    </span>
                  </span>
                </span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-14 justify-between rounded-2xl px-4"
            >
              <Link href="/accountant/payments">
                <span className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <Receipt className="size-4" />
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-bold">Payments</span>
                    <span className="block text-xs text-muted-foreground">
                      Every receipt recorded
                    </span>
                  </span>
                </span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-14 justify-between rounded-2xl px-4"
            >
              <Link href="/accountant/reports">
                <span className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <BadgePercent className="size-4" />
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-bold">
                      Financial Reports
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Who still owes what
                    </span>
                  </span>
                </span>
              </Link>
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
