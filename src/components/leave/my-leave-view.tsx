"use client";

import * as React from "react";
import { CalendarCheck, CalendarOff, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { LeaveDialog } from "@/components/teacher/leave-dialog";
import { LeaveStatusBadge } from "@/components/teacher/leave-status-badge";
import { leaveDayCount } from "@/components/teacher/leave-meta";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cancelLeave,
  listLeaveTypes,
  listLeaves,
  toLeaveStatus,
  type LeaveRequest,
  type LeaveType,
} from "@/lib/api";
import { formatDate, relativeDay } from "@/lib/format";

/**
 * "My Leave" for a role that also approves other people's.
 *
 * The distinction matters: an approver's unscoped `GET /api/v1/leaves` is the
 * whole school, which is the wrong list entirely for this screen. There is no
 * staff id on the client to filter by either — `AuthUser` carries a user id,
 * not a staff one — so the scope has to come from the request, hence
 * `scope: "mine"`.
 *
 * The teacher screen keeps its own unscoped call, which is already correct for
 * a role that approves nobody.
 */

/* -------------------------------------------------------------------------- */
/*                                    Rows                                    */
/* -------------------------------------------------------------------------- */

function LeaveRow({
  leave,
  onCancel,
}: {
  leave: LeaveRequest;
  onCancel: () => void;
}) {
  const days = leaveDayCount(leave.start_date, leave.end_date);
  // Only a request nobody has decided on yet can be withdrawn.
  const canCancel = toLeaveStatus(leave.status) === "pending";
  const appliedOn = leave.applied_on ?? leave.created_at;

  return (
    <li className="flex flex-wrap items-start gap-4 px-4 py-4 transition-colors hover:bg-muted/40">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-soft ring-1 ring-brand-100">
        <CalendarCheck className="size-4.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">
            {leave.leave_type_name?.trim() || "Leave request"}
          </p>
          <LeaveStatusBadge status={leave.status} />
        </div>

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

      {canCancel && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="shrink-0 rounded-lg text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="size-3.5" />
          Withdraw
        </Button>
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

export function MyLeaveView({
  /** Who signs this off — named so the screen sets the right expectation. */
  approverLabel,
}: {
  approverLabel: string;
}) {
  const [leaves, setLeaves] = React.useState<LeaveRequest[] | null>(null);
  const [leaveTypes, setLeaveTypes] = React.useState<LeaveType[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [isApplyOpen, setIsApplyOpen] = React.useState(false);
  const [cancelling, setCancelling] = React.useState<LeaveRequest | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([
      listLeaves({ scope: "mine" }),
      // Types only feed the apply form, so a failure there is not fatal.
      listLeaveTypes().catch(() => [] as LeaveType[]),
    ])
      .then(([loadedLeaves, loadedTypes]) => {
        if (cancelled) return;
        setLeaves(loadedLeaves);
        setLeaveTypes(loadedTypes);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading your leave."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function reload() {
    setReloadKey((key) => key + 1);
  }

  const pendingCount = (leaves ?? []).filter(
    (leave) => toLeaveStatus(leave.status) === "pending"
  ).length;

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            My Leave
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every request you have raised, and where each one stands.{" "}
            {approverLabel} signs these off.
          </p>
        </div>

        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/20">
            <CalendarCheck className="size-3.5" />
            {pendingCount} awaiting a decision
          </span>
        )}
      </div>

      <Panel
        title="Leave requests"
        description="Newest first, as your approver sees them."
        icon={CalendarCheck}
        action={
          <Button
            size="lg"
            onClick={() => setIsApplyOpen(true)}
            className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
          >
            <Plus className="size-4" />
            Apply for Leave
          </Button>
        }
      >
        {error ? (
          <SectionError message={error} onRetry={reload} />
        ) : !leaves ? (
          <RowsSkeleton />
        ) : leaves.length === 0 ? (
          <SectionEmpty
            icon={CalendarOff}
            title="No leave requested yet"
            description="When you apply for leave it shows up here with its approval status."
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsApplyOpen(true)}
              className="rounded-xl"
            >
              <Plus className="size-4" />
              Apply for Leave
            </Button>
          </SectionEmpty>
        ) : (
          <ul className="divide-y">
            {leaves.map((leave) => (
              <LeaveRow
                key={leave.id}
                leave={leave}
                onCancel={() => setCancelling(leave)}
              />
            ))}
          </ul>
        )}
      </Panel>

      <LeaveDialog
        open={isApplyOpen}
        onOpenChange={setIsApplyOpen}
        leaveTypes={leaveTypes}
        onSaved={() => {
          setIsApplyOpen(false);
          toast.success("Leave request sent", {
            description: `${approverLabel} will review it and update the status.`,
          });
          reload();
        }}
      />

      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Withdraw this leave request?"
        description={
          <>
            {cancelling
              ? `${cancelling.leave_type_name?.trim() || "This request"} for ${formatDate(cancelling.start_date)} – ${formatDate(cancelling.end_date)}`
              : "This request"}{" "}
            will be withdrawn. You can always apply again.
          </>
        }
        confirmLabel="Withdraw"
        pendingLabel="Withdrawing"
        errorTitle="Could not withdraw this request"
        onConfirm={async () => {
          if (!cancelling) return;
          await cancelLeave(cancelling.id);
          toast.success("Leave request withdrawn");
          setCancelling(null);
          reload();
        }}
      />
    </div>
  );
}
