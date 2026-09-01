"use client";

import * as React from "react";
import { CalendarCheck } from "lucide-react";

import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { listStaffAttendance, type StaffAttendanceEntry } from "@/lib/api";
import { dateParts, formatDate, humanizeToken, relativeDay } from "@/lib/format";

/**
 * Status arrives as a backend token (`HALF_DAY`, `on_leave`…), so match on a
 * normalised form and fall back to neutral styling for anything unrecognised.
 */
function toneFor(status: string): { chip: string; dot: string } {
  const key = status.trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (key.includes("present")) {
    return {
      chip: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20",
      dot: "bg-emerald-500",
    };
  }
  if (key.includes("absent")) {
    return {
      chip: "bg-destructive/10 text-destructive ring-destructive/20",
      dot: "bg-destructive",
    };
  }
  if (key.includes("leave")) {
    return {
      chip: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/20",
      dot: "bg-amber-500",
    };
  }
  if (key.includes("half")) {
    return {
      chip: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-400 dark:ring-sky-500/20",
      dot: "bg-sky-500",
    };
  }
  return {
    chip: "bg-muted text-muted-foreground ring-border",
    dot: "bg-muted-foreground/50",
  };
}

function StatusChip({ status }: { status: string }) {
  const tone = toneFor(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-medium ring-1 ${tone.chip}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${tone.dot}`} />
      {humanizeToken(status) || "Unknown"}
    </span>
  );
}

/** Counts by status, so the history reads as a record rather than a log. */
function Summary({ entries }: { entries: StaffAttendanceEntry[] }) {
  const counts = React.useMemo(() => {
    const tally = new Map<string, number>();
    for (const entry of entries) {
      const label = humanizeToken(entry.status) || "Unknown";
      tally.set(label, (tally.get(label) ?? 0) + 1);
    }
    return [...tally.entries()].sort((a, b) => b[1] - a[1]);
  }, [entries]);

  return (
    <div className="flex flex-wrap gap-4 border-b bg-muted/25 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
          Records
        </p>
        <p className="mt-1 text-sm font-semibold tabular-nums">
          {entries.length}
        </p>
      </div>
      {counts.map(([label, count]) => (
        <div key={label} className="min-w-0">
          <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{count}</p>
        </div>
      ))}
    </div>
  );
}

function AttendanceRow({ entry }: { entry: StaffAttendanceEntry }) {
  const parts = dateParts(entry.date);

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      {/* Calendar tile — scannable at a glance down the left edge. */}
      <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        <span className="text-[0.5625rem] font-medium tracking-wide uppercase">
          {parts?.month ?? "—"}
        </span>
        <span className="text-sm leading-none font-semibold tabular-nums">
          {parts?.day ?? "--"}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{formatDate(entry.date)}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {entry.remarks?.trim() || relativeDay(entry.date) || "No remarks"}
        </p>
      </div>

      <StatusChip status={entry.status} />
    </li>
  );
}

function AttendanceRowSkeleton() {
  return (
    <li className="flex items-center gap-4 px-4 py-3.5">
      <Skeleton className="size-11 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-3 w-24 rounded-md" />
      </div>
      <Skeleton className="h-5 w-20 rounded-lg" />
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Tab                                     */
/* -------------------------------------------------------------------------- */

export function AttendanceTab({ staffId }: { staffId: string | number }) {
  const [entries, setEntries] = React.useState<StaffAttendanceEntry[] | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    listStaffAttendance(staffId)
      .then((loaded) => {
        if (cancelled) return;
        // Newest first — the recent record is what anyone opens this for.
        setEntries(
          [...loaded].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        );
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading attendance."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [staffId, reloadKey]);

  return (
    <Panel
      title="Attendance"
      description="Every day recorded against this staff member."
      icon={CalendarCheck}
    >
      {error ? (
        <SectionError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      ) : entries === null ? (
        <ul className="divide-y">
          {Array.from({ length: 3 }, (_, index) => (
            <AttendanceRowSkeleton key={index} />
          ))}
        </ul>
      ) : entries.length === 0 ? (
        <SectionEmpty
          icon={CalendarCheck}
          title="No attendance recorded"
          description="Once attendance is marked for this staff member, every day shows up here."
        />
      ) : (
        <>
          <Summary entries={entries} />
          <ul className="divide-y">
            {entries.map((entry, index) => (
              <AttendanceRow key={`${entry.date}-${index}`} entry={entry} />
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
