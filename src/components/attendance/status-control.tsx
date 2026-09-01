"use client";

import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

/** One accent per status, used by the segmented control and the count chips. */
export const STATUS_META: Record<
  AttendanceStatus,
  { label: string; active: string; chip: string; dot: string }
> = {
  present: {
    label: "Present",
    active: "bg-emerald-500 text-white shadow-sm",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
  absent: {
    label: "Absent",
    active: "bg-destructive text-white shadow-sm",
    chip: "bg-destructive/10 text-destructive ring-destructive/20",
    dot: "bg-destructive",
  },
  late: {
    label: "Late",
    active: "bg-amber-500 text-white shadow-sm",
    chip: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/20",
    dot: "bg-amber-500",
  },
  excused: {
    label: "Excused",
    active: "bg-slate-500 text-white shadow-sm",
    chip: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-400/15 dark:text-slate-300 dark:ring-slate-400/20",
    dot: "bg-slate-500",
  },
  half_day: {
    label: "Half-day",
    active: "bg-sky-500 text-white shadow-sm",
    chip: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-400 dark:ring-sky-500/20",
    dot: "bg-sky-500",
  },
};

/** The five-way status picker on each roster row. */
export function StatusSegmented({
  value,
  onChange,
  label,
  disabled,
}: {
  value: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  /** Names the group for screen readers, e.g. the student's name. */
  label: string;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={`Attendance for ${label}`}
      className="inline-flex max-w-full shrink-0 gap-0.5 overflow-x-auto rounded-xl border bg-muted/40 p-0.5"
    >
      {ATTENDANCE_STATUSES.map((status) => {
        const meta = STATUS_META[status];
        const isActive = value === status;

        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => onChange(status)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
              isActive
                ? meta.active
                : "text-muted-foreground hover:bg-card hover:text-foreground"
            )}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

/** Read-only count chip, e.g. "Present 24". */
export function StatusCount({
  status,
  count,
}: {
  status: AttendanceStatus;
  count: number;
}) {
  const meta = STATUS_META[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-medium ring-1",
        meta.chip
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
      <span className="tabular-nums">{count}</span>
    </span>
  );
}
