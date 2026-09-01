"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { HOLIDAY_TYPE_LABELS } from "@/components/calendar/calendar-meta";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { HOLIDAY_TYPES, createHoliday, type HolidayType } from "@/lib/api";

type Values = {
  name: string;
  description: string;
  holiday_type: "" | HolidayType;
  start_date: string;
  end_date: string;
  is_recurring: boolean;
};

type Errors = Partial<Record<keyof Values, string>>;

function HolidayForm({
  academicYearId,
  defaultDate,
  onCancel,
  onSaved,
}: {
  academicYearId: string | number;
  defaultDate: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = React.useState<Values>({
    name: "",
    description: "",
    holiday_type: "",
    start_date: defaultDate,
    end_date: defaultDate,
    is_recurring: false,
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

    const found: Errors = {};
    if (!values.name.trim()) found.name = "Name is required.";
    if (!values.holiday_type) found.holiday_type = "Select a holiday type.";
    if (!values.start_date) found.start_date = "Start date is required.";
    if (!values.end_date) {
      found.end_date = "End date is required.";
    } else if (values.start_date && values.end_date < values.start_date) {
      // ISO dates compare correctly as strings.
      found.end_date = "The end date cannot be before the start date.";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      await createHoliday({
        academic_year_id: academicYearId,
        name: values.name.trim(),
        holiday_type: values.holiday_type as HolidayType,
        start_date: values.start_date,
        end_date: values.end_date,
        is_recurring: values.is_recurring,
        ...(values.description.trim()
          ? { description: values.description.trim() }
          : {}),
      });

      toast.success("Holiday added", {
        description: `${values.name.trim()} is now on the calendar.`,
      });
      onSaved();
    } catch (error) {
      toast.error("Could not add the holiday", {
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
      <div className="-mx-1 max-h-[55vh] space-y-4 overflow-y-auto px-1">
        <Field id="holiday_name" label="Name" error={errors.name}>
          <Input
            {...fieldProps("holiday_name", errors.name)}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Diwali"
            autoComplete="off"
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field id="holiday_type" label="Type" error={errors.holiday_type}>
          <Select
            value={values.holiday_type}
            onValueChange={(value) => set("holiday_type", value as HolidayType)}
            disabled={isSubmitting}
          >
            <SelectTrigger
              {...fieldProps("holiday_type", errors.holiday_type)}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {HOLIDAY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {HOLIDAY_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="holiday_start_date"
            label="Start Date"
            error={errors.start_date}
          >
            <Input
              {...fieldProps("holiday_start_date", errors.start_date)}
              type="date"
              value={values.start_date}
              onChange={(e) => {
                set("start_date", e.target.value);
                // A one-day holiday is the common case: keep the end in step
                // until the user deliberately moves it.
                if (values.end_date < e.target.value) {
                  set("end_date", e.target.value);
                }
              }}
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>

          <Field id="holiday_end_date" label="End Date" error={errors.end_date}>
            <Input
              {...fieldProps("holiday_end_date", errors.end_date)}
              type="date"
              min={values.start_date || undefined}
              value={values.end_date}
              onChange={(e) => set("end_date", e.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/25 p-3.5">
          <div>
            <Label htmlFor="holiday_recurring" className="text-sm font-medium">
              Recurring
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Falls on the same dates every academic year.
            </p>
          </div>
          <Switch
            id="holiday_recurring"
            checked={values.is_recurring}
            onCheckedChange={(checked) => set("is_recurring", checked)}
            disabled={isSubmitting}
          />
        </div>

        <Field id="holiday_description" label="Description (optional)">
          <Textarea
            id="holiday_description"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            disabled={isSubmitting}
            className="min-h-20 rounded-xl"
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
            "Add Holiday"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function HolidayDialog({
  open,
  onOpenChange,
  academicYearId,
  defaultDate,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYearId: string | number;
  defaultDate: string;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a holiday</DialogTitle>
          <DialogDescription>
            Mark days the school is closed. Holidays show across the calendar.
          </DialogDescription>
        </DialogHeader>

        {/* Mounted only while open, so the initialisers double as the reset. */}
        {open && (
          <HolidayForm
            academicYearId={academicYearId}
            defaultDate={defaultDate}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false);
              onSaved();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
