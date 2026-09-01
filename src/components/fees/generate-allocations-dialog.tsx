"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import {
  generateFeeAllocations,
  type AcademicYear,
  type SchoolClass,
} from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";

/** Radix rejects an empty item value, so "every class" needs a sentinel. */
const ALL_CLASSES = "all";

type Scope = { classId: string; dueDate: string };

function ScopeForm({
  year,
  classes,
  onCancel,
  onReady,
}: {
  year: AcademicYear;
  classes: SchoolClass[];
  onCancel: () => void;
  onReady: (scope: Scope) => void;
}) {
  const [classId, setClassId] = React.useState(ALL_CLASSES);
  const [dueDate, setDueDate] = React.useState("");

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onReady({ classId, dueDate });
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
          <Sparkles className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Academic year</p>
            <p className="truncate text-sm font-medium">
              {year.name?.trim() || `Year ${year.id}`}
            </p>
          </div>
        </div>

        <Field
          id="generate_class"
          label="Class"
          hint="Leave as all classes to allot fees across the whole school."
        >
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger
              {...fieldProps("generate_class")}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLASSES}>All classes</SelectItem>
              {classes.map((schoolClass) => (
                <SelectItem key={schoolClass.id} value={String(schoolClass.id)}>
                  {schoolClass.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="generate_due_date" label="Due Date (optional)">
          <Input
            {...fieldProps("generate_due_date")}
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="h-9 rounded-xl sm:max-w-[calc(50%-0.5rem)]"
          />
        </Field>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="rounded-xl"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="lg"
          className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
        >
          Continue
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Two steps on purpose: this writes a row for every enrolled student against
 * every matching fee structure, so the scope is confirmed before it runs.
 */
export function GenerateAllocationsDialog({
  open,
  onOpenChange,
  year,
  classes,
  onGenerated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: AcademicYear;
  classes: SchoolClass[];
  onGenerated: () => void;
}) {
  const [pending, setPending] = React.useState<Scope | null>(null);

  const scopeLabel =
    pending && pending.classId !== ALL_CLASSES
      ? (classes.find((entry) => String(entry.id) === pending.classId)?.name ??
        "the selected class")
      : "every class";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate allocations</DialogTitle>
            <DialogDescription>
              Allot every matching fee structure to every enrolled student.
            </DialogDescription>
          </DialogHeader>

          {/* Mounted only while open, so the initialisers double as the reset. */}
          {open && (
            <ScopeForm
              year={year}
              classes={classes}
              onCancel={() => onOpenChange(false)}
              onReady={(scope) => {
                onOpenChange(false);
                setPending(scope);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pending != null}
        onOpenChange={(next) => {
          if (!next) setPending(null);
        }}
        title="Generate allocations?"
        description={
          <>
            Fees will be allotted to every enrolled student in {scopeLabel} for{" "}
            {year.name?.trim() || `year ${year.id}`}
            {pending?.dueDate ? `, due ${formatDate(pending.dueDate)}` : ""}.
            Students who already have an allocation are not charged twice.
          </>
        }
        confirmLabel="Generate"
        pendingLabel="Generating"
        errorTitle="Could not generate allocations"
        onConfirm={async () => {
          if (!pending) return;
          const result = await generateFeeAllocations({
            academic_year_id: year.id,
            ...(pending.classId !== ALL_CLASSES
              ? { class_id: pending.classId }
              : {}),
            ...(pending.dueDate ? { due_date: pending.dueDate } : {}),
          });

          const created = Number(result?.allocations_created ?? 0);
          toast.success(
            created === 1
              ? "1 allocation created"
              : `${formatNumber(created)} allocations created`,
            {
              description:
                created === 0
                  ? "Every matching student already had these fees allotted."
                  : "Students can now be collected from in the roster below.",
            }
          );
          setPending(null);
          onGenerated();
        }}
      />
    </>
  );
}
