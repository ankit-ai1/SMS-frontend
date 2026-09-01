import type { GradeScaleEntry } from "@/lib/api";

export const GRADE_SCALE_TYPE_LABELS: Record<string, string> = {
  letter: "Letter grades",
  cgpa: "CGPA",
  percentage: "Percentage",
};

/**
 * Marks may arrive as numbers or as JSON decimal strings. Anything
 * unparseable becomes null so it renders as "—" rather than "NaN".
 */
export function toMarks(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

/** The read and write shapes disagree on names — read whichever is present. */
export function entryBand(entry: GradeScaleEntry): {
  min: number | null;
  max: number | null;
  point: number | null;
} {
  return {
    min: toMarks(entry.min ?? entry.min_percent),
    max: toMarks(entry.max ?? entry.max_percent),
    point: toMarks(entry.point ?? entry.grade_point),
  };
}

/** Green is a comfortable pass, amber is borderline, red is below the line. */
export function marksTone(
  marks: number | null,
  max: number | null | undefined,
  pass: number | null | undefined
): string {
  if (marks === null) return "text-muted-foreground";
  if (pass != null && marks < pass) return "text-destructive";
  if (max != null && max > 0 && marks / max >= 0.75) {
    return "text-emerald-600 dark:text-emerald-400";
  }
  return "text-foreground";
}

/** A percentage chip's colour, shared by report cards and grade summaries. */
export function percentTone(percent: number | null): string {
  if (percent === null) return "bg-muted text-muted-foreground ring-border";
  if (percent >= 75) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20";
  }
  if (percent >= 40) {
    return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/20";
  }
  return "bg-destructive/10 text-destructive ring-destructive/20";
}
