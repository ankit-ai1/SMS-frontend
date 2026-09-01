"use client";

import * as React from "react";
import { MousePointerClick, Receipt, UsersRound } from "lucide-react";

import {
  LoadErrorCard,
  NoYearCard,
  PageHeader,
  RowsSkeleton,
  ScopeSkeleton,
  TotalsBar,
  mapWithPool,
} from "@/components/accountant/accountant-chrome";
import {
  useFinanceScope,
  yearLabel,
} from "@/components/accountant/use-finance-scope";
import { PAYMENT_MODE_LABELS, toAmount } from "@/components/fees/fee-meta";
import { Field, SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { SectionPicker, sectionLabel } from "@/components/shared/section-picker";
import { Input } from "@/components/ui/input";
import {
  listSectionRoster,
  listStudentPayments,
  type Payment,
  type RosterEntry,
  type Section,
} from "@/lib/api";
import { formatCurrency, formatDate, formatNumber, humanizeToken, initialsFrom } from "@/lib/format";

/**
 * Payments are only fetchable one student at a time, so a section means one
 * request per student. A small pool keeps that from stampeding the browser's
 * connection limit while still loading a full class quickly.
 */
const CONCURRENCY = 6;

/** A receipt with the student it belongs to, which the payment row lacks. */
type LedgerEntry = {
  payment: Payment;
  entry: RosterEntry;
};

type Loaded = {
  /** The section this data answers — see `requestKey` below. */
  requestKey: string;
  entries: LedgerEntry[];
};

function paymentDate(payment: Payment): string {
  return String(payment.payment_date ?? "").slice(0, 10);
}

/* -------------------------------------------------------------------------- */
/*                                    Rows                                    */
/* -------------------------------------------------------------------------- */

function LedgerRow({ item }: { item: LedgerEntry }) {
  const fullName = `${item.entry.first_name} ${item.entry.last_name}`.trim();
  const mode = item.payment.payment_mode;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-[0.7rem] font-bold text-brand-700 ring-1 ring-brand-100">
        {initialsFrom(fullName)}
      </span>

      <div className="min-w-0 flex-1 basis-44">
        <p className="truncate text-sm font-semibold">{fullName || "—"}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
          {item.entry.admission_number || "—"}
        </p>
      </div>

      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-xs font-medium">
          {PAYMENT_MODE_LABELS[mode] ?? humanizeToken(mode) ?? "—"}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {item.payment.transaction_reference?.trim() || "No reference"}
        </p>
      </div>

      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatDate(item.payment.payment_date)}
      </span>

      <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums">
        {formatCurrency(toAmount(item.payment.amount))}
      </span>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Ledger                                   */
/* -------------------------------------------------------------------------- */

function LedgerPanel({
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
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  // Identifies the data the section picker asks for. Loading is then simply
  // "what we hold isn't what we asked for" — no loading flag to keep in sync.
  const requestKey = `${sectionId}|${reloadKey}`;

  React.useEffect(() => {
    if (!sectionId) return;
    let cancelled = false;

    async function load(): Promise<LedgerEntry[]> {
      const roster = await listSectionRoster(sectionId);
      const perStudent = await mapWithPool(
        roster,
        CONCURRENCY,
        async (entry) => {
          // One student's unreadable history must not blank the ledger.
          const payments = await listStudentPayments(entry.student_id).catch(
            () => [] as Payment[]
          );
          return payments.map((payment) => ({ payment, entry }));
        }
      );
      return perStudent.flat();
    }

    load()
      .then((entries) => {
        if (cancelled) return;
        // Newest first — the recent receipt is what anyone opens this for.
        setLoaded({
          requestKey,
          entries: entries.sort((a, b) =>
            paymentDate(b.payment).localeCompare(paymentDate(a.payment))
          ),
        });
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading payments."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, sectionId]);

  const isStale = loaded?.requestKey !== requestKey;

  // The date range narrows what is already loaded; it is not a second request,
  // because the payments endpoint takes no date filter.
  const visible = (loaded?.entries ?? []).filter((item) => {
    const date = paymentDate(item.payment);
    if (from && date && date < from) return false;
    if (to && date && date > to) return false;
    return true;
  });

  const total = visible.reduce(
    (sum, item) => sum + toAmount(item.payment.amount),
    0
  );

  // Which tender the money came in by — the figure a day's cash-up needs.
  const byMode = new Map<string, number>();
  for (const item of visible) {
    const mode = item.payment.payment_mode;
    byMode.set(mode, (byMode.get(mode) ?? 0) + toAmount(item.payment.amount));
  }

  const selected = sections.find((section) => String(section.id) === sectionId);

  return (
    <Panel
      title="Payment register"
      description={
        selected
          ? `Every receipt recorded for ${sectionLabel(selected)}.`
          : "Receipts recorded, one section at a time."
      }
      icon={Receipt}
    >
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-end">
        <SectionPicker
          id="accountant_payments_section"
          sections={sections}
          value={sectionId}
          onChange={onSectionChange}
        />

        <Field id="accountant_payments_from" label="From">
          <Input
            id="accountant_payments_from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
            className="h-9 w-full rounded-xl sm:w-40"
          />
        </Field>

        <Field id="accountant_payments_to" label="To">
          <Input
            id="accountant_payments_to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
            className="h-9 w-full rounded-xl sm:w-40"
          />
        </Field>
      </div>

      {!sectionId ? (
        <SectionEmpty
          icon={MousePointerClick}
          title="Pick a section to start"
          description="Choose a section above to see every payment its students have made."
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
      ) : (loaded?.entries.length ?? 0) === 0 ? (
        <SectionEmpty
          icon={Receipt}
          title="No payments recorded"
          description="Once a payment is collected against this section, its receipt shows up here."
        />
      ) : visible.length === 0 ? (
        <SectionEmpty
          icon={UsersRound}
          title="No payments in this date range"
          description="Widen the From and To dates to see the rest of this section's receipts."
        />
      ) : (
        <>
          <TotalsBar
            items={[
              { label: "Receipts", value: formatNumber(visible.length) },
              { label: "Collected", value: formatCurrency(total) },
              ...Array.from(byMode.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([mode, amount]) => ({
                  label:
                    PAYMENT_MODE_LABELS[mode] ?? humanizeToken(mode) ?? "Other",
                  value: formatCurrency(amount),
                })),
            ]}
          />

          <ul className="divide-y">
            {visible.map((item) => (
              <LedgerRow
                key={`${item.payment.id}-${item.entry.enrollment_id}`}
                item={item}
              />
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

export function AccountantPaymentsView() {
  const { scope, error, reload } = useFinanceScope();
  const [sectionId, setSectionId] = React.useState("");

  if (error) {
    return (
      <LoadErrorCard
        title="We couldn't load your sections"
        message={error}
        onRetry={reload}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Every receipt recorded, with the tender it came in by. Collect a new one from the Fees screen."
        year={yearLabel(scope?.year)}
      />

      {!scope ? (
        <ScopeSkeleton />
      ) : !scope.year ? (
        <NoYearCard description="Payments are recorded against an academic year's enrolments. Ask the office to set one as current." />
      ) : (
        <LedgerPanel
          sections={scope.sections}
          sectionId={sectionId}
          onSectionChange={setSectionId}
        />
      )}
    </div>
  );
}
