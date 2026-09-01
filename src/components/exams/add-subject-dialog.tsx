"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  createExamSubject,
  type SchoolClass,
  type Subject,
} from "@/lib/api";

/** Radix rejects an empty item value, so "every class" needs a sentinel. */
const NO_CLASS = "__none__";

type Values = {
  subject_id: string;
  class_id: string;
  exam_date: string;
  max_marks: string;
  pass_marks: string;
};

type Errors = Partial<Record<keyof Values, string>>;

function SubjectForm({
  examId,
  subjects,
  classes,
  onCancel,
  onSaved,
}: {
  examId: string | number;
  subjects: Subject[];
  classes: SchoolClass[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = React.useState<Values>({
    subject_id: "",
    class_id: NO_CLASS,
    exam_date: "",
    max_marks: "100",
    pass_marks: "",
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

    const maxMarks = Number(values.max_marks);
    const passMarks = Number(values.pass_marks);
    const found: Errors = {};

    if (!values.subject_id) found.subject_id = "Select a subject.";
    if (!values.max_marks.trim()) {
      found.max_marks = "Maximum marks are required.";
    } else if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
      found.max_marks = "Enter a value greater than zero.";
    }
    if (values.pass_marks.trim()) {
      if (!Number.isFinite(passMarks) || passMarks < 0) {
        found.pass_marks = "Enter a valid pass mark.";
      } else if (Number.isFinite(maxMarks) && passMarks > maxMarks) {
        found.pass_marks = "Pass marks cannot exceed the maximum.";
      }
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      await createExamSubject(examId, {
        subject_id: values.subject_id,
        max_marks: maxMarks,
        ...(values.class_id !== NO_CLASS ? { class_id: values.class_id } : {}),
        ...(values.exam_date ? { exam_date: values.exam_date } : {}),
        ...(values.pass_marks.trim() ? { pass_marks: passMarks } : {}),
      });

      toast.success("Subject added", {
        description: "Marks can now be entered against it.",
      });
      onSaved();
    } catch (error) {
      toast.error("Could not add the subject", {
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
        <Field id="subject_id" label="Subject" error={errors.subject_id}>
          <Select
            value={values.subject_id}
            onValueChange={(value) => set("subject_id", value)}
            disabled={isSubmitting || subjects.length === 0}
          >
            <SelectTrigger
              {...fieldProps("subject_id", errors.subject_id)}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue
                placeholder={
                  subjects.length === 0
                    ? "No subjects set up"
                    : "Select a subject"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={String(subject.id)}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          id="subject_class"
          label="Class (optional)"
          hint="Leave unset if this paper is sat by every class."
        >
          <Select
            value={values.class_id}
            onValueChange={(value) => set("class_id", value)}
            disabled={isSubmitting}
          >
            <SelectTrigger
              {...fieldProps("subject_class")}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CLASS}>
                <span className="text-muted-foreground">All classes</span>
              </SelectItem>
              {classes.map((schoolClass) => (
                <SelectItem key={schoolClass.id} value={String(schoolClass.id)}>
                  {schoolClass.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="subject_exam_date" label="Exam Date (optional)">
          <Input
            {...fieldProps("subject_exam_date")}
            type="date"
            value={values.exam_date}
            onChange={(e) => set("exam_date", e.target.value)}
            disabled={isSubmitting}
            className="h-9 rounded-xl sm:max-w-[calc(50%-0.5rem)]"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="max_marks" label="Maximum Marks" error={errors.max_marks}>
            <Input
              {...fieldProps("max_marks", errors.max_marks)}
              type="number"
              min={1}
              step="1"
              inputMode="numeric"
              value={values.max_marks}
              onChange={(e) => set("max_marks", e.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-xl tabular-nums"
            />
          </Field>

          <Field
            id="pass_marks"
            label="Pass Marks (optional)"
            error={errors.pass_marks}
          >
            <Input
              {...fieldProps("pass_marks", errors.pass_marks)}
              type="number"
              min={0}
              step="1"
              inputMode="numeric"
              value={values.pass_marks}
              onChange={(e) => set("pass_marks", e.target.value)}
              placeholder="33"
              disabled={isSubmitting}
              className="h-9 rounded-xl tabular-nums"
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
              Saving
            </>
          ) : (
            "Add Subject"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddSubjectDialog({
  examId,
  open,
  onOpenChange,
  subjects,
  classes,
  onAdded,
}: {
  examId: string | number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  classes: SchoolClass[];
  onAdded: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a subject</DialogTitle>
          <DialogDescription>
            Add a paper to this exam, with the marks it is out of.
          </DialogDescription>
        </DialogHeader>

        {/* Mounted only while open, so the initialisers double as the reset. */}
        {open && (
          <SubjectForm
            examId={examId}
            subjects={subjects}
            classes={classes}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false);
              onAdded();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
