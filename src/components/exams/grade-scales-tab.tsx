"use client";

import * as React from "react";
import { Loader2, Plus, Ruler, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { GRADE_SCALE_TYPE_LABELS, entryBand } from "@/components/exams/exam-meta";
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
import {
  GRADE_SCALE_TYPES,
  createGradeScale,
  listGradeScales,
  type GradeScale,
  type GradeScaleType,
} from "@/lib/api";
import { humanizeToken } from "@/lib/format";

type DraftEntry = {
  grade: string;
  min_percent: string;
  max_percent: string;
  grade_point: string;
};

const EMPTY_ENTRY: DraftEntry = {
  grade: "",
  min_percent: "",
  max_percent: "",
  grade_point: "",
};

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

function GradeScaleForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"" | GradeScaleType>("");
  const [entries, setEntries] = React.useState<DraftEntry[]>([
    { ...EMPTY_ENTRY },
  ]);
  const [errors, setErrors] = React.useState<{
    name?: string;
    type?: string;
    entries?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function setEntry(index: number, key: keyof DraftEntry, value: string) {
    setEntries((current) =>
      current.map((entry, position) =>
        position === index ? { ...entry, [key]: value } : entry
      )
    );
    setErrors((current) =>
      current.entries ? { ...current, entries: undefined } : current
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found: typeof errors = {};
    if (!name.trim()) found.name = "Name is required.";
    if (!type) found.type = "Select a scale type.";

    const filled = entries.filter(
      (entry) =>
        entry.grade.trim() ||
        entry.min_percent.trim() ||
        entry.max_percent.trim() ||
        entry.grade_point.trim()
    );
    if (filled.length === 0) {
      found.entries = "Add at least one band.";
    } else {
      for (const entry of filled) {
        const min = Number(entry.min_percent);
        const max = Number(entry.max_percent);
        const point = Number(entry.grade_point);

        if (!entry.grade.trim()) {
          found.entries = "Every band needs a grade.";
          break;
        }
        if (!Number.isFinite(min) || !Number.isFinite(max)) {
          found.entries = "Every band needs a numeric range.";
          break;
        }
        if (min < 0 || max > 100) {
          found.entries = "Ranges must sit between 0 and 100.";
          break;
        }
        if (min > max) {
          found.entries = `The ${entry.grade.trim()} band starts above where it ends.`;
          break;
        }
        if (!Number.isFinite(point)) {
          found.entries = "Every band needs a grade point.";
          break;
        }
      }
    }

    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      await createGradeScale({
        name: name.trim(),
        type: type as GradeScaleType,
        entries: filled.map((entry) => ({
          grade: entry.grade.trim(),
          min_percent: Number(entry.min_percent),
          max_percent: Number(entry.max_percent),
          grade_point: Number(entry.grade_point),
        })),
      });

      toast.success("Grade scale added", {
        description: `${name.trim()} has ${filled.length} ${
          filled.length === 1 ? "band" : "bands"
        }.`,
      });
      onSaved();
    } catch (error) {
      toast.error("Could not add the grade scale", {
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="scale_name" label="Name" error={errors.name}>
            <Input
              {...fieldProps("scale_name", errors.name)}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((current) => ({ ...current, name: undefined }));
              }}
              placeholder="CBSE Letter Scale"
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>

          <Field id="scale_type" label="Type" error={errors.type}>
            <Select
              value={type}
              onValueChange={(value) => {
                setType(value as GradeScaleType);
                setErrors((current) => ({ ...current, type: undefined }));
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger
                {...fieldProps("scale_type", errors.type)}
                className="h-9 w-full rounded-xl"
              >
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_SCALE_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {GRADE_SCALE_TYPE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            Bands
          </Label>

          {/* Column headings once, so each row stays compact. */}
          <div className="hidden gap-2 px-1 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase sm:grid sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <span>Grade</span>
            <span>Min %</span>
            <span>Max %</span>
            <span>Point</span>
            <span className="sr-only">Remove</span>
          </div>

          <div className="space-y-2">
            {entries.map((entry, index) => (
              <div
                key={index}
                className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
              >
                <Input
                  value={entry.grade}
                  onChange={(e) => setEntry(index, "grade", e.target.value)}
                  placeholder="A1"
                  aria-label={`Grade for band ${index + 1}`}
                  autoComplete="off"
                  disabled={isSubmitting}
                  className="h-9 rounded-xl"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={entry.min_percent}
                  onChange={(e) => setEntry(index, "min_percent", e.target.value)}
                  placeholder="91"
                  aria-label={`Minimum percent for band ${index + 1}`}
                  disabled={isSubmitting}
                  className="h-9 rounded-xl tabular-nums"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={entry.max_percent}
                  onChange={(e) => setEntry(index, "max_percent", e.target.value)}
                  placeholder="100"
                  aria-label={`Maximum percent for band ${index + 1}`}
                  disabled={isSubmitting}
                  className="h-9 rounded-xl tabular-nums"
                />
                <Input
                  type="number"
                  step="0.1"
                  value={entry.grade_point}
                  onChange={(e) => setEntry(index, "grade_point", e.target.value)}
                  placeholder="10"
                  aria-label={`Grade point for band ${index + 1}`}
                  disabled={isSubmitting}
                  className="h-9 rounded-xl tabular-nums"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  disabled={isSubmitting || entries.length === 1}
                  onClick={() =>
                    setEntries((current) =>
                      current.filter((_, position) => position !== index)
                    )
                  }
                  aria-label={`Remove band ${index + 1}`}
                  className="rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          {errors.entries && (
            <p className="text-xs font-medium text-destructive">
              {errors.entries}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() =>
              setEntries((current) => [...current, { ...EMPTY_ENTRY }])
            }
            className="rounded-lg"
          >
            <Plus className="size-3.5" />
            Add band
          </Button>
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
            "Add Grade Scale"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Tab                                     */
/* -------------------------------------------------------------------------- */

function ScaleCard({ scale }: { scale: GradeScale }) {
  const entries = scale.entries ?? [];

  return (
    <li className="px-4 py-4 transition-colors hover:bg-muted/40">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <Ruler className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{scale.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {GRADE_SCALE_TYPE_LABELS[scale.type] ?? humanizeToken(scale.type)}
            {entries.length > 0
              ? ` · ${entries.length} ${entries.length === 1 ? "band" : "bands"}`
              : ""}
          </p>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 sm:pl-12">
          {entries.map((entry, index) => {
            const band = entryBand(entry);
            return (
              <span
                key={`${entry.grade}-${index}`}
                className="inline-flex items-center gap-2 rounded-lg border bg-muted/25 px-2.5 py-1 text-xs"
              >
                <span className="font-semibold">{entry.grade}</span>
                <span className="text-muted-foreground tabular-nums">
                  {band.min ?? "—"}–{band.max ?? "—"}%
                </span>
                {band.point !== null && (
                  <span className="text-muted-foreground tabular-nums">
                    · {band.point}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}
    </li>
  );
}

export function GradeScalesTab() {
  const [scales, setScales] = React.useState<GradeScale[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    listGradeScales()
      .then((loaded) => {
        if (cancelled) return;
        setScales(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading grade scales."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <>
      <Panel
        title="Grade Scales"
        description="How percentages are turned into grades on report cards."
        icon={Ruler}
        action={
          <Button
            size="lg"
            onClick={() => setIsFormOpen(true)}
            className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
          >
            <Plus className="size-4" />
            Add Grade Scale
          </Button>
        }
      >
        {error ? (
          <SectionError
            message={error}
            onRetry={() => {
              setError(null);
              setReloadKey((key) => key + 1);
            }}
          />
        ) : scales === null ? (
          <ul className="divide-y">
            {Array.from({ length: 2 }, (_, index) => (
              <li key={index} className="space-y-3 px-4 py-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40 max-w-full rounded-md" />
                    <Skeleton className="h-3 w-24 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-7 w-full max-w-md rounded-lg" />
              </li>
            ))}
          </ul>
        ) : scales.length === 0 ? (
          <SectionEmpty
            icon={Ruler}
            title="No grade scales yet"
            description="Add a scale with its bands so report cards can turn percentages into grades."
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsFormOpen(true)}
              className="rounded-xl"
            >
              <Plus className="size-4" />
              Add Grade Scale
            </Button>
          </SectionEmpty>
        ) : (
          <ul className="divide-y">
            {scales.map((scale) => (
              <ScaleCard key={scale.id} scale={scale} />
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add a grade scale</DialogTitle>
            <DialogDescription>
              Define each band: the grade, the percentage range it covers, and
              its grade point.
            </DialogDescription>
          </DialogHeader>

          {/* Mounted only while open, so the initialisers double as the reset. */}
          {isFormOpen && (
            <GradeScaleForm
              onCancel={() => setIsFormOpen(false)}
              onSaved={() => {
                setIsFormOpen(false);
                setReloadKey((key) => key + 1);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
