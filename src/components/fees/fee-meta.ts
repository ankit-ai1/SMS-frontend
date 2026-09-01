import type { FeeStatus } from "@/lib/api";

/** One accent per allocation status, shared by every badge in the module. */
export const FEE_STATUS_META: Record<
  FeeStatus,
  { label: string; chip: string; dot: string }
> = {
  paid: {
    label: "Paid",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
  partial: {
    label: "Partial",
    chip: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/20",
    dot: "bg-amber-500",
  },
  pending: {
    label: "Pending",
    chip: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-400/15 dark:text-slate-300 dark:ring-slate-400/20",
    dot: "bg-slate-500",
  },
  overdue: {
    label: "Overdue",
    chip: "bg-destructive/10 text-destructive ring-destructive/20",
    dot: "bg-destructive",
  },
};

/** Worst status wins when a student's allocations disagree. */
export const FEE_STATUS_SEVERITY: Record<FeeStatus, number> = {
  paid: 0,
  pending: 1,
  partial: 2,
  overdue: 3,
};

export const FEE_FREQUENCY_LABELS: Record<string, string> = {
  one_time: "One-time",
  monthly: "Monthly",
  quarterly: "Quarterly",
  term: "Per term",
  annual: "Annual",
};

export const FEE_DISCOUNT_TYPE_LABELS: Record<string, string> = {
  sibling: "Sibling",
  merit: "Merit",
  need_based: "Need-based",
  staff_ward: "Staff ward",
  other: "Other",
};

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  cash: "Cash",
  cheque: "Cheque",
  card: "Card",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  online: "Online",
};

/**
 * Amounts arrive as numbers, but a JSON decimal can surface as a string.
 * Anything unparseable is treated as zero rather than rendering "NaN".
 */
export function toAmount(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}
