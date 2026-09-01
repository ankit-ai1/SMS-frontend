"use client";

import * as React from "react";
import { CircleCheck, Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

import { marksTone, toMarks } from "@/components/exams/exam-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveExamGrades,
  type ExamGrade,
  type RosterEntry,
} from "@/lib/api";
import { formatNumber, initialsFrom } from "@/lib/format";

/** One student's row in the mark sheet. Marks stay strings until save. */
export type Entry = { marks: string; grade: string; remarks: string };

/** Keyed by `enrollment_id`, stringified so map lookups stay consistent. */
export type Entries = Record<string, Entry>;

/**
 * Folds the marks already on file into a blank sheet for the roster, and
 * reports how many students were graded before this visit.
 */
export function buildGradeEntries(
  roster: RosterEntry[],
  grades: ExamGrade[]
): { entries: Entries; alreadyGraded: number } {
  const byEnrollment = new Map(
    grades.map((grade) => [String(grade.enrollment_id), grade])
  );

  const entries: Entries = {};
  let alreadyGraded = 0;

  for (const entry of roster) {
    const key = String(entry.enrollment_id);
    const existing = byEnrollment.get(key);
    const marks = toMarks(existing?.marks_obtained);
    if (marks !== null) alreadyGraded += 1;

    entries[key] = {
      marks: marks !== null ? String(marks) : "",
      grade: existing?.grade ?? "",
      remarks: existing?.remarks ?? "",
    };
  }

  return { entries, alreadyGraded };
}

function GradeRow({
  entry,
  value,
  maxMarks,
  passMarks,
  onChange,
  disabled,
}: {
  entry: RosterEntry;
  value: Entry;
  maxMarks: number | null;
  passMarks: number | null;
  onChange: (next: Entry) => void;
  disabled: boolean;
}) {
  const fullName = `${entry.first_name} ${entry.last_name}`.trim();
  // A note that already exists stays visible; otherwise it is opt-in per row.
  const [showExtras, setShowExtras] = React.useState(
    value.grade.trim() !== "" || value.remarks.trim() !== ""
  );

  const marks = toMarks(value.marks);
  const isOver = marks !== null && maxMarks !== null && marks > maxMarks;
  const isNegative = marks !== null && marks < 0;
  const invalid = isOver || isNegative;

  return (
    <li className="px-4 py-3 transition-colors hover:bg-muted/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
          {entry.roll_number != null && String(entry.roll_number) !== ""
            ? String(entry.roll_number)
            : initialsFrom(fullName)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{fullName || "—"}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
            {entry.admission_number || "—"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Input
            type="number"
            min={0}
            max={maxMarks ?? undefined}
            step="0.5"
            inputMode="decimal"
            value={value.marks}
            onChange={(event) => onChange({ ...value, marks: event.target.value })}
            placeholder="—"
            aria-label={`Marks for ${fullName}`}
            aria-invalid={invalid}
            disabled={disabled}
            className={`h-9 w-24 rounded-xl text-right tabular-nums ${marksTone(
              invalid ? null : marks,
              maxMarks,
              passMarks
            )}`}
          />
          <span className="text-xs text-muted-foreground tabular-nums">
            / {maxMarks !== null ? formatNumber(maxMarks) : "—"}
          </span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          onClick={() => setShowExtras((current) => !current)}
          aria-label={`${showExtras ? "Hide" : "Add"} grade and note for ${fullName}`}
          aria-expanded={showExtras}
          className={
            value.grade.trim() || value.remarks.trim()
              ? "rounded-lg text-brand-600"
              : "rounded-lg text-muted-foreground hover:text-foreground"
          }
        >
          <MessageSquarePlus className="size-3.5" />
        </Button>
      </div>

      {invalid && (
        <p className="mt-2 text-xs font-medium text-destructive">
          {isNegative
            ? "Marks cannot be negative."
            : `Marks cannot be above ${formatNumber(maxMarks ?? 0)}.`}
        </p>
      )}

      {showExtras && (
        <div className="mt-2.5 grid gap-2 sm:grid-cols-[8rem_1fr]">
          <Input
            value={value.grade}
            onChange={(event) => onChange({ ...value, grade: event.target.value })}
            placeholder="Grade"
            autoComplete="off"
            aria-label={`Grade for ${fullName}`}
            disabled={disabled}
            className="h-8 rounded-xl text-xs"
          />
          <Input
            value={value.remarks}
            onChange={(event) =>
              onChange({ ...value, remarks: event.target.value })
            }
            placeholder="Remarks (optional)"
            autoComplete="off"
            aria-label={`Remarks for ${fullName}`}
            disabled={disabled}
            className="h-8 rounded-xl text-xs"
          />
        </div>
      )}
    </li>
  );
}

/**
 * The mark sheet itself: a row per student, validation against the paper's
 * maximum, and one save. Shared by the admin exam screen and the teacher's
 * grades screen, which differ only in how they pick the paper and section.
 */
export function GradeRosterEditor({
  examSubjectId,
  roster,
  initialEntries,
  maxMarks,
  passMarks,
  alreadyGraded,
  onSaved,
}: {
  examSubjectId: string;
  roster: RosterEntry[];
  initialEntries: Entries;
  maxMarks: number | null;
  passMarks: number | null;
  alreadyGraded: number;
  onSaved: () => void;
}) {
  // Remounted on every successful load, so the initialiser doubles as the reset.
  const [entries, setEntries] = React.useState<Entries>(initialEntries);
  const [isSaving, setIsSaving] = React.useState(false);

  const isDirty = roster.some((entry) => {
    const key = String(entry.enrollment_id);
    const current = entries[key];
    const initial = initialEntries[key];
    return (
      current?.marks !== initial?.marks ||
      current?.grade !== initial?.grade ||
      current?.remarks !== initial?.remarks
    );
  });

  const filled = roster.filter(
    (entry) => entries[String(entry.enrollment_id)]?.marks.trim() !== ""
  );

  const invalidCount = filled.filter((entry) => {
    const marks = toMarks(entries[String(entry.enrollment_id)].marks);
    if (marks === null) return true;
    if (marks < 0) return true;
    return maxMarks !== null && marks > maxMarks;
  }).length;

  async function handleSave() {
    if (isSaving) return;

    if (invalidCount > 0) {
      toast.error("Some marks are out of range", {
        description: `Fix ${invalidCount} ${
          invalidCount === 1 ? "entry" : "entries"
        } before saving.`,
      });
      return;
    }
    if (filled.length === 0) {
      toast.info("Nothing to save", {
        description: "Enter marks for at least one student.",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Only students with marks are sent — a blank row means "not sat yet",
      // not zero.
      const result = await saveExamGrades(
        examSubjectId,
        filled.map((entry) => {
          const value = entries[String(entry.enrollment_id)];
          return {
            enrollment_id: entry.enrollment_id,
            marks_obtained: Number(value.marks),
            ...(value.grade.trim() ? { grade: value.grade.trim() } : {}),
            ...(value.remarks.trim() ? { remarks: value.remarks.trim() } : {}),
          };
        })
      );

      toast.success("Marks saved", {
        description: `${formatNumber(result?.graded ?? filled.length)} students graded.`,
      });
      onSaved();
    } catch (error) {
      toast.error("Could not save the marks", {
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/25 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {filled.length}
            </span>{" "}
            of {roster.length} entered
          </span>
          {invalidCount > 0 && (
            <span className="font-medium text-destructive">
              {invalidCount} out of range
            </span>
          )}
        </div>
      </div>

      <ul className="divide-y">
        {roster.map((entry) => {
          const key = String(entry.enrollment_id);
          return (
            <GradeRow
              key={key}
              entry={entry}
              value={entries[key]}
              maxMarks={maxMarks}
              passMarks={passMarks}
              onChange={(next) =>
                setEntries((current) => ({ ...current, [key]: next }))
              }
              disabled={isSaving}
            />
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/40 p-4">
        <p className="text-xs text-muted-foreground">
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
              <span className="size-1.5 rounded-full bg-current" />
              Unsaved changes
            </span>
          ) : alreadyGraded > 0 ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <CircleCheck className="size-3.5" />
              Saved
            </span>
          ) : (
            "No marks entered yet."
          )}
        </p>

        <Button
          type="button"
          size="lg"
          disabled={isSaving}
          onClick={handleSave}
          className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save Marks"
          )}
        </Button>
      </div>
    </>
  );
}
