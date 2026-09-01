"use client";

import * as React from "react";
import { IndianRupee, Loader2, Plus, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { toAmount } from "@/components/fees/fee-meta";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Field, SectionEmpty, SectionError, fieldProps } from "@/components/shared/form-field";
import { Panel, RowActions } from "@/components/shared/panel";
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
import {
  createFeeStructure,
  deleteFeeStructure,
  listFeeStructures,
  sameId,
  updateFeeStructure,
  type FeeCategory,
  type FeeStructure,
  type SchoolClass,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";

/** Radix rejects an empty item value, so "no filter" needs a sentinel. */
const ALL_CLASSES = "all";

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

type Values = { fee_category_id: string; class_id: string; amount: string };
type Errors = Partial<Record<keyof Values, string>>;

function StructureForm({
  structure,
  categories,
  classes,
  academicYearId,
  onCancel,
  onSaved,
}: {
  /** Null in create mode. Only the amount is editable afterwards. */
  structure: FeeStructure | null;
  categories: FeeCategory[];
  classes: SchoolClass[];
  academicYearId: string | number;
  onCancel: () => void;
  onSaved: () => void;
}) {
  // Mounted fresh each time the dialog opens, so the initialiser is the reset.
  const [values, setValues] = React.useState<Values>({
    fee_category_id: structure ? String(structure.fee_category_id) : "",
    class_id: structure ? String(structure.class_id) : "",
    amount: structure ? String(toAmount(structure.amount)) : "",
  });
  const [errors, setErrors] = React.useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isEdit = structure !== null;

  function set<K extends keyof Values>(key: K, value: string) {
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
    if (!isEdit && !values.fee_category_id) {
      found.fee_category_id = "Select a fee category.";
    }
    if (!isEdit && !values.class_id) found.class_id = "Select a class.";
    if (!values.amount.trim()) {
      found.amount = "Amount is required.";
    } else if (!Number.isFinite(amount) || amount < 0) {
      found.amount = "Enter a valid amount.";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      if (structure) {
        await updateFeeStructure(structure.id, { amount });
        toast.success("Fee structure updated", {
          description: `Now ${formatCurrency(amount)}.`,
        });
      } else {
        await createFeeStructure({
          fee_category_id: values.fee_category_id,
          class_id: values.class_id,
          academic_year_id: academicYearId,
          amount,
        });
        toast.success("Fee structure added", {
          description: `${formatCurrency(amount)} will be charged for this class.`,
        });
      }
      onSaved();
    } catch (error) {
      toast.error(
        structure
          ? "Could not save the fee structure"
          : "Could not add the fee structure",
        {
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
        }
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="space-y-4">
        <Field
          id="structure_category"
          label="Fee Category"
          error={errors.fee_category_id}
          hint={
            isEdit ? "The category and class cannot be changed." : undefined
          }
        >
          <Select
            value={values.fee_category_id}
            onValueChange={(value) => set("fee_category_id", value)}
            disabled={isSubmitting || isEdit || categories.length === 0}
          >
            <SelectTrigger
              {...fieldProps("structure_category", errors.fee_category_id)}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue
                placeholder={
                  categories.length === 0
                    ? "Add a category first"
                    : "Select a category"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="structure_class" label="Class" error={errors.class_id}>
          <Select
            value={values.class_id}
            onValueChange={(value) => set("class_id", value)}
            disabled={isSubmitting || isEdit || classes.length === 0}
          >
            <SelectTrigger
              {...fieldProps("structure_class", errors.class_id)}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue
                placeholder={
                  classes.length === 0 ? "No classes set up" : "Select a class"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {classes.map((schoolClass) => (
                <SelectItem key={schoolClass.id} value={String(schoolClass.id)}>
                  {schoolClass.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="structure_amount" label="Amount (₹)" error={errors.amount}>
          <Input
            {...fieldProps("structure_amount", errors.amount)}
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            value={values.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="25000"
            autoComplete="off"
            disabled={isSubmitting}
            className="h-9 rounded-xl tabular-nums"
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
              Saving
            </>
          ) : structure ? (
            "Save Amount"
          ) : (
            "Add Structure"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Panel                                    */
/* -------------------------------------------------------------------------- */

export function StructuresPanel({
  categories,
  classes,
  academicYearId,
}: {
  categories: FeeCategory[];
  classes: SchoolClass[];
  academicYearId: string | number;
}) {
  const [classFilter, setClassFilter] = React.useState(ALL_CLASSES);
  const [structures, setStructures] = React.useState<FeeStructure[] | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FeeStructure | null>(null);
  const [deleting, setDeleting] = React.useState<FeeStructure | null>(null);

  // Identifies the request the filter asks for, so a stale response cannot win.
  const requestKey = `${classFilter}|${academicYearId}|${reloadKey}`;

  React.useEffect(() => {
    let cancelled = false;

    listFeeStructures({
      academic_year_id: academicYearId,
      class_id: classFilter === ALL_CLASSES ? "" : classFilter,
    })
      .then((loaded) => {
        if (cancelled) return;
        setStructures(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading fee structures."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, classFilter, academicYearId]);

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  function labelFor(structure: FeeStructure) {
    const category =
      structure.category_name?.trim() ||
      categories.find((entry) => sameId(entry.id, structure.fee_category_id))
        ?.name ||
      "Fee";
    const className =
      structure.class_name?.trim() ||
      classes.find((entry) => sameId(entry.id, structure.class_id))?.name ||
      "";
    return { category, className };
  }

  return (
    <>
      <Panel
        title="Fee Structures"
        description="What each class is charged, per category, this academic year."
        icon={ReceiptText}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger
                aria-label="Filter by class"
                className="h-9 w-40 rounded-xl"
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

            <Button
              size="lg"
              onClick={() => {
                setEditing(null);
                setIsFormOpen(true);
              }}
              className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
            >
              <Plus className="size-4" />
              Add Structure
            </Button>
          </div>
        }
      >
        {error ? (
          <SectionError
            message={error}
            onRetry={() => {
              setError(null);
              refresh();
            }}
          />
        ) : structures === null ? (
          <ul className="divide-y">
            {Array.from({ length: 3 }, (_, index) => (
              <li key={index} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="size-9 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 max-w-full rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
                <Skeleton className="h-4 w-24 rounded-md" />
              </li>
            ))}
          </ul>
        ) : structures.length === 0 ? (
          <SectionEmpty
            icon={ReceiptText}
            title="No fee structures yet"
            description="Set an amount for a class and category — that is what allocations are generated from."
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setEditing(null);
                setIsFormOpen(true);
              }}
              className="rounded-xl"
            >
              <Plus className="size-4" />
              Add Structure
            </Button>
          </SectionEmpty>
        ) : (
          <ul className="divide-y">
            {structures.map((structure) => {
              const { category, className } = labelFor(structure);

              return (
                <li
                  key={structure.id}
                  className="group/row flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <IndianRupee className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{category}</p>
                    {className && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {className}
                      </p>
                    )}
                  </div>

                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatCurrency(toAmount(structure.amount))}
                  </p>

                  <RowActions
                    label={`${category}${className ? ` for ${className}` : ""}`}
                    onEdit={() => {
                      setEditing(structure);
                      setIsFormOpen(true);
                    }}
                    onDelete={() => setDeleting(structure)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit fee amount" : "Add a fee structure"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Change what this class is charged for this category."
                : "Set what a class is charged for one fee category."}
            </DialogDescription>
          </DialogHeader>
          <StructureForm
            structure={editing}
            categories={categories}
            classes={classes}
            academicYearId={academicYearId}
            onCancel={() => setIsFormOpen(false)}
            onSaved={() => {
              setIsFormOpen(false);
              refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        title="Remove this fee structure?"
        description={
          <>
            {deleting ? labelFor(deleting).category : "This fee"} will no longer
            be charged to this class. Allocations already generated from it are
            not affected.
          </>
        }
        confirmLabel="Remove structure"
        pendingLabel="Removing"
        errorTitle="Could not remove the fee structure"
        onConfirm={async () => {
          if (!deleting) return;
          await deleteFeeStructure(deleting.id);
          toast.success("Fee structure removed");
          setDeleting(null);
          refresh();
        }}
      />
    </>
  );
}
