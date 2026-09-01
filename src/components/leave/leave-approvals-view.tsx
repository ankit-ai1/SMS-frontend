"use client";

import * as React from "react";
import { CalendarCheck, CalendarOff, Check, X } from "lucide-react";
import { toast } from "sonner";

import { LeaveStatusBadge } from "@/components/teacher/leave-status-badge";
import { leaveDayCount } from "@/components/teacher/leave-meta";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  decideLeave,
  listLeaves,
  toLeaveStatus,
  type LeaveDecision,
  type LeaveRequest,
  type LeaveStatus,
} from "@/lib/api";
import { formatDate, formatNumber, initialsFrom, relativeDay } from "@/lib/format";

/**
 * The approval queue, shared by every role that can decide someone else's
 * leave. Who that is, is the backend's call: `GET /api/v1/leaves` returns the
 * whole school to an approver and only their own requests to everyone else, so
 * this screen sends no scope of its own.
 *
 * A principal approves the staff below them and an admin approves the
 * principal, but the screen is identical either way — hence one component
 * rather than one per role.
 */

/** Which request is being decided, and which way. */
type PendingDecision = {
  leave: LeaveRequest;
  decision: LeaveDecision;
};

function staffNameOf(leave: LeaveRequest): string {
  return leave.staff_name?.trim() || `Staff ${leave.staff_id ?? "—"}`;
}

/* -------------------------------------------------------------------------- */
/*                                    Rows                                    */
/* -------------------------------------------------------------------------- */

function LeaveRow({
  leave,
  onDecide,
}: {
  leave: LeaveRequest;
  onDecide: (decision: PendingDecision) => void;
}) {
  const days = leaveDayCount(leave.start_date, leave.end_date);
  const appliedOn = leave.applied_on ?? leave.created_at;
  // Only a request nobody has decided on yet can be approved or rejected.
  const isPending = toLeaveStatus(leave.status) === "pending";

  return (
    <li className="flex flex-wrap items-start gap-4 px-4 py-4 transition-colors hover:bg-muted/40">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-[0.7rem] font-bold text-brand-700 shadow-soft ring-1 ring-brand-100">
        {leave.staff_name?.trim() ? (
          initialsFrom(leave.staff_name)
        ) : (
          <CalendarCheck className="size-4.5" />
        )}
      </span>

      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{staffNameOf(leave)}</p>
          <LeaveStatusBadge status={leave.status} />
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          {leave.leave_type_name?.trim() || "Leave request"}
        </p>

        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {formatDate(leave.start_date)} – {formatDate(leave.end_date)}
          {days !== null && ` · ${days} ${days === 1 ? "day" : "days"}`}
          {` · ${relativeDay(leave.start_date)}`}
        </p>

        {leave.reason?.trim() && (
          <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {leave.reason}
          </p>
        )}

        {appliedOn && (
          <p className="mt-1.5 text-[0.6875rem] text-muted-foreground/80">
            Applied {formatDate(appliedOn)}
          </p>
        )}
      </div>

      {isPending && (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDecide({ leave, decision: "rejected" })}
            className="rounded-lg text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-3.5" />
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => onDecide({ leave, decision: "approved" })}
            className="rounded-lg shadow-brand transition-all hover:bg-brand-700"
          >
            <Check className="size-3.5" />
            Approve
          </Button>
        </div>
      )}
    </li>
  );
}

function RowsSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="flex items-start gap-4 px-4 py-4">
          <Skeleton className="size-10 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-44 max-w-[60%] rounded-md" />
            <Skeleton className="h-3 w-56 max-w-[75%] rounded-md" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

/** Pending first — a decision queue is useless if it buries what needs deciding. */
const STATUS_ORDER: Record<LeaveStatus, number> = {
  pending: 0,
  approved: 1,
  rejected: 2,
  cancelled: 3,
};

export function LeaveApprovalsView() {
  const [leaves, setLeaves] = React.useState<LeaveRequest[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [deciding, setDeciding] = React.useState<PendingDecision | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    // No scope is sent: the backend widens this to the whole school for an
    // approver and narrows it to their own requests for everyone else.
    listLeaves()
      .then((loaded) => {
        if (cancelled) return;
        setLeaves(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading leave requests."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const sorted = React.useMemo(() => {
    if (!leaves) return null;
    return [...leaves].sort((a, b) => {
      const rankA = STATUS_ORDER[toLeaveStatus(a.status) ?? "cancelled"];
      const rankB = STATUS_ORDER[toLeaveStatus(b.status) ?? "cancelled"];
      if (rankA !== rankB) return rankA - rankB;
      // Within a status, the request starting soonest needs attention first.
      return String(a.start_date).localeCompare(String(b.start_date));
    });
  }, [leaves]);

  const pendingCount = (leaves ?? []).filter(
    (leave) => toLeaveStatus(leave.status) === "pending"
  ).length;

  const isRejecting = deciding?.decision === "rejected";
  const decidingName = deciding ? staffNameOf(deciding.leave) : "";
  const decidingSpan = deciding
    ? `${formatDate(deciding.leave.start_date)} – ${formatDate(
        deciding.leave.end_date
      )}`
    : "";

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Leave Approvals
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Requests raised by the staff you approve for, and where each one
            stands.
          </p>
        </div>

        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/20">
            <CalendarCheck className="size-3.5" />
            {formatNumber(pendingCount)} awaiting a decision
          </span>
        )}
      </div>

      <Panel
        title="Leave requests"
        description="Pending first, then the ones already decided."
        icon={CalendarCheck}
      >
        {error ? (
          <SectionError
            message={error}
            onRetry={() => {
              setError(null);
              setReloadKey((key) => key + 1);
            }}
          />
        ) : !sorted ? (
          <RowsSkeleton />
        ) : sorted.length === 0 ? (
          <SectionEmpty
            icon={CalendarOff}
            title="No leave requests"
            description="Requests raised by staff will appear here for a decision."
          />
        ) : (
          <ul className="divide-y">
            {sorted.map((leave) => (
              <LeaveRow key={leave.id} leave={leave} onDecide={setDeciding} />
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={deciding !== null}
        onOpenChange={(open) => !open && setDeciding(null)}
        title={
          isRejecting ? "Reject this leave request?" : "Approve this leave request?"
        }
        description={
          <>
            {decidingName}&rsquo;s{" "}
            {deciding?.leave.leave_type_name?.trim().toLowerCase() ||
              "leave request"}{" "}
            for {decidingSpan} will be{" "}
            {isRejecting ? "rejected" : "approved"}. They see the decision on
            their own leave screen.
          </>
        }
        confirmLabel={isRejecting ? "Reject" : "Approve"}
        pendingLabel={isRejecting ? "Rejecting" : "Approving"}
        errorTitle={
          isRejecting
            ? "Could not reject this request"
            : "Could not approve this request"
        }
        onConfirm={async () => {
          if (!deciding) return;
          await decideLeave(deciding.leave.id, deciding.decision);
          toast.success(
            isRejecting ? "Leave request rejected" : "Leave request approved",
            { description: `${decidingName} · ${decidingSpan}` }
          );
          setDeciding(null);
          setReloadKey((key) => key + 1);
        }}
      />
    </div>
  );
}
