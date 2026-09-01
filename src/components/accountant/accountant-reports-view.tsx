"use client";

import * as React from "react";
import {
  ChartColumn,
  IndianRupee,
  Layers,
  MousePointerClick,
  UsersRound,
} from "lucide-react";

import {
  LoadErrorCard,
  NoYearCard,
  PageHeader,
  RowsSkeleton,
  ScopeSkeleton,
  StatCard,
  StatCardSkeleton,
  TotalsBar,
  mapWithPool,
  type Stat,
} from "@/components/accountant/accountant-chrome";
import {
  useFinanceScope,
  yearLabel,
} from "@/components/accountant/use-finance-scope";
import { FEE_STATUS_SEVERITY, toAmount } from "@/components/fees/fee-meta";
import { FeeStatusBadge } from "@/components/fees/status-badge";
import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { SectionPicker, sectionLabel } from "@/components/shared/section-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAccountantDashboard,
  listFeeAllocations,
  listFeeStructures,
  listSectionRoster,
  sameId,
  toFeeStatus,
  type AccountantDashboard,
  type FeeAllocation,
  type FeeStructure,
  type RosterEntry,
  type SchoolClass,
  type Section,
} from "@/lib/api";
import { formatCurrency, formatNumber, initialsFrom } from "@/lib/format";

const TABS = [
  { value: "collection", label: "Collection", icon: ChartColumn },
  { value: "outstanding", label: "Outstanding", icon: IndianRupee },
];

const CONCURRENCY = 6;

/* -------------------------------------------------------------------------- */
/*                              Collection report                             */
/* -------------------------------------------------------------------------- */

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
      icon: ChartColumn,
      tone: "bg-emerald-200/85 text-emerald-950 ring-emerald-200",
    },
    {
      key: "pending",
      label: "Outstanding",
      value: formatCurrency(pending),
      helper: "Still to come in",
      icon: IndianRupee,
      tone: "bg-amber-200/90 text-amber-950 ring-amber-200",
    },
    {
      key: "rate",
      label: "Collection Rate",
      value: `${rate}%`,
      helper: "Of what was billed",
      icon: Layers,
      tone: "bg-sky-200/85 text-sky-950 ring-sky-200",
    },
  ];
}

/** One class's price list, totalled — what a full year costs per class. */
type ClassTotal = {
  classId: string;
  className: string;
  heads: number;
  total: number;
};

function buildClassTotals(
  structures: FeeStructure[],
  classes: SchoolClass[]
): ClassTotal[] {
  const totals = new Map<string, ClassTotal>();

  for (const structure of structures) {
    const key = String(structure.class_id);
    const name =
      structure.class_name?.trim() ||
      classes.find((entry) => sameId(entry.id, structure.class_id))?.name?.trim() ||
      `Class ${structure.class_id}`;

    const current = totals.get(key) ?? {
      classId: key,
      className: name,
      heads: 0,
      total: 0,
    };
    current.heads += 1;
    current.total += toAmount(structure.amount);
    totals.set(key, current);
  }

  return [...totals.values()].sort((a, b) => b.total - a.total);
}

function CollectionTab({
  academicYearId,
  classes,
}: {
  academicYearId: string | number;
  classes: SchoolClass[];
}) {
  const [dashboard, setDashboard] = React.useState<AccountantDashboard | null>(
    null
  );
  const [dashboardError, setDashboardError] = React.useState<string | null>(null);
  const [structures, setStructures] = React.useState<FeeStructure[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Two separate reads: the headline figures failing must not take the class
  // price list down with them.
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

    listFeeStructures({ academic_year_id: academicYearId })
      .then((loaded) => {
        if (cancelled) return;
        setStructures(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading the fee structure."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [academicYearId, reloadKey]);

  const classTotals = structures ? buildClassTotals(structures, classes) : null;
  const grandTotal =
    classTotals?.reduce((sum, row) => sum + row.total, 0) ?? 0;

  return (
    <div className="space-y-6">
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

      <Panel
        title="Billed by class"
        description="What a full year costs in each class, totalled across every fee head."
        icon={Layers}
        action={
          classTotals && classTotals.length > 0 ? (
            <span className="rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100 tabular-nums">
              {formatCurrency(grandTotal)} across{" "}
              {formatNumber(classTotals.length)} classes
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
        ) : !classTotals ? (
          <RowsSkeleton rows={4} />
        ) : classTotals.length === 0 ? (
          <SectionEmpty
            icon={IndianRupee}
            title="No fee structure yet"
            description="Set what each class is charged on the Fees screen and this report fills in."
          />
        ) : (
          <ul className="divide-y">
            {classTotals.map((row) => (
              <li
                key={row.classId}
                className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <Layers className="size-4" />
                </span>

                <div className="min-w-0 flex-1 basis-44">
                  <p className="truncate text-sm font-semibold">
                    {row.className}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                    {formatNumber(row.heads)}{" "}
                    {row.heads === 1 ? "fee head" : "fee heads"}
                  </p>
                </div>

                {/* Bar against the dearest class, so the spread is readable. */}
                <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-[width] duration-300"
                      style={{
                        width: `${
                          classTotals[0].total > 0
                            ? (row.total / classTotals[0].total) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums">
                  {formatCurrency(row.total)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Outstanding report                             */
/* -------------------------------------------------------------------------- */

type StudentRow = {
  entry: RosterEntry;
  allocations: FeeAllocation[];
};

type Loaded = {
  /** The section this data answers — see `requestKey` below. */
  requestKey: string;
  rows: StudentRow[];
};

function totalsFor(allocations: FeeAllocation[]) {
  const due = allocations.reduce(
    (sum, allocation) => sum + toAmount(allocation.amount_due),
    0
  );
  const paid = allocations.reduce(
    (sum, allocation) => sum + toAmount(allocation.amount_paid),
    0
  );

  // Worst status wins, so a single overdue fee is visible from the roster.
  let worst = "";
  let severity = -1;
  for (const allocation of allocations) {
    const status = toFeeStatus(allocation.status);
    const rank = status ? FEE_STATUS_SEVERITY[status] : -1;
    if (rank > severity) {
      severity = rank;
      worst = allocation.status;
    }
  }

  return { due, paid, balance: Math.max(0, due - paid), worst };
}

function OutstandingRow({ row }: { row: StudentRow }) {
  const fullName = `${row.entry.first_name} ${row.entry.last_name}`.trim();
  const totals = totalsFor(row.allocations);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-[0.7rem] font-bold text-brand-700 ring-1 ring-brand-100">
        {initialsFrom(fullName)}
      </span>

      <div className="min-w-0 flex-1 basis-44">
        <p className="truncate text-sm font-semibold">{fullName || "—"}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
          {row.entry.roll_number != null && String(row.entry.roll_number) !== ""
            ? `Roll ${row.entry.roll_number} · `
            : ""}
          {row.entry.admission_number || "—"}
        </p>
      </div>

      <div className="flex shrink-0 gap-5 text-right">
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
            Billed
          </p>
          <p className="mt-0.5 text-sm tabular-nums">
            {formatCurrency(totals.due)}
          </p>
        </div>
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
            Paid
          </p>
          <p className="mt-0.5 text-sm tabular-nums">
            {formatCurrency(totals.paid)}
          </p>
        </div>
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
            Balance
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">
            {formatCurrency(totals.balance)}
          </p>
        </div>
      </div>

      <FeeStatusBadge status={totals.worst} />
    </li>
  );
}

function OutstandingTab({
  sections,
  sectionId,
  onSectionChange,
}: {
  sections: Section[];
  sectionId: string;
  onSectionChange: (value: string) => void;
}) {
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const requestKey = `${sectionId}|${reloadKey}`;

  React.useEffect(() => {
    if (!sectionId) return;
    let cancelled = false;

    async function load(): Promise<StudentRow[]> {
      const roster = await listSectionRoster(sectionId);
      return mapWithPool(roster, CONCURRENCY, async (entry) => ({
        entry,
        // One student's missing allocations must not blank the report.
        allocations: await listFeeAllocations({
          enrollment_id: entry.enrollment_id,
        })
          .then((page) => page.items)
          .catch(() => [] as FeeAllocation[]),
      }));
    }

    load()
      .then((rows) => {
        if (cancelled) return;
        setLoaded({ requestKey, rows });
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading this section."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, sectionId]);

  const isStale = loaded?.requestKey !== requestKey;
  const rows = loaded?.rows ?? [];
  // Only students who still owe something belong in an outstanding report.
  const owing = rows
    .filter((row) => totalsFor(row.allocations).balance > 0)
    .sort(
      (a, b) => totalsFor(b.allocations).balance - totalsFor(a.allocations).balance
    );

  const totals = rows.reduce(
    (sum, row) => {
      const student = totalsFor(row.allocations);
      return {
        due: sum.due + student.due,
        paid: sum.paid + student.paid,
        balance: sum.balance + student.balance,
      };
    },
    { due: 0, paid: 0, balance: 0 }
  );

  const selected = sections.find((section) => String(section.id) === sectionId);

  return (
    <Panel
      title="Outstanding balances"
      description={
        selected
          ? `Who still owes in ${sectionLabel(selected)}, largest first.`
          : "Who still owes, one section at a time."
      }
      icon={IndianRupee}
    >
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-end">
        <SectionPicker
          id="accountant_reports_section"
          sections={sections}
          value={sectionId}
          onChange={onSectionChange}
        />
      </div>

      {!sectionId ? (
        <SectionEmpty
          icon={MousePointerClick}
          title="Pick a section to start"
          description="Choose a section above to see who still owes and how much."
        />
      ) : error ? (
        <SectionError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      ) : isStale ? (
        <RowsSkeleton />
      ) : rows.length === 0 ? (
        <SectionEmpty
          icon={UsersRound}
          title="No students in this section"
          description="Enroll students into this section before a report can be built."
        />
      ) : (
        <>
          <TotalsBar
            items={[
              { label: "Students", value: formatNumber(rows.length) },
              { label: "Still owing", value: formatNumber(owing.length) },
              { label: "Billed", value: formatCurrency(totals.due) },
              { label: "Collected", value: formatCurrency(totals.paid) },
              { label: "Outstanding", value: formatCurrency(totals.balance) },
            ]}
          />

          {owing.length === 0 ? (
            <SectionEmpty
              icon={IndianRupee}
              title="Nothing outstanding"
              description="Every student in this section has settled what they were billed."
            />
          ) : (
            <ul className="divide-y">
              {owing.map((row) => (
                <OutstandingRow
                  key={String(row.entry.enrollment_id)}
                  row={row}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function AccountantReportsView() {
  const { scope, error, reload } = useFinanceScope();
  const [sectionId, setSectionId] = React.useState("");

  if (error) {
    return (
      <LoadErrorCard
        title="We couldn't load your fee setup"
        message={error}
        onRetry={reload}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        description="What the school bills, what it has collected, and who is still to pay."
        year={yearLabel(scope?.year)}
      />

      {!scope ? (
        <ScopeSkeleton />
      ) : !scope.year ? (
        <NoYearCard description="Reports are built from an academic year's structures and allocations. Ask the office to set one as current." />
      ) : (
        <Tabs defaultValue="collection" className="gap-5">
          {/* The list keeps its natural width; the wrapper scrolls when narrow. */}
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="w-max gap-0.5 rounded-xl p-1">
              {TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="gap-2 rounded-lg px-3.5 data-active:text-brand-700 dark:data-active:text-brand-300"
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="collection">
            <CollectionTab
              academicYearId={scope.year.id}
              classes={scope.classes}
            />
          </TabsContent>

          <TabsContent value="outstanding">
            <OutstandingTab
              sections={scope.sections}
              sectionId={sectionId}
              onSectionChange={setSectionId}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
