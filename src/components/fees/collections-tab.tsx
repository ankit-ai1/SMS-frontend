"use client";

import * as React from "react";
import {
  ChevronDown,
  IndianRupee,
  MousePointerClick,
  Plus,
  Receipt,
  Sparkles,
  UsersRound,
  Wallet,
} from "lucide-react";

import {
  AllocateFeeDialog,
  type AllocateTarget,
} from "@/components/fees/allocate-fee-dialog";
import {
  CollectPaymentDialog,
  type CollectTarget,
} from "@/components/fees/collect-payment-dialog";
import { FEE_STATUS_SEVERITY, toAmount } from "@/components/fees/fee-meta";
import { GenerateAllocationsDialog } from "@/components/fees/generate-allocations-dialog";
import {
  PaymentHistoryDialog,
  type HistoryTarget,
} from "@/components/fees/payment-history-dialog";
import { FeeStatusBadge } from "@/components/fees/status-badge";
import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { SectionPicker } from "@/components/shared/section-picker";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listFeeAllocations,
  listFeeStructures,
  listSectionRoster,
  sameId,
  toFeeStatus,
  type AcademicYear,
  type FeeAllocation,
  type FeeDiscount,
  type FeeStructure,
  type PaymentResult,
  type RosterEntry,
  type SchoolClass,
  type Section,
} from "@/lib/api";
import { formatCurrency, formatDate, initialsFrom } from "@/lib/format";

type StudentRow = {
  entry: RosterEntry;
  allocations: FeeAllocation[];
};

type Loaded = {
  /** The section this data answers — see `requestKey` below. */
  requestKey: string;
  rows: StudentRow[];
  structures: FeeStructure[];
};

/**
 * Allocations are only fetchable one enrolment at a time, so a class means one
 * request per student. A small pool keeps that from stampeding the browser's
 * connection limit while still loading a full class quickly.
 */
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
/*                                    Rows                                    */
/* -------------------------------------------------------------------------- */

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

function AllocationRow({
  allocation,
  label,
  onCollect,
}: {
  allocation: FeeAllocation;
  label: string;
  onCollect: () => void;
}) {
  const due = toAmount(allocation.amount_due);
  const paid = toAmount(allocation.amount_paid);
  const balance = Math.max(0, due - paid);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-3.5 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <IndianRupee className="size-3.5" />
      </span>

      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {allocation.due_date
            ? `Due ${formatDate(allocation.due_date)}`
            : "No due date"}
        </p>
      </div>

      <div className="flex shrink-0 gap-5 text-right">
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
            Due
          </p>
          <p className="mt-0.5 text-sm tabular-nums">{formatCurrency(due)}</p>
        </div>
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
            Paid
          </p>
          <p className="mt-0.5 text-sm tabular-nums">{formatCurrency(paid)}</p>
        </div>
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
            Balance
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      <FeeStatusBadge status={allocation.status} />

      <Button
        size="sm"
        disabled={balance <= 0}
        onClick={onCollect}
        className="rounded-lg"
      >
        <Wallet className="size-3.5" />
        {balance <= 0 ? "Settled" : "Collect"}
      </Button>
    </li>
  );
}

function StudentCard({
  row,
  labelFor,
  onCollect,
  onHistory,
  onAllocate,
}: {
  row: StudentRow;
  labelFor: (allocation: FeeAllocation) => string;
  onCollect: (target: CollectTarget) => void;
  onHistory: (target: HistoryTarget) => void;
  onAllocate: (target: AllocateTarget) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const fullName = `${row.entry.first_name} ${row.entry.last_name}`.trim();
  const totals = totalsFor(row.allocations);

  return (
    <li className="px-4 py-3 transition-colors hover:bg-muted/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          disabled={row.allocations.length === 0}
          className="flex min-w-0 flex-1 basis-56 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[0.7rem] font-semibold text-brand-700">
            {initialsFrom(fullName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {fullName || "—"}
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
              {row.entry.roll_number != null &&
              String(row.entry.roll_number) !== ""
                ? `Roll ${row.entry.roll_number} · `
                : ""}
              {row.entry.admission_number || "—"}
            </span>
          </span>
          {row.allocations.length > 0 && (
            <ChevronDown
              className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          )}
        </button>

        {row.allocations.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">
            No fees allotted
          </span>
        ) : (
          <>
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

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onAllocate({
                enrollmentId: row.entry.enrollment_id,
                studentName: fullName,
                allocatedStructureIds: row.allocations.map((allocation) =>
                  String(allocation.fee_structure_id)
                ),
              })
            }
            className="rounded-lg"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Add fee</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onHistory({
                studentId: row.entry.student_id,
                studentName: fullName,
              })
            }
            className="rounded-lg"
          >
            <Receipt className="size-3.5" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </div>
      </div>

      {isOpen && row.allocations.length > 0 && (
        <ul className="mt-3 space-y-2 pl-0 sm:pl-12">
          {row.allocations.map((allocation) => (
            <AllocationRow
              key={allocation.id}
              allocation={allocation}
              label={labelFor(allocation)}
              onCollect={() =>
                onCollect({
                  allocation,
                  label: labelFor(allocation),
                  studentName: fullName,
                })
              }
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function RosterSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-full rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-lg" />
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Tab                                     */
/* -------------------------------------------------------------------------- */

export function CollectionsTab({
  sections,
  sectionId,
  onSectionChange,
  year,
  classes,
  discounts,
}: {
  sections: Section[];
  sectionId: string;
  onSectionChange: (value: string) => void;
  year: AcademicYear;
  classes: SchoolClass[];
  discounts: FeeDiscount[];
}) {
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [isGenerateOpen, setIsGenerateOpen] = React.useState(false);
  const [collecting, setCollecting] = React.useState<CollectTarget | null>(null);
  const [history, setHistory] = React.useState<HistoryTarget | null>(null);
  const [allocating, setAllocating] = React.useState<AllocateTarget | null>(
    null
  );

  // Identifies the roster the controls ask for. Loading is then simply "what we
  // hold isn't what we asked for" — no loading flag to keep in sync.
  const requestKey = `${sectionId}|${year.id}`;

  React.useEffect(() => {
    if (!sectionId) return;
    let cancelled = false;

    async function load(): Promise<Loaded> {
      const [roster, structures] = await Promise.all([
        listSectionRoster(sectionId),
        listFeeStructures({ academic_year_id: year.id }),
      ]);

      const rows = await mapWithPool(roster, 6, async (entry) => {
        const page = await listFeeAllocations({
          enrollment_id: entry.enrollment_id,
        });
        return { entry, allocations: page.items };
      });

      return { requestKey, rows, structures };
    }

    load()
      .then((next) => {
        if (cancelled) return;
        setLoaded(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading fee collections."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, sectionId, year.id, reloadKey]);

  const isStale = loaded?.requestKey !== requestKey;

  function labelFor(allocation: FeeAllocation): string {
    const structure = loaded?.structures.find((entry) =>
      sameId(entry.id, allocation.fee_structure_id)
    );
    return structure?.category_name?.trim() || "Fee";
  }

  /** Folds the payment response back into the row it came from. */
  function applyPayment(allocationId: string | number, result: PaymentResult) {
    setLoaded((current) => {
      if (!current) return current;
      return {
        ...current,
        rows: current.rows.map((row) => ({
          ...row,
          allocations: row.allocations.map((allocation) =>
            sameId(allocation.id, allocationId)
              ? {
                  ...allocation,
                  amount_paid: toAmount(result.allocation?.amount_paid),
                  amount_due: toAmount(result.allocation?.amount_due),
                  status: result.allocation?.status ?? allocation.status,
                }
              : allocation
          ),
        })),
      };
    });
  }

  const summary = React.useMemo(() => {
    const rows = loaded?.rows ?? [];
    let billed = 0;
    let collected = 0;
    let withDues = 0;

    for (const row of rows) {
      const totals = totalsFor(row.allocations);
      billed += totals.due;
      collected += totals.paid;
      if (totals.balance > 0) withDues += 1;
    }

    return { billed, collected, outstanding: Math.max(0, billed - collected), withDues };
  }, [loaded]);

  return (
    <>
      <Panel
        title="Collections"
        description="What each student in a section owes, and what they have paid."
        icon={Wallet}
        action={
          <Button
            size="lg"
            onClick={() => setIsGenerateOpen(true)}
            className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
          >
            <Sparkles className="size-4" />
            Generate Allocations
          </Button>
        }
      >
        <div className="border-b p-4">
          <SectionPicker
            id="collections_section"
            sections={sections}
            value={sectionId}
            onChange={onSectionChange}
          />
        </div>

        {!sectionId ? (
          <SectionEmpty
            icon={MousePointerClick}
            title="Pick a section to start"
            description="Choose a section above to see its roster with every fee allotted to each student."
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
          <RosterSkeleton />
        ) : loaded.rows.length === 0 ? (
          <SectionEmpty
            icon={UsersRound}
            title="No students in this section"
            description="Enroll students into this section before fees can be collected."
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-6 border-b bg-muted/25 px-4 py-3.5">
              <div>
                <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                  Billed
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {formatCurrency(summary.billed)}
                </p>
              </div>
              <div>
                <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                  Collected
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                  {formatCurrency(summary.collected)}
                </p>
              </div>
              <div>
                <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                  Outstanding
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {formatCurrency(summary.outstanding)}
                </p>
              </div>
              <div>
                <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                  Students with dues
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {summary.withDues}
                </p>
              </div>
            </div>

            <ul className="divide-y">
              {loaded.rows.map((row) => (
                <StudentCard
                  key={String(row.entry.enrollment_id)}
                  row={row}
                  labelFor={labelFor}
                  onCollect={setCollecting}
                  onHistory={setHistory}
                  onAllocate={setAllocating}
                />
              ))}
            </ul>
          </>
        )}
      </Panel>

      <GenerateAllocationsDialog
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        year={year}
        classes={classes}
        onGenerated={() => setReloadKey((key) => key + 1)}
      />

      <CollectPaymentDialog
        target={collecting}
        onOpenChange={(next) => {
          if (!next) setCollecting(null);
        }}
        onCollected={applyPayment}
      />

      <PaymentHistoryDialog
        target={history}
        onOpenChange={(next) => {
          if (!next) setHistory(null);
        }}
      />

      <AllocateFeeDialog
        target={allocating}
        structures={loaded?.structures ?? []}
        discounts={discounts}
        onOpenChange={(next) => {
          if (!next) setAllocating(null);
        }}
        onAllocated={() => {
          setAllocating(null);
          setReloadKey((key) => key + 1);
        }}
      />
    </>
  );
}
