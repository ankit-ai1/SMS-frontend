"use client";

import * as React from "react";
import { Receipt } from "lucide-react";

import { PAYMENT_MODE_LABELS, toAmount } from "@/components/fees/fee-meta";
import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { listStudentPayments, type Payment } from "@/lib/api";
import { formatCurrency, formatDate, humanizeToken } from "@/lib/format";

export type HistoryTarget = {
  studentId: string | number;
  studentName: string;
};

function HistoryList({ studentId }: { studentId: string | number }) {
  const [payments, setPayments] = React.useState<Payment[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
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
  }, [studentId, reloadKey]);

  if (error) {
    return (
      <SectionError
        message={error}
        onRetry={() => {
          setError(null);
          setReloadKey((key) => key + 1);
        }}
      />
    );
  }

  if (payments === null) {
    return (
      <ul className="space-y-2">
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index} className="flex items-center gap-3 rounded-xl border p-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-3 w-40 max-w-full rounded-md" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (payments.length === 0) {
    return (
      <SectionEmpty
        icon={Receipt}
        title="No payments yet"
        description="Once a payment is collected for this student, every receipt shows up here."
      />
    );
  }

  const total = payments.reduce(
    (sum, payment) => sum + toAmount(payment.amount),
    0
  );

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4 rounded-xl border bg-muted/25 px-3.5 py-3">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Total collected
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {formatCurrency(total)}
        </span>
      </div>

      <ul className="-mx-1 max-h-[50vh] space-y-2 overflow-y-auto px-1">
        {payments.map((payment) => (
          <li
            key={payment.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <Receipt className="size-4" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium tabular-nums">
                {formatCurrency(toAmount(payment.amount))}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {PAYMENT_MODE_LABELS[payment.payment_mode] ??
                  humanizeToken(payment.payment_mode)}
                {payment.transaction_reference
                  ? ` · ${payment.transaction_reference}`
                  : ""}
              </p>
            </div>

            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {payment.payment_date ? formatDate(payment.payment_date) : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PaymentHistoryDialog({
  target,
  onOpenChange,
}: {
  /** Null when closed. */
  target: HistoryTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={target != null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment history</DialogTitle>
          <DialogDescription>
            {target ? `Every receipt on file for ${target.studentName}.` : ""}
          </DialogDescription>
        </DialogHeader>

        {/* Mounted only while open, so it refetches each time it is opened. */}
        {target && <HistoryList studentId={target.studentId} />}
      </DialogContent>
    </Dialog>
  );
}
