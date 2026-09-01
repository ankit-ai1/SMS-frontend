"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";

import { leaveDayCount } from "@/components/teacher/leave-meta";
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
import { createLeave, type LeaveType } from "@/lib/api";

const TODAY_ISO = new Date().toISOString().slice(0, 10);

/** Applying for leave: pick a type, a date range, and say why. */
export function LeaveDialog({
  open,
  onOpenChange,
  leaveTypes,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveTypes: LeaveType[];
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
          <DialogDescription>
            Your request goes to the office for approval. You can withdraw it
            any time before it is decided.
          </DialogDescription>
        </DialogHeader>

        {/* Remounted with the dialog, so the initialisers double as the reset. */}
        {open && (
          <LeaveForm
            leaveTypes={leaveTypes}
            onCancel={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LeaveForm({
  leaveTypes,
  onCancel,
  onSaved,
}: {
  leaveTypes: LeaveType[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [leaveTypeId, setLeaveTypeId] = React.useState("");
  const [startDate, setStartDate] = React.useState(TODAY_ISO);
  const [endDate, setEndDate] = React.useState(TODAY_ISO);
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");

  const days = leaveDayCount(startDate, endDate);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (!leaveTypeId) {
      setError("Choose a leave type.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Both a start and an end date are required.");
      return;
    }
    if (endDate < startDate) {
      setError("The end date must be on or after the start date.");
      return;
    }
    if (!reason.trim()) {
      setError("A short reason is required.");
      return;
    }

    setPending(true);
    try {
      await createLeave({
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
      });
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not send this request. Please try again."
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field id="leave_type" label="Leave type" error={error}>
        <Select
          value={leaveTypeId}
          onValueChange={(value) => {
            setLeaveTypeId(value);
            setError("");
          }}
          disabled={pending || leaveTypes.length === 0}
        >
          <SelectTrigger
            {...fieldProps("leave_type", error)}
            className="h-10 w-full rounded-xl"
          >
            <SelectValue
              placeholder={
                leaveTypes.length === 0
                  ? "No leave types set up"
                  : "Select a leave type"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {leaveTypes.map((type) => (
              <SelectItem key={type.id} value={String(type.id)}>
                {type.name}
                {type.max_days_per_year != null &&
                  ` · up to ${type.max_days_per_year} days a year`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="leave_start" label="First day">
          <Input
            {...fieldProps("leave_start")}
            type="date"
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value);
              setError("");
            }}
            disabled={pending}
            className="h-10 rounded-xl"
          />
        </Field>
        <Field
          id="leave_end"
          label="Last day"
          hint={
            days !== null
              ? `${days} ${days === 1 ? "day" : "days"} of leave`
              : undefined
          }
        >
          <Input
            {...fieldProps("leave_end")}
            type="date"
            min={startDate || undefined}
            value={endDate}
            onChange={(event) => {
              setEndDate(event.target.value);
              setError("");
            }}
            disabled={pending}
            className="h-10 rounded-xl"
          />
        </Field>
      </div>

      <Field id="leave_reason" label="Reason">
        <Textarea
          {...fieldProps("leave_reason")}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError("");
          }}
          disabled={pending}
          rows={3}
          placeholder="A line on why you need these days."
          className="rounded-xl"
        />
      </Field>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="rounded-xl"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending
            </>
          ) : (
            <>
              <Check className="size-4" />
              Send Request
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
