"use client";

import * as React from "react";
import { BadgePercent, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { FEE_DISCOUNT_TYPE_LABELS, toAmount } from "@/components/fees/fee-meta";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  FEE_DISCOUNT_TYPES,
  createFeeDiscount,
  type FeeDiscount,
  type FeeDiscountType,
} from "@/lib/api";
import { formatCurrency, humanizeToken } from "@/lib/format";

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

type Values = {
  name: string;
  type: "" | FeeDiscountType;
  is_percentage: boolean;
  value: string;
};
type Errors = Partial<Record<keyof Values, string>>;

function DiscountForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = React.useState<Values>({
    name: "",
    type: "",
    is_percentage: false,
    value: "",
  });
  const [errors, setErrors] = React.useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const value = Number(values.value);
    const found: Errors = {};
    if (!values.name.trim()) found.name = "Name is required.";
    if (!values.type) found.type = "Select a discount type.";
    if (!values.value.trim()) {
      found.value = "Value is required.";
    } else if (!Number.isFinite(value) || value <= 0) {
      found.value = "Enter a value greater than zero.";
    } else if (values.is_percentage && value > 100) {
      found.value = "A percentage cannot be above 100.";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      await createFeeDiscount({
        name: values.name.trim(),
        type: values.type as FeeDiscountType,
        is_percentage: values.is_percentage,
        value,
      });
      toast.success("Discount added", {
        description: `${values.name.trim()} can now be applied to allocations.`,
      });
      onSaved();
    } catch (error) {
      toast.error("Could not add the discount", {
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="space-y-4">
        <Field id="discount_name" label="Name" error={errors.name}>
          <Input
            {...fieldProps("discount_name", errors.name)}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Sibling discount"
            autoComplete="off"
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field id="discount_type" label="Type" error={errors.type}>
          <Select
            value={values.type}
            onValueChange={(value) => set("type", value as FeeDiscountType)}
            disabled={isSubmitting}
          >
            <SelectTrigger
              {...fieldProps("discount_type", errors.type)}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {FEE_DISCOUNT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {FEE_DISCOUNT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/25 p-3.5">
          <div>
            <Label htmlFor="is_percentage" className="text-sm font-medium">
              Percentage discount
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Off: the value is a flat rupee amount.
            </p>
          </div>
          <Switch
            id="is_percentage"
            checked={values.is_percentage}
            onCheckedChange={(checked) => set("is_percentage", checked)}
            disabled={isSubmitting}
          />
        </div>

        <Field
          id="discount_value"
          label={values.is_percentage ? "Value (%)" : "Value (₹)"}
          error={errors.value}
        >
          <Input
            {...fieldProps("discount_value", errors.value)}
            type="number"
            min={0}
            max={values.is_percentage ? 100 : undefined}
            step="1"
            inputMode="numeric"
            value={values.value}
            onChange={(e) => set("value", e.target.value)}
            placeholder={values.is_percentage ? "10" : "2500"}
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
          ) : (
            "Add Discount"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Panel                                    */
/* -------------------------------------------------------------------------- */

/** "10%" or "₹2,500", depending on how the discount was set up. */
export function discountValueLabel(discount: FeeDiscount): string {
  const value = toAmount(discount.value);
  return discount.is_percentage ? `${value}%` : formatCurrency(value);
}

export function DiscountsPanel({
  discounts,
  error,
  onRetry,
  onChanged,
}: {
  /** Null while loading. */
  discounts: FeeDiscount[] | null;
  error: string | null;
  onRetry: () => void;
  onChanged: () => void;
}) {
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  return (
    <>
      <Panel
        title="Discounts"
        description="Concessions that can be applied when a fee is allocated."
        icon={BadgePercent}
        action={
          <Button
            size="lg"
            onClick={() => setIsFormOpen(true)}
            className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
          >
            <Plus className="size-4" />
            Add Discount
          </Button>
        }
      >
        {error ? (
          <SectionError message={error} onRetry={onRetry} />
        ) : discounts === null ? (
          <ul className="divide-y">
            {Array.from({ length: 2 }, (_, index) => (
              <li key={index} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="size-9 shrink-0 rounded-xl" />
                <Skeleton className="h-4 w-40 max-w-full rounded-md" />
                <Skeleton className="ml-auto h-4 w-16 rounded-md" />
              </li>
            ))}
          </ul>
        ) : discounts.length === 0 ? (
          <SectionEmpty
            icon={BadgePercent}
            title="No discounts yet"
            description="Add a sibling, merit or staff-ward concession to apply it when allocating fees."
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsFormOpen(true)}
              className="rounded-xl"
            >
              <Plus className="size-4" />
              Add Discount
            </Button>
          </SectionEmpty>
        ) : (
          <ul className="divide-y">
            {discounts.map((discount) => (
              <li
                key={discount.id}
                className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <BadgePercent className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{discount.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {FEE_DISCOUNT_TYPE_LABELS[discount.type] ??
                      humanizeToken(discount.type)}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {discountValueLabel(discount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a discount</DialogTitle>
            <DialogDescription>
              Discounts are chosen per student when a fee is allocated.
            </DialogDescription>
          </DialogHeader>
          <DiscountForm
            onCancel={() => setIsFormOpen(false)}
            onSaved={() => {
              setIsFormOpen(false);
              onChanged();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
