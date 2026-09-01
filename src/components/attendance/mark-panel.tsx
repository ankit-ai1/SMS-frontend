"use client";

import * as React from "react";
import {
  CalendarDays,
  CheckCheck,
  CircleCheck,
  Loader2,
  MessageSquarePlus,
  MousePointerClick,
  UserRoundX,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { SectionPicker } from "@/components/shared/section-picker";
import {
  StatusCount,
  StatusSegmented,
} from "@/components/attendance/status-control";
import { Field, SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ATTENDANCE_STATUSES,
  listAttendance,
  listSectionRoster,
  markAttendanceBulk,
  toAttendanceStatus,
  type AttendanceStatus,
  type RosterEntry,
  type Section,
} from "@/lib/api";
import { formatDate, initialsFrom, toDateInputValue } from "@/lib/format";

const TODAY_ISO = new Date().toISOString().slice(0, 10);

type Mark = { status: AttendanceStatus; remarks: string };
type Marks = Record<string, Mark>;

type Loaded = {
  /** The section+date this data answers — see `requestKey` below. */
  requestKey: string;
  /** Bumped on every successful load, and used to remount the editor. */
  version: number;
  roster: RosterEntry[];
  marks: Marks;
  alreadyMarked: number;
};

/* -------------------------------------------------------------------------- */
/*                                   Editor                                   */
/* -------------------------------------------------------------------------- */

function RosterRow({
  entry,
  mark,
  onStatusChange,
  onRemarksChange,
  disabled,
}: {
  entry: RosterEntry;
  mark: Mark;
  onStatusChange: (status: AttendanceStatus) => void;
  onRemarksChange: (remarks: string) => void;
  disabled: boolean;
}) {
  const fullName = `${entry.first_name} ${entry.last_name}`.trim();
  // A note that already exists stays visible; otherwise it is opt-in per row.
  const [showRemarks, setShowRemarks] = React.useState(
    mark.remarks.trim() !== ""
  );

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

        <StatusSegmented
          value={mark.status}
          onChange={onStatusChange}
          label={fullName}
          disabled={disabled}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          onClick={() => setShowRemarks((current) => !current)}
          aria-label={`${showRemarks ? "Hide" : "Add"} a note for ${fullName}`}
          aria-expanded={showRemarks}
          className={
            mark.remarks.trim()
              ? "rounded-lg text-brand-600"
              : "rounded-lg text-muted-foreground hover:text-foreground"
          }
        >
          <MessageSquarePlus className="size-3.5" />
        </Button>
      </div>

      {showRemarks && (
        <Input
          value={mark.remarks}
          onChange={(event) => onRemarksChange(event.target.value)}
          placeholder="Add a note (optional)"
          autoComplete="off"
          disabled={disabled}
          aria-label={`Note for ${fullName}`}
          className="mt-2.5 h-8 rounded-xl text-xs"
        />
      )}
    </li>
  );
}

function RosterEditor({
  sectionId,
  date,
  roster,
  initialMarks,
  alreadyMarked,
  onSaved,
}: {
  sectionId: string;
  date: string;
  roster: RosterEntry[];
  initialMarks: Marks;
  alreadyMarked: number;
  onSaved: () => void;
}) {
  // Remounted on every successful load, so the initialiser doubles as the reset.
  const [marks, setMarks] = React.useState<Marks>(initialMarks);
  const [isSaving, setIsSaving] = React.useState(false);

  const isDirty = roster.some((entry) => {
    const key = String(entry.enrollment_id);
    return (
      marks[key]?.status !== initialMarks[key]?.status ||
      marks[key]?.remarks !== initialMarks[key]?.remarks
    );
  });

  const counts = React.useMemo(() => {
    const tally: Record<AttendanceStatus, number> = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      half_day: 0,
    };
    for (const entry of roster) {
      const mark = marks[String(entry.enrollment_id)];
      if (mark) tally[mark.status] += 1;
    }
    return tally;
  }, [roster, marks]);

  function setStatus(enrollmentId: string, status: AttendanceStatus) {
    setMarks((current) => ({
      ...current,
      [enrollmentId]: { ...current[enrollmentId], status },
    }));
  }

  function setRemarks(enrollmentId: string, remarks: string) {
    setMarks((current) => ({
      ...current,
      [enrollmentId]: { ...current[enrollmentId], remarks },
    }));
  }

  function markAll(status: AttendanceStatus) {
    setMarks((current) => {
      const next: Marks = { ...current };
      for (const entry of roster) {
        const key = String(entry.enrollment_id);
        next[key] = { ...next[key], status };
      }
      return next;
    });
  }

  async function handleSave() {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const result = await markAttendanceBulk({
        section_id: sectionId,
        date,
        records: roster.map((entry) => {
          const mark = marks[String(entry.enrollment_id)];
          return {
            enrollment_id: entry.enrollment_id,
            status: mark.status,
            // Existing notes are sent back untouched — this is an upsert, so
            // omitting them would wipe what was already recorded.
            ...(mark.remarks.trim() ? { remarks: mark.remarks.trim() } : {}),
          };
        }),
      });

      toast.success("Attendance saved", {
        description: `${result?.marked ?? roster.length} students marked for ${formatDate(date)}.`,
      });
      onSaved();
    } catch (error) {
      toast.error("Could not save attendance", {
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
      {/* Counts and bulk actions, so a full class is two clicks not thirty. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/25 px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {ATTENDANCE_STATUSES.filter((status) => counts[status] > 0).map(
            (status) => (
              <StatusCount key={status} status={status} count={counts[status]} />
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => markAll("present")}
            className="rounded-lg"
          >
            <CheckCheck className="size-3.5" />
            Mark all present
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => markAll("absent")}
            className="rounded-lg"
          >
            <UserRoundX className="size-3.5" />
            Mark all absent
          </Button>
        </div>
      </div>

      <ul className="divide-y">
        {roster.map((entry) => {
          const key = String(entry.enrollment_id);
          return (
            <RosterRow
              key={key}
              entry={entry}
              mark={marks[key]}
              onStatusChange={(status) => setStatus(key, status)}
              onRemarksChange={(remarks) => setRemarks(key, remarks)}
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
          ) : alreadyMarked > 0 ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <CircleCheck className="size-3.5" />
              Saved for {formatDate(date)}
            </span>
          ) : (
            "Nothing marked for this date yet."
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
            "Save Attendance"
          )}
        </Button>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Panel                                    */
/* -------------------------------------------------------------------------- */

function RosterSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-full rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
          <Skeleton className="h-8 w-72 max-w-[45%] rounded-xl" />
        </li>
      ))}
    </ul>
  );
}

export function MarkPanel({
  sections,
  sectionId,
  onSectionChange,
}: {
  sections: Section[];
  sectionId: string;
  onSectionChange: (value: string) => void;
}) {
  const [date, setDate] = React.useState(TODAY_ISO);
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Identifies the roster the controls ask for. Loading is then simply "what we
  // hold isn't what we asked for" — no loading flag to keep in sync.
  const requestKey = `${sectionId}|${date}`;

  React.useEffect(() => {
    if (!sectionId || !date) return;
    let cancelled = false;

    Promise.all([
      listSectionRoster(sectionId),
      listAttendance({
        section_id: sectionId,
        date_from: date,
        date_to: date,
      }),
    ])
      .then(([roster, records]) => {
        if (cancelled) return;

        // Narrowed again here so a backend that ignores the range cannot
        // pre-fill this date from some other day's records.
        const forDate = records.filter(
          (record) => toDateInputValue(record.date) === date
        );
        const byEnrollment = new Map(
          forDate.map((record) => [String(record.enrollment_id), record])
        );

        const marks: Marks = {};
        for (const entry of roster) {
          const existing = byEnrollment.get(String(entry.enrollment_id));
          marks[String(entry.enrollment_id)] = {
            status: toAttendanceStatus(existing?.status) ?? "present",
            remarks: existing?.remarks ?? "",
          };
        }

        setLoaded((previous) => ({
          requestKey,
          version: (previous?.version ?? 0) + 1,
          roster,
          marks,
          alreadyMarked: forDate.length,
        }));
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading the roster."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, sectionId, date, reloadKey]);

  const isStale = loaded?.requestKey !== requestKey;

  return (
    <Panel
      title="Mark attendance"
      description="Pick a section and date, then set a status for every student."
      icon={UsersRound}
    >
      {/* ------------------------------ Controls ----------------------------- */}
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-end">
        <SectionPicker
          id="mark_section"
          sections={sections}
          value={sectionId}
          onChange={onSectionChange}
        />

        <Field id="mark_date" label="Date">
          <div className="flex items-center gap-2">
            <Input
              id="mark_date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-9 w-full rounded-xl sm:w-44"
            />
            {date !== TODAY_ISO && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setDate(TODAY_ISO)}
                className="rounded-xl"
              >
                <CalendarDays className="size-4" />
                Today
              </Button>
            )}
          </div>
        </Field>
      </div>

      {/* ------------------------------- Roster ------------------------------ */}
      {!sectionId ? (
        <SectionEmpty
          icon={MousePointerClick}
          title="Pick a section to start"
          description="Choose a section and a date above, and its roster loads here ready to mark."
        />
      ) : error ? (
        <SectionError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      ) : isStale ? (
        <RosterSkeleton />
      ) : loaded.roster.length === 0 ? (
        <SectionEmpty
          icon={UsersRound}
          title="No students in this section"
          description="Enroll students into this section before attendance can be marked."
        />
      ) : (
        <RosterEditor
          key={loaded.version}
          sectionId={sectionId}
          date={date}
          roster={loaded.roster}
          initialMarks={loaded.marks}
          alreadyMarked={loaded.alreadyMarked}
          onSaved={() => setReloadKey((key) => key + 1)}
        />
      )}
    </Panel>
  );
}
