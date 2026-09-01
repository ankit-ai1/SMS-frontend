"use client";

import * as React from "react";
import {
  CircleDollarSign,
  IndianRupee,
  MousePointerClick,
  Receipt,
  TrendingUp,
  UsersRound,
  Wallet,
} from "lucide-react";

import {
  LoadErrorCard,
  NoYearCard,
  PageHeader,
  RowsSkeleton,
  StatCard,
  StatCardSkeleton,
  ViewOnlyChip,
  type Stat,
} from "@/components/principal/principal-chrome";
import { useSchoolScope, yearLabel } from "@/components/principal/use-school-scope";
import { FEE_STATUS_SEVERITY, toAmount } from "@/components/fees/fee-meta";
import { FeeStatusBadge } from "@/components/fees/status-badge";
import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { SectionPicker, sectionLabel } from "@/components/shared/section-picker";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getPrincipalDashboard,
  listFeeAllocations,
  listFeeStructures,
  listSectionRoster,
  sameId,
  toFeeStatus,
  type FeeAllocation,
  type FeeStructure,
  type PrincipalDashboard,
  type RosterEntry,
  type SchoolClass,
  type Section,
} from "@/lib/api";
import { formatCurrency, formatNumber, initialsFrom } from "@/lib/format";

const TABS = [
  { value: "summary", label: "Summary", icon: TrendingUp },
  { value: "section", label: "Section Report", icon: Receipt },
];

/**
 * Allocations are only fetchable one enrolment at a time, so a class means one
 * request per student. A small pool keeps that from stampeding the browser's
 * connection limit while still loading a full class quickly.
 */
const CONCURRENCY = 6;

async function mapWithPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run())
  );
  return results;
}

/* -------------------------------------------------------------------------- */
/*                                  Summary                                   */
/* -------------------------------------------------------------------------- */

function buildStats(data: PrincipalDashboard): Stat[] {
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
      tone: "bg-emerald-200/85 text-emerald-950 ring-emerald-200",
    },
    {
      key: "pending",
      label: "Pending",
      value: formatCurrency(pending),
      helper: "Still outstanding",
      icon: CircleDollarSign,
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

function SummaryTab({
  academicYearId,
  classes,
}: {
  academicYearId: string | number;
  classes: SchoolClass[];
}) {
  const [dashboard, setDashboard] = React.useState<PrincipalDashboard | null>(
    null
  );
  const [structures, setStructures] = React.useState<FeeStructure[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  // The headline figures and the structure table are separate reads, loaded
  // separately: one failing leaves the other on screen rather than blanking
  // the whole tab.
  React.useEffect(() => {
    let cancelled = false;

    getPrincipalDashboard()
      .then((loaded) => {
        if (!cancelled) setDashboard(loaded);
      })
      .catch(() => {
        // The tiles fall back to em dashes; the structure table still renders.
        if (!cancelled) setDashboard(null);
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

  function classNameFor(id: FeeStructure["class_id"]): string {
    return classes.find((entry) => sameId(entry.id, id))?.name?.trim() ?? "";
  }

  const billed =
    structures?.reduce(
      (sum, structure) => sum + toAmount(structure.amount),
      0
    ) ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {dashboard
          ? buildStats(dashboard).map((stat) => (
              <StatCard key={stat.key} stat={stat} />
            ))
          : Array.from({ length: 3 }, (_, index) => (
              <StatCardSkeleton key={index} />
            ))}
      </div>

      <Panel
        title="Fee structure"
        description="What each class is charged this year, per category."
        icon={IndianRupee}
        action={
          structures && structures.length > 0 ? (
            <span className="rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100 tabular-nums">
              {formatCurrency(billed)} across{" "}
              {formatNumber(structures.length)} heads
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
        ) : !structures ? (
          <RowsSkeleton rows={4} />
        ) : structures.length === 0 ? (
          <SectionEmpty
            icon={IndianRupee}
            title="No fee structure yet"
            description="Once the office sets what each class is charged, it shows up here."
          />
        ) : (
          <ul className="divide-y">
            {structures.map((structure) => (
              <StructureRow
                key={structure.id}
                structure={structure}
                fallbackClassName={classNameFor(structure.class_id)}
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Section report                               */
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

function StudentRowItem({ row }: { row: StudentRow }) {
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

      {row.allocations.length === 0 ? (
        <span className="text-xs text-muted-foreground italic">
          No fees allotted
        </span>
      ) : (
        <>
          <div className="flex shrink-0 gap-5 text-right">
            <div>
              <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
                Due
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
        </>
      )}
    </li>
  );
}

function SectionReportTab({
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

  // Identifies the data the controls ask for. Loading is then simply "what we
  // hold isn't what we asked for" — no loading flag to keep in sync.
  const requestKey = `${sectionId}|${reloadKey}`;

  React.useEffect(() => {
    if (!sectionId) return;
    let cancelled = false;

    async function load(): Promise<StudentRow[]> {
      const roster = await listSectionRoster(sectionId);
      return mapWithPool(roster, CONCURRENCY, async (entry) => ({
        entry,
        // One student's missing allocations must not blank the whole report.
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
      title="Section fee report"
      description={
        selected
          ? `What ${sectionLabel(selected)} owes and has paid.`
          : "Outstanding balances for one section at a time."
      }
      icon={Receipt}
    >
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-end">
        <SectionPicker
          id="principal_fees_section"
          sections={sections}
          value={sectionId}
          onChange={onSectionChange}
        />
      </div>

      {!sectionId ? (
        <SectionEmpty
          icon={MousePointerClick}
          title="Pick a section to start"
          description="Choose a section above to see every student's fee position."
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
          description="Enroll students into this section before a fee report can be built."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-6 border-b bg-muted/25 px-4 py-3.5">
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Students
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatNumber(rows.length)}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Billed
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatCurrency(totals.due)}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Collected
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatCurrency(totals.paid)}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Outstanding
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatCurrency(totals.balance)}
              </p>
            </div>
          </div>

          <ul className="divide-y">
            {rows.map((row) => (
              <StudentRowItem key={String(row.entry.enrollment_id)} row={row} />
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function PrincipalFeesView() {
  const { scope, error, reload } = useSchoolScope();
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
        title="Fees"
        description="This month's collection against what was billed, and where the balance sits."
        year={yearLabel(scope?.year)}
        action={<ViewOnlyChip />}
      />

      {!scope ? (
        <Card className="gap-0 py-0 shadow-card">
          <div className="flex flex-wrap items-center gap-3 border-b bg-muted/25 px-4 py-3.5">
            <Skeleton className="size-9 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-56 max-w-full rounded-md" />
            </div>
          </div>
          <RowsSkeleton rows={4} />
        </Card>
      ) : !scope.year ? (
        <NoYearCard description="Fee structures and allocations are tied to an academic year. Ask the office to set one as current." />
      ) : (
        <Tabs defaultValue="summary" className="gap-5">
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

          <TabsContent value="summary">
            <SummaryTab academicYearId={scope.year.id} classes={scope.classes} />
          </TabsContent>

          <TabsContent value="section">
            <SectionReportTab
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
