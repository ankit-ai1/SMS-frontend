import type { LeaveStatus } from "@/lib/api";

/** One accent per leave status, shared by every badge on the leave screen. */
export const LEAVE_STATUS_META: Record<
  LeaveStatus,
  { label: string; chip: string; dot: string }
> = {
  pending: {
    label: "Pending",
    chip: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/20",
    dot: "bg-amber-500",
  },
  approved: {
    label: "Approved",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    chip: "bg-destructive/10 text-destructive ring-destructive/20",
    dot: "bg-destructive",
  },
  cancelled: {
    label: "Cancelled",
    chip: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-400/15 dark:text-slate-300 dark:ring-slate-400/20",
    dot: "bg-slate-400",
  },
};

/** Inclusive day span of a leave request, or null when the dates don't parse. */
export function leaveDayCount(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return days > 0 ? days : null;
}
