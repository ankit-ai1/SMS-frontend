"use client";

import * as React from "react";
import { CircleCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PAYMENT_MODE_LABELS, toAmount } from "@/components/fees/fee-meta";
import { FeeStatusBadge } from "@/components/fees/status-badge";
import { Field, fieldProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PAYMENT_MODES,
  createPayment,
  type FeeAllocation,
  type PaymentMode,
  type PaymentResult,
} from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";

const TODAY_ISO = new Date().toISOString().slice(0, 10);

export type CollectTarget = {
  allocation: FeeAllocation;
  /** What the allocation is for, e.g. "Tuition Fee". */
  label: string;
  studentName: string;
};

type Values = {
  amount: string;
  payment_mode: "" | PaymentMode;
  transaction_reference: string;
  payment_date: string;
  remarks: string;
};

type Errors = Partial<Record<keyof Values, string>>;

/* -------------------------------------------------------------------------- */
/*                                   Receipt                                  */
/* -------------------------------------------------------------------------- */

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

function Receipt({
  target,
  amount,
  mode,
  reference,
  date,
  result,
  onDone,
}: {
  target: CollectTarget;
  amount: number;
  mode: PaymentMode;
  reference: string;
  date: string;
  result: PaymentResult;
  onDone: () => void;
}) {
  const paid = toAmount(result.allocation?.amount_paid);
  const due = toAmount(result.allocation?.amount_due);
  const balance = Math.max(0, due - paid);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 pt-1 text-center">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <CircleCheck className="size-6" />
        </span>
        <p className="text-lg font-semibold tracking-tight tabular-nums">
          {formatCurrency(amount)} received
        </p>
        <p className="text-xs text-muted-foreground">
          {target.studentName} · {target.label}
        </p>
      </div>

      <div className="divide-y rounded-xl border bg-muted/25 px-3.5 py-1">
        <ReceiptLine label="Receipt No." value={String(result.id ?? "—")} />
        <ReceiptLine label="Payment mode" value={PAYMENT_MODE_LABELS[mode] ?? mode} />
        {reference && <ReceiptLine label="Reference" value={reference} />}
        <ReceiptLine label="Date" value={formatDate(date)} />
        <ReceiptLine label="Total due" value={formatCurrency(due)} />
        <ReceiptLine label="Paid to date" value={formatCurrency(paid)} />
        <div className="flex items-center justify-between gap-4 py-2">
          <span className="text-xs text-muted-foreground">Balance</span>
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(balance)}
            </span>
            <FeeStatusBadge status={result.allocation?.status ?? ""} />
          </span>
        </div>
      </div>

      <DialogFooter>
        <Button size="lg" onClick={onDone} className="rounded-xl">
          Done
        </Button>
      </DialogFooter>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

function CollectForm({
  target,
  onCancel,
  onCollected,
}: {
  target: CollectTarget;
  onCancel: () => void;
  onCollected: (result: PaymentResult, values: Values) => void;
}) {
  const due = toAmount(target.allocation.amount_due);
  const paid = toAmount(target.allocation.amount_paid);
  const balance = Math.max(0, due - paid);

  const [values, setValues] = React.useState<Values>({
    amount: balance > 0 ? String(balance) : "",
    payment_mode: "",
    transaction_reference: "",
    payment_date: TODAY_ISO,
    remarks: "",
  });
  const [errors, setErrors] = React.useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const amount = Number(values.amount);
    const found: Errors = {};
    if (!values.amount.trim()) {
      found.amount = "Amount is required.";
    } else if (!Number.isFinite(amount) || amount <= 0) {
      found.amount = "Enter an amount greater than zero.";
    } else if (balance > 0 && amount > balance) {
      found.amount = `That is more than the ${formatCurrency(balance)} balance.`;
    }
    if (!values.payment_mode) found.payment_mode = "Select a payment mode.";
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createPayment({
        allocation_id: target.allocation.id,
        amount,
        payment_mode: values.payment_mode as PaymentMode,
        ...(values.transaction_reference.trim()
          ? { transaction_reference: values.transaction_reference.trim() }
          : {}),
        ...(values.payment_date ? { payment_date: values.payment_date } : {}),
        ...(values.remarks.trim() ? { remarks: values.remarks.trim() } : {}),
      });

      toast.success("Payment recorded", {
        description: `${formatCurrency(amount)} collected from ${target.studentName}.`,
      });
      onCollected(result, values);
    } catch (error) {
      toast.error("Could not record the payment", {
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="-mx-1 max-h-[55vh] space-y-4 overflow-y-auto px-1">
        {/* What is owed, so the amount below is never entered blind. */}
        <div className="grid grid-cols-3 gap-3 rounded-xl border bg-muted/25 p-3.5">
          <div>
            <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
              Due
            </p>
            <p className="mt-1 text-sm font-medium tabular-nums">
              {formatCurrency(due)}
            </p>
          </div>
          <div>
            <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
              Paid
            </p>
            <p className="mt-1 text-sm font-medium tabular-nums">
              {formatCurrency(paid)}
            </p>
          </div>
          <div>
            <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
              Balance
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="payment_amount" label="Amount (₹)" error={errors.amount}>
            <Input
              {...fieldProps("payment_amount", errors.amount)}
              type="number"
              min={0}
              step="1"
              inputMode="numeric"
              value={values.amount}
              onChange={(e) => set("amount", e.target.value)}
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl tabular-nums"
            />
          </Field>

          <Field
            id="payment_mode"
            label="Payment Mode"
            error={errors.payment_mode}
          >
            <Select
              value={values.payment_mode}
              onValueChange={(value) => set("payment_mode", value as PaymentMode)}
              disabled={isSubmitting}
            >
              <SelectTrigger
                {...fieldProps("payment_mode", errors.payment_mode)}
                className="h-9 w-full rounded-xl"
              >
                <SelectValue placeholder="How was it paid?" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {PAYMENT_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="payment_reference" label="Reference (optional)">
            <Input
              {...fieldProps("payment_reference")}
              value={values.transaction_reference}
              onChange={(e) => set("transaction_reference", e.target.value)}
              placeholder="UTR / cheque no."
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>

          <Field id="payment_date" label="Payment Date">
            <Input
              {...fieldProps("payment_date")}
              type="date"
              value={values.payment_date}
              onChange={(e) => set("payment_date", e.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>
        </div>

        <Field id="payment_remarks" label="Remarks (optional)">
          <Textarea
            id="payment_remarks"
            value={values.remarks}
            onChange={(e) => set("remarks", e.target.value)}
            placeholder="Anything worth noting against this receipt."
            disabled={isSubmitting}
            className="min-h-20 rounded-xl"
          />
        </Field>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="rounded-xl"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Recording…
            </>
          ) : (
            "Record Payment"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Dialog                                   */
/* -------------------------------------------------------------------------- */

type Done = { result: PaymentResult; values: Values };

/**
 * Collects one payment, then swaps to a receipt so the counter clerk has
 * something to read back before closing.
 */
export function CollectPaymentDialog({
  target,
  onOpenChange,
  onCollected,
}: {
  /** Null when closed. */
  target: CollectTarget | null;
  onOpenChange: (open: boolean) => void;
  onCollected: (allocationId: string | number, result: PaymentResult) => void;
}) {
  const [done, setDone] = React.useState<Done | null>(null);

  function close() {
    setDone(null);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={target != null}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {done ? "Payment received" : "Collect payment"}
          </DialogTitle>
          <DialogDescription>
            {done
              ? "Here is the receipt for this payment."
              : target
                ? `${target.studentName} · ${target.label}`
                : ""}
          </DialogDescription>
        </DialogHeader>

        {target &&
          (done ? (
            <Receipt
              target={target}
              amount={Number(done.values.amount)}
              mode={done.values.payment_mode as PaymentMode}
              reference={done.values.transaction_reference.trim()}
              date={done.values.payment_date}
              result={done.result}
              onDone={close}
            />
          ) : (
            <CollectForm
              // Remounts per allocation, so the initialiser is the reset.
              key={String(target.allocation.id)}
              target={target}
              onCancel={close}
              onCollected={(result, values) => {
                setDone({ result, values });
                onCollected(target.allocation.id, result);
              }}
            />
          ))}
      </DialogContent>
    </Dialog>
  );
}
