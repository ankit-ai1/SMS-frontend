"use client";

import * as React from "react";
import {
  HandCoins,
  History,
  Loader2,
  Plus,
  Search,
  SearchX,
  UserRoundSearch,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  LoadErrorCard,
  NoYearCard,
  PageHeader,
  RowsSkeleton,
  ScopeSkeleton,
  TotalsBar,
} from "@/components/accountant/accountant-chrome";
import {
  useFinanceScope,
  yearLabel,
} from "@/components/accountant/use-finance-scope";
import {
  AllocateFeeDialog,
  type AllocateTarget,
} from "@/components/fees/allocate-fee-dialog";
import {
  CollectPaymentDialog,
  type CollectTarget,
} from "@/components/fees/collect-payment-dialog";
import { toAmount } from "@/components/fees/fee-meta";
import {
  PaymentHistoryDialog,
  type HistoryTarget,
} from "@/components/fees/payment-history-dialog";
import { FeeStatusBadge } from "@/components/fees/status-badge";
import { SiblingHint } from "@/components/students/siblings-panel";
import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listEnrollments,
  listFeeAllocations,
  listFeeStructures,
  listStudents,
  sameId,
  type AcademicYear,
  type Enrollment,
  type FeeAllocation,
  type FeeDiscount,
  type FeeStructure,
  type PaymentResult,
  type Student,
} from "@/lib/api";
import { formatCurrency, formatDate, humanizeToken, initialsFrom } from "@/lib/format";

const SEARCH_DEBOUNCE_MS = 350;
const RESULT_LIMIT = 8;

/** The student's enrolment plus everything billed against it. */
type Billing = {
  /** The student this answers — see `requestKey` below. */
  requestKey: string;
  enrollment: Enrollment | null;
  allocations: FeeAllocation[];
};

function studentName(student: Student): string {
  return `${student.first_name} ${student.last_name}`.trim() || "Unnamed";
}

/* -------------------------------------------------------------------------- */
/*                                   Search                                   */
/* -------------------------------------------------------------------------- */

function SearchPanel({
  selected,
  onSelect,
}: {
  selected: Student | null;
  onSelect: (student: Student | null) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [results, setResults] = React.useState<Student[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Typing is cheap; requests are not. Only the settled value drives the fetch.
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const term = debounced.trim();

  React.useEffect(() => {
    if (!term) return;
    let cancelled = false;

    listStudents({ page: 1, per_page: RESULT_LIMIT, search: term })
      .then((loaded) => {
        if (cancelled) return;
        setResults(loaded.items);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while searching students."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [term]);

  const isSearching = term !== "" && results === null && error === null;
  // A picked student replaces the result list — the search has done its job.
  const showResults = term !== "" && !selected;

  return (
    <Panel
      title="Find the student"
      description="Search by name or admission number, the way a parent at the counter will give it to you."
      icon={UserRoundSearch}
    >
      <div className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              // Typing again means looking for somebody else.
              if (selected) onSelect(null);
            }}
            placeholder="Name or admission number"
            aria-label="Search students"
            className="h-11 rounded-2xl pr-9 pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDebounced("");
                setResults(null);
                onSelect(null);
              }}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {error ? (
        <SectionError message={error} onRetry={() => setDebounced(`${term} `)} />
      ) : isSearching ? (
        <div className="flex items-center justify-center gap-2 border-t px-4 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Searching…
        </div>
      ) : showResults && results && results.length === 0 ? (
        <div className="border-t">
          <SectionEmpty
            icon={SearchX}
            title="No student matches that"
            description="Check the spelling, or try the admission number instead."
          />
        </div>
      ) : showResults && results ? (
        <ul className="divide-y border-t">
          {results.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                onClick={() => onSelect(student)}
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors outline-none hover:bg-brand-50/45 focus-visible:bg-brand-50/45"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-[0.7rem] font-bold text-brand-700 ring-1 ring-brand-100">
                  {initialsFrom(studentName(student))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {studentName(student)}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
                    {student.admission_number || "—"}
                    {student.date_of_birth
                      ? ` · ${formatDate(student.date_of_birth)}`
                      : ""}
                    {student.gender ? ` · ${humanizeToken(student.gender)}` : ""}
                  </span>
                </span>
                {!student.is_active && (
                  <span className="shrink-0 rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
                    Inactive
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Billing                                  */
/* -------------------------------------------------------------------------- */

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
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <Wallet className="size-4" />
      </span>

      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-sm font-semibold">{label}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {allocation.due_date
            ? `Due ${formatDate(allocation.due_date)}`
            : "No due date"}
        </p>
      </div>

      <div className="flex shrink-0 gap-5 text-right">
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
            Billed
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
        className="shrink-0 rounded-lg"
      >
        <Wallet className="size-3.5" />
        {balance <= 0 ? "Settled" : "Collect"}
      </Button>
    </li>
  );
}

function BillingPanel({
  student,
  year,
  discounts,
}: {
  student: Student;
  year: AcademicYear;
  discounts: FeeDiscount[];
}) {
  const [billing, setBilling] = React.useState<Billing | null>(null);
  const [structures, setStructures] = React.useState<FeeStructure[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [collecting, setCollecting] = React.useState<CollectTarget | null>(null);
  const [allocating, setAllocating] = React.useState<AllocateTarget | null>(null);
  const [history, setHistory] = React.useState<HistoryTarget | null>(null);

  const requestKey = `${student.id}|${reloadKey}`;

  React.useEffect(() => {
    let cancelled = false;

    async function load(): Promise<Billing> {
      // The student row carries no enrolment, so resolve it for this year
      // first — allocations hang off the enrolment, not the student.
      const enrollments = await listEnrollments({
        academic_year_id: year.id,
        student_id: student.id,
      });
      const enrollment =
        enrollments.find((entry) => sameId(entry.student_id, student.id)) ?? null;

      if (!enrollment) return { requestKey, enrollment: null, allocations: [] };

      const page = await listFeeAllocations({
        enrollment_id: enrollment.id,
      });
      return { requestKey, enrollment, allocations: page.items };
    }

    load()
      .then((loaded) => {
        if (cancelled) return;
        setBilling(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading this student's fees."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, student.id, year.id]);

  // Structures name the allocations and feed the allocate form; a failure
  // there costs a label, not the screen.
  React.useEffect(() => {
    let cancelled = false;

    listFeeStructures({ academic_year_id: year.id })
      .then((loaded) => {
        if (!cancelled) setStructures(loaded);
      })
      .catch(() => {
        if (!cancelled) setStructures([]);
      });

    return () => {
      cancelled = true;
    };
  }, [year.id]);

  const isStale = billing?.requestKey !== requestKey;
  const allocations = billing?.allocations ?? [];
  const name = studentName(student);

  function labelFor(allocation: FeeAllocation): string {
    const structure = structures.find((entry) =>
      sameId(entry.id, allocation.fee_structure_id)
    );
    return structure?.category_name?.trim() || "Fee";
  }

  const billed = allocations.reduce(
    (sum, allocation) => sum + toAmount(allocation.amount_due),
    0
  );
  const paid = allocations.reduce(
    (sum, allocation) => sum + toAmount(allocation.amount_paid),
    0
  );
  const balance = Math.max(0, billed - paid);

  /** Folds the payment response back into the row it came from. */
  function applyPayment(allocationId: string | number, result: PaymentResult) {
    setBilling((current) => {
      if (!current) return current;
      return {
        ...current,
        allocations: current.allocations.map((allocation) =>
          sameId(allocation.id, allocationId)
            ? {
                ...allocation,
                amount_paid: toAmount(result.allocation?.amount_paid),
                amount_due: toAmount(result.allocation?.amount_due),
                status: result.allocation?.status ?? allocation.status,
              }
            : allocation
        ),
      };
    });
  }

  return (
    <>
      {/* Sits above the fees, because the concession has to be decided before
          the payment is taken — not after the receipt is printed. */}
      <SiblingHint studentId={student.id} />

      <Panel
        title={`${name}'s fees`}
        description={
          billing?.enrollment
            ? [
                billing.enrollment.class_name?.trim(),
                billing.enrollment.section_name?.trim(),
              ]
                .filter(Boolean)
                .join(" — ") || `Admission ${student.admission_number}`
            : `Admission ${student.admission_number || "—"}`
        }
        icon={HandCoins}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl"
              onClick={() =>
                setHistory({ studentId: student.id, studentName: name })
              }
            >
              <History className="size-4" />
              History
            </Button>
            {billing?.enrollment && (
              <Button
                variant="outline"
                size="lg"
                className="rounded-xl"
                onClick={() =>
                  setAllocating({
                    enrollmentId: billing.enrollment!.id,
                    studentName: name,
                    allocatedStructureIds: allocations.map((allocation) =>
                      String(allocation.fee_structure_id)
                    ),
                  })
                }
              >
                <Plus className="size-4" />
                Allocate fee
              </Button>
            )}
          </div>
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
        ) : isStale ? (
          <RowsSkeleton rows={3} />
        ) : !billing?.enrollment ? (
          <SectionEmpty
            icon={SearchX}
            title="Not enrolled this year"
            description={`${name} has no enrolment for ${yearLabel(year)}, so there is nothing to bill against. Ask the office to enroll them first.`}
          />
        ) : allocations.length === 0 ? (
          <SectionEmpty
            icon={Wallet}
            title="No fees allotted yet"
            description="Allocate a fee against this student before taking a payment."
          >
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl"
              onClick={() =>
                setAllocating({
                  enrollmentId: billing.enrollment!.id,
                  studentName: name,
                  allocatedStructureIds: [],
                })
              }
            >
              <Plus className="size-4" />
              Allocate fee
            </Button>
          </SectionEmpty>
        ) : (
          <>
            <TotalsBar
              items={[
                { label: "Billed", value: formatCurrency(billed) },
                { label: "Paid", value: formatCurrency(paid) },
                { label: "Balance", value: formatCurrency(balance) },
              ]}
            />

            <ul className="divide-y">
              {allocations.map((allocation) => (
                <AllocationRow
                  key={allocation.id}
                  allocation={allocation}
                  label={labelFor(allocation)}
                  onCollect={() =>
                    setCollecting({
                      allocation,
                      label: labelFor(allocation),
                      studentName: name,
                    })
                  }
                />
              ))}
            </ul>
          </>
        )}
      </Panel>

      <CollectPaymentDialog
        target={collecting}
        onOpenChange={(open) => !open && setCollecting(null)}
        onCollected={(allocationId, result) => {
          applyPayment(allocationId, result);
          setCollecting(null);
        }}
      />

      <AllocateFeeDialog
        target={allocating}
        structures={structures}
        discounts={discounts}
        onOpenChange={(open) => !open && setAllocating(null)}
        onAllocated={() => {
          setAllocating(null);
          toast.success("Fee allocated", {
            description: `${name} can now be collected against.`,
          });
          setReloadKey((key) => key + 1);
        }}
      />

      <PaymentHistoryDialog
        target={history}
        onOpenChange={(open) => !open && setHistory(null)}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function AccountantCollectView() {
  const { scope, error, reload, discounts } = useFinanceScope();
  const [selected, setSelected] = React.useState<Student | null>(null);

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
        eyebrow="Counter"
        eyebrowIcon={HandCoins}
        title="Collect a fee"
        description="Someone at the desk to pay? Find them by name or admission number and take the payment against what they owe."
        year={yearLabel(scope?.year)}
      />

      {!scope ? (
        <ScopeSkeleton rows={3} />
      ) : !scope.year ? (
        <NoYearCard description="Fees are billed against an academic year's enrolments. Ask the office to set one as current." />
      ) : (
        <>
          <SearchPanel selected={selected} onSelect={setSelected} />

          {selected ? (
            <BillingPanel
              key={String(selected.id)}
              student={selected}
              year={scope.year}
              discounts={discounts ?? []}
            />
          ) : (
            <Panel
              title="Nobody selected"
              description="The student's fees appear here once you pick them."
              icon={Wallet}
            >
              <div className="p-4">
                <Skeleton className="h-2 w-full rounded-full opacity-40" />
              </div>
              <SectionEmpty
                icon={UserRoundSearch}
                title="Search for a student to begin"
                description="Their outstanding fees, payment history and the Collect button all live here."
              />
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
