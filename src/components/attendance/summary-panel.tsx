"use client";

import * as React from "react";
import { ChartColumn, MousePointerClick, UsersRound } from "lucide-react";

import { SectionPicker } from "@/components/shared/section-picker";
import { Field, SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAttendanceSummary,
  listSectionRoster,
  sameId,
  type AttendanceSummaryRow,
  type RosterEntry,
  type Section,
} from "@/lib/api";
import { formatNumber, initialsFrom } from "@/lib/format";

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

type Row = {
  entry: RosterEntry;
  totalDays: number;
  presentDays: number;
  percent: number;
};

type Loaded = {
  /** The section+month this data answers — see `requestKey` below. */
  requestKey: string;
  rows: Row[];
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/**
 * Turns the summary rows into one row per enrolled student, so nobody is
 * missing from the list just because they have no records yet.
 */
function buildRows(
  roster: RosterEntry[],
  summary: AttendanceSummaryRow[]
): Row[] {
  // `present_pct` may be a percentage or a 0–1 fraction. A whole section
  // sitting at 1% or below is not a real case, so read that as fractions.
  const asFraction =
    summary.length > 0 &&
    summary.every((row) => Number(row.present_pct) <= 1);

  return roster.map((entry) => {
    const match = summary.find((row) => sameId(row.student_id, entry.student_id));
    const raw = Number(match?.present_pct ?? 0);

    return {
      entry,
      totalDays: Number(match?.total_days ?? 0),
      presentDays: Number(match?.present_days ?? 0),
      percent: clampPercent(asFraction ? raw * 100 : raw),
    };
  });
}

/** Green is fine, amber needs watching, red needs a conversation. */
function barTone(percent: number): string {
  if (percent >= 90) return "bg-emerald-500";
  if (percent >= 75) return "bg-amber-500";
  return "bg-destructive";
}

function SummaryRow({ row }: { row: Row }) {
  const fullName = `${row.entry.first_name} ${row.entry.last_name}`.trim();
  const hasRecords = row.totalDays > 0;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
        {row.entry.roll_number != null && String(row.entry.roll_number) !== ""
          ? String(row.entry.roll_number)
          : initialsFrom(fullName)}
      </span>

      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-sm font-medium">{fullName || "—"}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
          {row.entry.admission_number || "—"}
        </p>
      </div>

      <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${Math.round(row.percent)} percent present`}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${barTone(
              row.percent
            )}`}
            style={{ width: `${hasRecords ? row.percent : 0}%` }}
          />
        </div>
        <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums">
          {hasRecords ? `${Math.round(row.percent)}%` : "—"}
        </span>
      </div>

      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {hasRecords
          ? `${formatNumber(row.presentDays)} of ${formatNumber(row.totalDays)} days`
          : "No records"}
      </span>
    </li>
  );
}

function SummaryRowSkeleton() {
  return (
    <li className="flex items-center gap-4 px-4 py-3.5">
      <Skeleton className="size-9 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-36 max-w-full rounded-md" />
        <Skeleton className="h-3 w-24 rounded-md" />
      </div>
      <Skeleton className="h-2 w-40 max-w-[30%] rounded-full" />
      <Skeleton className="h-3 w-20 rounded-md" />
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Panel                                    */
/* -------------------------------------------------------------------------- */

export function SummaryPanel({
  sections,
  sectionId,
  onSectionChange,
}: {
  sections: Section[];
  sectionId: string;
  onSectionChange: (value: string) => void;
}) {
  const [month, setMonth] = React.useState(CURRENT_MONTH);
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Identifies the data the controls ask for. Loading is then simply "what we
  // hold isn't what we asked for" — no loading flag to keep in sync.
  const requestKey = `${sectionId}|${month}`;

  React.useEffect(() => {
    if (!sectionId || !month) return;
    let cancelled = false;

    Promise.all([
      listSectionRoster(sectionId),
      getAttendanceSummary({ section_id: sectionId, month }),
    ])
      .then(([roster, summary]) => {
        if (cancelled) return;
        setLoaded({ requestKey, rows: buildRows(roster, summary) });
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading the summary."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, sectionId, month, reloadKey]);

  const isStale = loaded?.requestKey !== requestKey;
  const rows = loaded?.rows ?? [];
  const tracked = rows.filter((row) => row.totalDays > 0);
  const average =
    tracked.length > 0
      ? tracked.reduce((sum, row) => sum + row.percent, 0) / tracked.length
      : 0;

  return (
    <Panel
      title="Monthly summary"
      description="How much of the month each student was present for."
      icon={ChartColumn}
    >
      {/* ------------------------------ Controls ----------------------------- */}
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-end">
        <SectionPicker
          id="summary_section"
          sections={sections}
          value={sectionId}
          onChange={onSectionChange}
        />

        <Field id="summary_month" label="Month">
          <Input
            id="summary_month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="h-9 w-full rounded-xl sm:w-44"
          />
        </Field>
      </div>

      {/* ------------------------------ Summary ------------------------------ */}
      {!sectionId ? (
        <SectionEmpty
          icon={MousePointerClick}
          title="Pick a section to start"
          description="Choose a section and a month above to see each student's attendance."
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
        <ul className="divide-y">
          {Array.from({ length: 5 }, (_, index) => (
            <SummaryRowSkeleton key={index} />
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <SectionEmpty
          icon={UsersRound}
          title="No students in this section"
          description="Enroll students into this section before a summary can be built."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-6 border-b bg-muted/25 px-4 py-3.5">
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Students
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatNumber(rows.length)}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Section average
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {tracked.length > 0 ? `${Math.round(average)}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Below 75%
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatNumber(
                  tracked.filter((row) => row.percent < 75).length
                )}
              </p>
            </div>
          </div>

          <ul className="divide-y">
            {rows.map((row) => (
              <SummaryRow key={String(row.entry.enrollment_id)} row={row} />
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
