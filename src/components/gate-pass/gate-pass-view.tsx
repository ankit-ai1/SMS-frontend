"use client";

import * as React from "react";
import {
  Check,
  Clock,
  DoorOpen,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Field, SectionEmpty, SectionError, fieldProps } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  GATE_PASS_STATUSES,
  approveGatePass,
  canCreateGatePass,
  canDecideGatePass,
  createGatePass,
  getUser,
  listGatePasses,
  listStudents,
  rejectGatePass,
  toGatePassStatus,
  toUserRole,
  type GatePass,
  type GatePassStatus,
  type Student,
} from "@/lib/api";
import { formatDate, initialsFrom } from "@/lib/format";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 350;
const RESULT_LIMIT = 6;
const ALL_STATUSES = "all";

/** One accent per status, shared by the badge and the row tint. */
const STATUS_META: Record<
  GatePassStatus,
  { label: string; chip: string; dot: string }
> = {
  pending: {
    label: "Pending",
    chip: "bg-gold-soft text-gold ring-gold/20",
    dot: "bg-gold",
  },
  approved: {
    label: "Approved",
    chip: "bg-brand-50 text-brand-700 ring-brand-100",
    dot: "bg-brand-500",
  },
  rejected: {
    label: "Rejected",
    chip: "bg-destructive/10 text-destructive ring-destructive/20",
    dot: "bg-destructive",
  },
};

/** "YYYY-MM-DD" for today in the browser's own calendar, not UTC. */
function todayInput(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

/** "11:30 am" — the only part of a timestamp a gate desk reads. */
function timeOf(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** `<input type="datetime-local">` wants local wall-clock, not an ISO string. */
function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function studentName(student: Student): string {
  return `${student.first_name} ${student.last_name}`.trim() || "Unnamed";
}

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

type FormErrors = Partial<Record<"student" | "reason" | "return", string>>;

function GatePassForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (pass: GatePass) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [results, setResults] = React.useState<Student[] | null>(null);
  const [picked, setPicked] = React.useState<Student | null>(null);

  const [reason, setReason] = React.useState("");
  const [guardian, setGuardian] = React.useState("");
  const [outTime, setOutTime] = React.useState(() => toLocalInput(new Date()));
  const [expectedReturn, setExpectedReturn] = React.useState("");

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const term = debounced.trim();

  React.useEffect(() => {
    if (!term) return;
    let cancelled = false;

    listStudents({ page: 1, per_page: RESULT_LIMIT, search: term })
      .then((loaded) => {
        if (!cancelled) setResults(loaded.items);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      });

    return () => {
      cancelled = true;
    };
  }, [term]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found: FormErrors = {};
    if (!picked) found.student = "Pick the student going out.";
    if (!reason.trim()) found.reason = "Say why they are leaving.";
    // The backend rejects this too; catching it here saves a round trip.
    if (
      expectedReturn &&
      outTime &&
      new Date(expectedReturn) < new Date(outTime)
    ) {
      found.return = "Return time cannot be before the out time.";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      const pass = await createGatePass({
        student_id: picked!.id,
        reason: reason.trim(),
        guardian_name: guardian.trim() || undefined,
        out_time: outTime ? new Date(outTime).toISOString() : undefined,
        expected_return: expectedReturn
          ? new Date(expectedReturn).toISOString()
          : undefined,
      });
      toast.success("Gate pass raised", {
        description: `${pass.student_name} — awaiting approval.`,
      });
      onCreated(pass);
    } catch (cause) {
      toast.error("Could not raise the gate pass", {
        description:
          cause instanceof Error
            ? cause.message
            : "Something went wrong. Please try again.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* ------------------------------ Student ------------------------------ */}
      <Field id="pass_student" label="Student" error={errors.student}>
        {picked ? (
          <div className="flex items-center gap-3 rounded-xl bg-brand-50 px-3.5 py-2.5 ring-1 ring-brand-100">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-[0.625rem] font-bold text-brand-700">
              {initialsFrom(studentName(picked))}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{studentName(picked)}</p>
              <p className="truncate text-xs text-muted-foreground tabular-nums">
                {picked.admission_number || "—"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
              aria-label="Pick a different student"
              onClick={() => {
                setPicked(null);
                setSearch("");
                setResults(null);
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                {...fieldProps("pass_student", errors.student)}
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setErrors((current) => ({ ...current, student: undefined }));
                }}
                placeholder="Search by name or admission number"
                disabled={isSubmitting}
                className="h-9 rounded-xl pl-9"
              />
            </div>

            {term && results && results.length > 0 && (
              <ul className="mt-2 divide-y overflow-hidden rounded-xl border">
                {results.map((student) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => setPicked(student)}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors outline-none hover:bg-brand-50/60 focus-visible:bg-brand-50/60"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[0.625rem] font-bold text-brand-700">
                        {initialsFrom(studentName(student))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {studentName(student)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground tabular-nums">
                          {student.admission_number || "—"}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {term && results && results.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                No student matches that.
              </p>
            )}
          </>
        )}
      </Field>

      <Field id="pass_reason" label="Reason" error={errors.reason}>
        <Textarea
          {...fieldProps("pass_reason", errors.reason)}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setErrors((current) => ({ ...current, reason: undefined }));
          }}
          placeholder="Dentist appointment"
          rows={2}
          disabled={isSubmitting}
          className="rounded-xl"
        />
      </Field>

      <Field
        id="pass_guardian"
        label="Collected by (optional)"
        hint="Who is picking the student up at the gate."
      >
        <Input
          id="pass_guardian"
          value={guardian}
          onChange={(event) => setGuardian(event.target.value)}
          placeholder="Papa Kumar"
          disabled={isSubmitting}
          className="h-9 rounded-xl"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pass_out" label="Going out at">
          <Input
            id="pass_out"
            type="datetime-local"
            value={outTime}
            onChange={(event) => setOutTime(event.target.value)}
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field
          id="pass_return"
          label="Back by (optional)"
          error={errors.return}
          hint={errors.return ? undefined : "Leave blank if not returning today."}
        >
          <Input
            {...fieldProps("pass_return", errors.return)}
            type="datetime-local"
            value={expectedReturn}
            min={outTime || undefined}
            onChange={(event) => {
              setExpectedReturn(event.target.value);
              setErrors((current) => ({ ...current, return: undefined }));
            }}
            disabled={isSubmitting}
            className="h-9 rounded-xl"
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
              Raising
            </>
          ) : (
            <>
              <Plus className="size-4" />
              Raise gate pass
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Rows                                    */
/* -------------------------------------------------------------------------- */

function GatePassRow({
  pass,
  canDecide,
  isBusy,
  onDecide,
}: {
  pass: GatePass;
  canDecide: boolean;
  isBusy: boolean;
  onDecide: (decision: "approve" | "reject") => void;
}) {
  const status = toGatePassStatus(pass.status) ?? "pending";
  const meta = STATUS_META[status];
  const placement =
    [pass.class_name?.trim(), pass.section_name?.trim()]
      .filter(Boolean)
      .join(" — ") || "Not enrolled this year";

  return (
    <li
      className={cn(
        "flex flex-wrap items-start gap-4 px-4 py-4 transition-colors hover:bg-muted/40",
        status === "pending" && "bg-gold-soft/25"
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-[0.7rem] font-bold text-brand-700 ring-1 ring-brand-100">
        {initialsFrom(pass.student_name)}
      </span>

      <div className="min-w-0 flex-1 basis-56">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">
            {pass.student_name || "—"}
          </p>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-medium ring-1",
              meta.chip
            )}
          >
            <span aria-hidden className={cn("size-1.5 rounded-full", meta.dot)} />
            {meta.label}
          </span>
        </div>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {placement}
        </p>

        <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {pass.reason || "No reason recorded"}
        </p>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-muted-foreground tabular-nums">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            Out {timeOf(pass.out_time) || "—"}
          </span>
          {pass.expected_return && <span>Back by {timeOf(pass.expected_return)}</span>}
          {pass.guardian_name?.trim() && (
            <span>With {pass.guardian_name.trim()}</span>
          )}
          <span className="hidden sm:inline">{formatDate(pass.out_time)}</span>
        </p>

        {/* Who raised it and who signed it off — the audit trail a gate desk
            is asked for when a parent disputes a pass. */}
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.625rem] text-muted-foreground/80">
          {pass.created_by_name?.trim() && (
            <span>Raised by {pass.created_by_name.trim()}</span>
          )}
          {status !== "pending" && pass.approved_by_name?.trim() && (
            <span>
              {status === "approved" ? "Approved" : "Rejected"} by{" "}
              {pass.approved_by_name.trim()}
              {pass.decided_at ? ` at ${timeOf(pass.decided_at)}` : ""}
            </span>
          )}
        </p>
      </div>

      {canDecide && status === "pending" && (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => onDecide("reject")}
            className="rounded-lg text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-3.5" />
            Reject
          </Button>
          <Button
            size="sm"
            disabled={isBusy}
            onClick={() => onDecide("approve")}
            className="rounded-lg shadow-brand transition-all hover:bg-brand-700"
          >
            {isBusy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Approve
          </Button>
        </div>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function GatePassView() {
  const [date, setDate] = React.useState(todayInput);
  const [status, setStatus] = React.useState<GatePassStatus | typeof ALL_STATUSES>(
    ALL_STATUSES
  );

  const [passes, setPasses] = React.useState<GatePass[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  // localStorage only exists on the client, so gate on a mount signal that is
  // identical between the prerendered markup and the first client render.
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const role = isClient ? toUserRole(getUser()?.role) : null;
  const mayCreate = canCreateGatePass(role);
  const mayDecide = canDecideGatePass(role);

  const requestKey = `${date}|${status}|${reloadKey}`;

  React.useEffect(() => {
    let cancelled = false;

    listGatePasses({
      date: date || null,
      status: status === ALL_STATUSES ? "" : status,
    })
      .then((loaded) => {
        if (cancelled) return;
        setPasses(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading gate passes."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, date, status]);

  async function handleDecide(pass: GatePass, decision: "approve" | "reject") {
    if (busyId) return;
    setBusyId(String(pass.id));
    try {
      // Every write answers with the whole pass, so the row is replaced in
      // place — no second request just to see the new status.
      const updated =
        decision === "approve"
          ? await approveGatePass(pass.id)
          : await rejectGatePass(pass.id);

      setPasses((current) =>
        (current ?? []).map((entry) => (entry.id === pass.id ? updated : entry))
      );
      toast.success(
        decision === "approve" ? "Gate pass approved" : "Gate pass rejected",
        { description: pass.student_name }
      );
    } catch (cause) {
      toast.error(
        decision === "approve"
          ? "Could not approve the pass"
          : "Could not reject the pass",
        {
          description:
            cause instanceof Error
              ? cause.message
              : "Something went wrong. Please try again.",
        }
      );
      // A 409 means somebody else decided it first — reload to catch up.
      setReloadKey((key) => key + 1);
    } finally {
      setBusyId(null);
    }
  }

  const pending = (passes ?? []).filter(
    (pass) => toGatePassStatus(pass.status) === "pending"
  );

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Gate Passes
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {mayDecide
              ? "Students leaving early, and the ones waiting on your approval."
              : "Students leaving early, and where each request stands."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pending.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-gold-soft px-2.5 py-1.5 text-xs font-medium text-gold ring-1 ring-gold/20">
              <ShieldCheck className="size-3.5" />
              {pending.length} awaiting approval
            </span>
          )}

          {mayCreate && (
            <Button
              size="lg"
              onClick={() => setIsFormOpen(true)}
              className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
            >
              <Plus className="size-4" />
              New Gate Pass
            </Button>
          )}
        </div>
      </div>

      <Panel
        title="Gate register"
        description="Awaiting approval first, then the most recent."
        icon={DoorOpen}
      >
        {/* ----------------------------- Filters ---------------------------- */}
        <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-end">
          <Field id="pass_date" label="Date">
            <Input
              id="pass_date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-9 w-full rounded-xl sm:w-44"
            />
          </Field>

          <Field id="pass_status" label="Status">
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as GatePassStatus | typeof ALL_STATUSES)
              }
            >
              <SelectTrigger id="pass_status" className="h-9 w-full rounded-xl sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
                {GATE_PASS_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_META[value].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {error ? (
          <SectionError
            message={error}
            onRetry={() => {
              setError(null);
              setReloadKey((key) => key + 1);
            }}
          />
        ) : passes === null ? (
          <ul className="divide-y">
            {Array.from({ length: 3 }, (_, index) => (
              <li key={index} className="flex items-start gap-4 px-4 py-4">
                <Skeleton className="size-10 shrink-0 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-44 max-w-[55%] rounded-md" />
                  <Skeleton className="h-3 w-64 max-w-[75%] rounded-md" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : passes.length === 0 ? (
          <SectionEmpty
            icon={DoorOpen}
            title="No gate passes"
            description={`Nothing raised for ${formatDate(date)}.`}
          >
            {mayCreate && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsFormOpen(true)}
                className="rounded-xl"
              >
                <Plus className="size-4" />
                New Gate Pass
              </Button>
            )}
          </SectionEmpty>
        ) : (
          <ul className="divide-y">
            {passes.map((pass) => (
              <GatePassRow
                key={pass.id}
                pass={pass}
                canDecide={mayDecide}
                isBusy={busyId === String(pass.id)}
                onDecide={(decision) => void handleDecide(pass, decision)}
              />
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise a gate pass</DialogTitle>
            <DialogDescription>
              It goes to the principal for approval before the student may leave.
            </DialogDescription>
          </DialogHeader>
          <GatePassForm
            onCancel={() => setIsFormOpen(false)}
            onCreated={(pass) => {
              setIsFormOpen(false);
              // A pass raised for another day would not show under this
              // filter, so jump the list to the day it was raised for.
              const raisedOn = new Date(pass.out_time);
              if (!Number.isNaN(raisedOn.getTime())) {
                setDate(
                  `${raisedOn.getFullYear()}-${String(
                    raisedOn.getMonth() + 1
                  ).padStart(2, "0")}-${String(raisedOn.getDate()).padStart(2, "0")}`
                );
              }
              setReloadKey((key) => key + 1);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
