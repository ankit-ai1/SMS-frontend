"use client";

import { LEAVE_STATUS_META } from "@/components/teacher/leave-meta";
import { toLeaveStatus } from "@/lib/api";
import { humanizeToken } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Colour-coded leave status. Unknown tokens keep neutral styling. */
export function LeaveStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const known = toLeaveStatus(status);
  const meta = known ? LEAVE_STATUS_META[known] : null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-medium ring-1",
        meta?.chip ?? "bg-muted text-muted-foreground ring-border",
        className
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", meta?.dot ?? "bg-muted-foreground/50")}
      />
      {meta?.label ?? humanizeToken(status) ?? "Unknown"}
    </span>
  );
}
