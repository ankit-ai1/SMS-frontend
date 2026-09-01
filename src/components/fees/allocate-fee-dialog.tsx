"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { toAmount } from "@/components/fees/fee-meta";
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
  createFeeAllocation,
  type FeeDiscount,
  type FeeStructure,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";

/** Radix rejects an empty item value, so "no discount" needs a sentinel. */
const NO_DISCOUNT = "__none__";

export type AllocateTarget = {
  enrollmentId: string | number;
  studentName: string;
  /** Structure ids this student already has, so they are not charged twice. */
  allocatedStructureIds: string[];
};

function AllocateForm({
  target,
  structures,
  discounts,
  onCancel,
  onAllocated,
}: {
  target: AllocateTarget;
  structures: FeeStructure[];
  discounts: FeeDiscount[];
  onCancel: () => void;
  onAllocated: () => void;
}) {
  const [structureId, setStructureId] = React.useState("");
  const [discountId, setDiscountId] = React.useState(NO_DISCOUNT);
  const [dueDate, setDueDate] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const available = structures.filter(
    (structure) => !target.allocatedStructureIds.includes(String(structure.id))
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!structureId) {
      setError("Select a fee to allot.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createFeeAllocation({
        enrollment_id: target.enrollmentId,
        fee_structure_id: structureId,
        ...(discountId !== NO_DISCOUNT ? { discount_id: discountId } : {}),
        ...(dueDate ? { due_date: dueDate } : {}),
      });

      toast.success("Fee allotted", {
        description: `${formatCurrency(toAmount(result?.amount_due))} due from ${target.studentName}.`,
      });
      onAllocated();
    } catch (cause) {
      toast.error("Could not allot the fee", {
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
      <div className="space-y-4">
        <Field id="allocate_structure" label="Fee" error={error}>
          <Select
            value={structureId}
            onValueChange={(value) => {
              setStructureId(value);
              setError(undefined);
            }}
            disabled={isSubmitting || available.length === 0}
          >
            <SelectTrigger
              {...fieldProps("allocate_structure", error)}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue
                placeholder={
                  structures.length === 0
                    ? "No fee structures set up"
                    : available.length === 0
                      ? "Every fee is already allotted"
                      : "Select a fee"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {available.map((structure) => (
                <SelectItem key={structure.id} value={String(structure.id)}>
                  {structure.category_name?.trim() || "Fee"} ·{" "}
                  {formatCurrency(toAmount(structure.amount))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          id="allocate_discount"
          label="Discount (optional)"
          hint="The backend applies the concession to the amount due."
        >
          <Select
            value={discountId}
            onValueChange={setDiscountId}
            disabled={isSubmitting}
          >
            <SelectTrigger
              {...fieldProps("allocate_discount")}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_DISCOUNT}>
                <span className="text-muted-foreground">No discount</span>
              </SelectItem>
              {discounts.map((discount) => (
                <SelectItem key={discount.id} value={String(discount.id)}>
                  {discount.name} ·{" "}
                  {discount.is_percentage
                    ? `${toAmount(discount.value)}%`
                    : formatCurrency(toAmount(discount.value))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="allocate_due_date" label="Due Date (optional)">
          <Input
            {...fieldProps("allocate_due_date")}
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            disabled={isSubmitting}
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
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || available.length === 0}
          className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Allotting
            </>
          ) : (
            "Allot Fee"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Allots one fee to one student. Bulk generation cannot apply a concession, so
 * this is the only route by which a discount reaches an allocation.
 */
export function AllocateFeeDialog({
  target,
  structures,
  discounts,
  onOpenChange,
  onAllocated,
}: {
  /** Null when closed. */
  target: AllocateTarget | null;
  structures: FeeStructure[];
  discounts: FeeDiscount[];
  onOpenChange: (open: boolean) => void;
  onAllocated: () => void;
}) {
  return (
    <Dialog
      open={target != null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Allot a fee</DialogTitle>
          <DialogDescription>
            {target
              ? `Charge one more fee to ${target.studentName}, with an optional discount.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {/* Mounted only while open, so the initialisers double as the reset. */}
        {target && (
          <AllocateForm
            target={target}
            structures={structures}
            discounts={discounts}
            onCancel={() => onOpenChange(false)}
            onAllocated={onAllocated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
