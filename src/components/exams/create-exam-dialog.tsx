"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Field, fieldProps } from "@/components/shared/form-field";
import { LookupSelect } from "@/components/shared/lookup-select";
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
  createExam,
  createExamType,
  type AcademicYear,
  type ExamType,
  type Term,
} from "@/lib/api";

/** Radix rejects an empty item value, so "no term" needs a sentinel. */
const NO_TERM = "__none__";

type Values = {
  name: string;
  exam_type_id: string;
  term_id: string;
  start_date: string;
  end_date: string;
};

type Errors = Partial<Record<keyof Values, string>>;

function ExamForm({
  year,
  terms,
  examTypes,
  onCancel,
  onSaved,
}: {
  year: AcademicYear;
  terms: Term[];
  examTypes: ExamType[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = React.useState<Values>({
    name: "",
    exam_type_id: "",
    term_id: NO_TERM,
    start_date: "",
    end_date: "",
  });
  const [errors, setErrors] = React.useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function set<K extends keyof Values>(key: K, value: string) {
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
    if (!values.exam_type_id) found.exam_type_id = "Select an exam type.";
    if (
      values.start_date &&
      values.end_date &&
      values.end_date < values.start_date
    ) {
      // ISO dates compare correctly as strings.
      found.end_date = "The end date cannot be before the start date.";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      await createExam({
        academic_year_id: year.id,
        exam_type_id: values.exam_type_id,
        name: values.name.trim(),
        ...(values.term_id !== NO_TERM ? { term_id: values.term_id } : {}),
        ...(values.start_date ? { start_date: values.start_date } : {}),
        ...(values.end_date ? { end_date: values.end_date } : {}),
      });

      toast.success("Exam created", {
        description: `${values.name.trim()} is ready for subjects to be added.`,
      });
      onSaved();
    } catch (error) {
      toast.error("Could not create the exam", {
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
        <Field id="exam_name" label="Name" error={errors.name}>
          <Input
            {...fieldProps("exam_name", errors.name)}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Half Yearly Examination"
            autoComplete="off"
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field id="exam_type_id" label="Exam Type" error={errors.exam_type_id}>
          <LookupSelect
            id="exam_type_id"
            value={values.exam_type_id}
            onChange={(value) => set("exam_type_id", value)}
            options={examTypes.map((type) => ({
              id: type.id,
              label: type.name,
            }))}
            placeholder="Select an exam type"
            createLabel="Add an exam type"
            createPlaceholder="e.g. Unit Test"
            onCreate={createExamType}
            disabled={isSubmitting}
            error={errors.exam_type_id}
            allowNone={false}
          />
        </Field>

        <Field
          id="exam_term_id"
          label="Term (optional)"
          hint={
            terms.length === 0
              ? "No terms are set up for this academic year."
              : undefined
          }
        >
          <Select
            value={values.term_id}
            onValueChange={(value) => set("term_id", value)}
            disabled={isSubmitting || terms.length === 0}
          >
            <SelectTrigger
              {...fieldProps("exam_term_id")}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TERM}>
                <span className="text-muted-foreground">Not set</span>
              </SelectItem>
              {terms.map((term) => (
                <SelectItem key={term.id} value={String(term.id)}>
                  {term.name?.trim() || `Term ${term.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="exam_start_date" label="Start Date (optional)">
            <Input
              {...fieldProps("exam_start_date")}
              type="date"
              value={values.start_date}
              onChange={(e) => set("start_date", e.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>

          <Field
            id="exam_end_date"
            label="End Date (optional)"
            error={errors.end_date}
          >
            <Input
              {...fieldProps("exam_end_date", errors.end_date)}
              type="date"
              min={values.start_date || undefined}
              value={values.end_date}
              onChange={(e) => set("end_date", e.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>
        </div>
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
              Creating
            </>
          ) : (
            "Create Exam"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CreateExamDialog({
  open,
  onOpenChange,
  year,
  terms,
  examTypes,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: AcademicYear;
  terms: Term[];
  examTypes: ExamType[];
  onCreated: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create an exam</DialogTitle>
          <DialogDescription>
            Set up the exam first, then add the subjects it covers.
          </DialogDescription>
        </DialogHeader>

        {/* Mounted only while open, so the initialisers double as the reset. */}
        {open && (
          <ExamForm
            year={year}
            terms={terms}
            examTypes={examTypes}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false);
              onCreated();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
