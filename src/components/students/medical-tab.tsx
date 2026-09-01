"use client";

import * as React from "react";
import {
  Activity,
  CircleCheck,
  HeartPulse,
  Loader2,
  Pencil,
  Pill,
  StickyNote,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Field, SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getMedical, updateMedical, type MedicalInfo } from "@/lib/api";

type MedicalValues = {
  allergies: string;
  conditions: string;
  medications: string;
  notes: string;
};

const FIELDS: {
  key: keyof MedicalValues;
  label: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon chip — one accent per kind of record. */
  tone: string;
  placeholder: string;
}[] = [
  {
    key: "allergies",
    label: "Allergies",
    icon: TriangleAlert,
    tone: "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/20",
    placeholder: "e.g. peanuts, penicillin",
  },
  {
    key: "conditions",
    label: "Conditions",
    icon: Activity,
    tone: "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-400 dark:ring-sky-500/20",
    placeholder: "e.g. asthma, epilepsy",
  },
  {
    key: "medications",
    label: "Medications",
    icon: Pill,
    tone: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20",
    placeholder: "e.g. inhaler, kept with the school nurse",
  },
  {
    key: "notes",
    label: "Notes",
    icon: StickyNote,
    tone: "bg-brand-50 text-brand-600 ring-brand-100",
    placeholder: "Anything staff should know in an emergency",
  },
];

function valuesFrom(medical: MedicalInfo | null): MedicalValues {
  return {
    allergies: medical?.allergies ?? "",
    conditions: medical?.conditions ?? "",
    medications: medical?.medications ?? "",
    notes: medical?.notes ?? "",
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Read view                                 */
/* -------------------------------------------------------------------------- */

function MedicalReadView({ values }: { values: MedicalValues }) {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2">
      {FIELDS.map(({ key, label, icon: Icon, tone }) => {
        const value = values[key].trim();

        return (
          <div
            key={key}
            className="rounded-xl border bg-muted/25 p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ${tone}`}
              >
                <Icon className="size-3.5" />
              </span>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
              </p>
            </div>
            <p
              className={`mt-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                value ? "font-medium" : "text-muted-foreground/70 italic"
              }`}
            >
              {value || "Not recorded"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Edit form                                 */
/* -------------------------------------------------------------------------- */

function MedicalForm({
  studentId,
  initial,
  onCancel,
  onSaved,
}: {
  studentId: string | number;
  initial: MedicalValues;
  onCancel: () => void;
  onSaved: (saved: MedicalValues) => void;
}) {
  const [values, setValues] = React.useState<MedicalValues>(initial);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isDirty = FIELDS.some(({ key }) => values[key] !== initial[key]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !isDirty) return;

    const payload: MedicalValues = {
      allergies: values.allergies.trim(),
      conditions: values.conditions.trim(),
      medications: values.medications.trim(),
      notes: values.notes.trim(),
    };

    setIsSubmitting(true);
    try {
      await updateMedical(studentId, payload);
      toast.success("Medical record saved", {
        description: "Staff will see these details on this student's profile.",
      });
      onSaved(payload);
    } catch (error) {
      toast.error("Could not save the medical record", {
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        {FIELDS.map(({ key, label, icon: Icon, tone, placeholder }) => (
          <Field
            key={key}
            id={`medical_${key}`}
            label={label}
            hint={`Optional — ${placeholder}`}
          >
            <div className="relative">
              <span
                className={`absolute top-2.5 left-2.5 flex size-6 items-center justify-center rounded-md ring-1 ${tone}`}
              >
                <Icon className="size-3" />
              </span>
              <Textarea
                id={`medical_${key}`}
                value={values[key]}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                disabled={isSubmitting}
                className="min-h-28 rounded-xl pl-10"
              />
            </div>
          </Field>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/40 p-4">
        <p className="text-xs text-muted-foreground">
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
              <span className="size-1.5 rounded-full bg-current" />
              Unsaved changes
            </span>
          ) : (
            "No changes yet."
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
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
            disabled={isSubmitting || !isDirty}
            className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Medical Record"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

function MedicalSkeleton() {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2">
      {FIELDS.map(({ key }) => (
        <div key={key} className="space-y-2.5 rounded-xl border p-4">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-4 w-40 max-w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Tab                                     */
/* -------------------------------------------------------------------------- */

export function MedicalTab({ studentId }: { studentId: string | number }) {
  const [medical, setMedical] = React.useState<MedicalInfo | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [isEditing, setIsEditing] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    getMedical(studentId)
      .then((loaded) => {
        if (cancelled) return;
        // `data` is null until a record exists — an empty form, not an error.
        setMedical(loaded ?? null);
        setIsLoaded(true);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading the medical record."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, reloadKey]);

  // The confirmation fades on its own so it never becomes part of the furniture.
  React.useEffect(() => {
    if (savedAt === null) return;
    const timer = setTimeout(() => setSavedAt(null), 5000);
    return () => clearTimeout(timer);
  }, [savedAt]);

  const values = valuesFrom(medical);
  const hasAnything = FIELDS.some(({ key }) => values[key].trim() !== "");

  function retry() {
    setError(null);
    setReloadKey((key) => key + 1);
  }

  function handleSaved(saved: MedicalValues) {
    // Show the saved values straight away, then quietly re-read the server's
    // copy — `isLoaded` stays true, so the panel never flashes a skeleton.
    setMedical(saved);
    setIsEditing(false);
    setSavedAt(Date.now());
    setReloadKey((key) => key + 1);
  }

  return (
    <Panel
      title="Medical"
      description="Kept for staff to check in an emergency."
      icon={HeartPulse}
      action={
        <div className="flex items-center gap-3">
          {savedAt !== null && !isEditing && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CircleCheck className="size-3.5" />
              Saved
            </span>
          )}
          {!isEditing && !error && isLoaded && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsEditing(true)}
              className="rounded-xl"
            >
              <Pencil className="size-4" />
              {hasAnything ? "Edit" : "Add details"}
            </Button>
          )}
        </div>
      }
    >
      {error ? (
        <SectionError message={error} onRetry={retry} />
      ) : !isLoaded ? (
        <MedicalSkeleton />
      ) : isEditing ? (
        <MedicalForm
          studentId={studentId}
          initial={values}
          onCancel={() => setIsEditing(false)}
          onSaved={handleSaved}
        />
      ) : hasAnything ? (
        <MedicalReadView values={values} />
      ) : (
        <SectionEmpty
          icon={HeartPulse}
          title="No medical details recorded"
          description="Record allergies, conditions and medication so staff can act quickly in an emergency."
        >
          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsEditing(true)}
            className="rounded-xl"
          >
            <Pencil className="size-4" />
            Add details
          </Button>
        </SectionEmpty>
      )}
    </Panel>
  );
}
