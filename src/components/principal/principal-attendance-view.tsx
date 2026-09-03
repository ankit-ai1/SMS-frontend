"use client";

import * as React from "react";
import { ChartColumn, Layers, TriangleAlert } from "lucide-react";

import {
  LoadErrorCard,
  NoYearCard,
  PageHeader,
  RowsSkeleton,
  ViewOnlyChip,
} from "@/components/principal/principal-chrome";
import { useSchoolScope, yearLabel } from "@/components/principal/use-school-scope";
import { SummaryPanel } from "@/components/attendance/summary-panel";
import { Field, SectionEmpty } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAttendanceReport,
  type AcademicYear,
  type AttendanceReport,
  type AttendanceReportSection,
  type Section,
} from "@/lib/api";
import { formatNumber } from "@/lib/format";

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

/** Green is fine, amber needs watching, red needs a conversation. */
function barTone(percent: number): string {
  if (percent >= 90) return "bg-brand-500";
  if (percent >= 75) return "bg-gold";
  return "bg-destructive";
}

function SectionRow({ row }: { row: AttendanceReportSection }) {
  const percent = row.average_attendance_pct;
  const hasRecords = percent !== null;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <Layers className="size-4" />
      </span>

      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-sm font-semibold">
          {[row.class_name?.trim(), row.section_name?.trim()]
            .filter(Boolean)
            .join(" — ") || `Section ${row.section_id}`}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
          {hasRecords
            ? `${formatNumber(row.students_with_records)} tracked · ${formatNumber(
                row.below_75_count
              )} below 75%`
            : "No attendance marked"}
        </p>
      </div>

      <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${Math.round(percent ?? 0)} percent present`}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${barTone(
              percent ?? 0
            )}`}
            style={{ width: `${hasRecords ? percent : 0}%` }}
          />
        </div>
        <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums">
          {hasRecords ? `${Math.round(percent ?? 0)}%` : "—"}
        </span>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                             School-wide summary                            */
/* -------------------------------------------------------------------------- */

/**
 * The whole school in one request. This used to fan out to one call per
 * section and add the averages up here; `/reports/attendance` now does that
 * work in a single query, which also makes the below-75 count correct —
 * it is counted per student rather than off each section's average.
 */
function SchoolPanel({
  year,
  month,
  onMonthChange,
}: {
  year: AcademicYear;
  month: string;
  onMonthChange: (value: string) => void;
}) {
  const [loaded, setLoaded] = React.useState<{
    requestKey: string;
    report: AttendanceReport;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Identifies the data the controls ask for. Loading is then simply "what we
  // hold isn't what we asked for" — no loading flag to keep in sync.
  const requestKey = `${year.id}|${month}|${reloadKey}`;

  React.useEffect(() => {
    if (!month) return;
    let cancelled = false;

    getAttendanceReport({ academic_year_id: year.id, month })
      .then((report) => {
        if (cancelled) return;
        setLoaded({ requestKey, report });
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while building the report."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, year.id, month]);

  const report = loaded?.requestKey === requestKey ? loaded.report : null;
  // Worst first: the sections that need a conversation lead.
  const sections = [...(report?.sections ?? [])].sort(
    (a, b) => (a.average_attendance_pct ?? 101) - (b.average_attendance_pct ?? 101)
  );

  return (
    <Panel
      title="School-wide attendance"
      description="Every section's average for the month, worst first."
      icon={ChartColumn}
    >
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-end">
        <Field id="school_month" label="Month">
          <Input
            id="school_month"
            type="month"
            value={month}
            onChange={(event) => onMonthChange(event.target.value)}
            className="h-9 w-full rounded-xl sm:w-44"
          />
        </Field>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" />
          </span>
          <p className="mt-4 text-sm font-medium">
            Couldn&rsquo;t build this report
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setReloadKey((key) => key + 1);
            }}
            className="mt-4 rounded-xl px-3 py-1.5 text-sm font-bold text-brand-600 underline transition-colors hover:text-brand-700"
          >
            Try again
          </button>
        </div>
      ) : !report ? (
        <RowsSkeleton rows={5} />
      ) : sections.length === 0 ? (
        <SectionEmpty
          icon={Layers}
          title="No sections set up"
          description="Once classes and sections exist for this year, their attendance shows up here."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-6 border-b bg-muted/25 px-4 py-3.5">
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Sections
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatNumber(sections.length)}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                School average
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {report.totals.average_attendance_pct === null
                  ? "—"
                  : `${Math.round(report.totals.average_attendance_pct)}%`}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Students below 75%
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatNumber(report.totals.below_75_count)}
              </p>
            </div>
          </div>

          <ul className="divide-y">
            {sections.map((row) => (
              <SectionRow key={String(row.section_id)} row={row} />
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function PrincipalAttendanceView() {
  const { scope, error, reload } = useSchoolScope();
  const [month, setMonth] = React.useState(CURRENT_MONTH);
  // Shared with the drill-down panel below, the same way the admin screen keeps
  // one section selection across its two tabs.
  const [sectionId, setSectionId] = React.useState("");

  if (error) {
    return (
      <LoadErrorCard
        title="We couldn't load your sections"
        message={error}
        onRetry={reload}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="How the whole school is attending this month, then any section in detail."
        year={yearLabel(scope?.year)}
        action={<ViewOnlyChip />}
      />

      {!scope ? (
        <Card className="gap-0 py-0 shadow-card">
          <div className="flex flex-wrap items-center gap-3 border-b bg-muted/25 px-4 py-3.5">
            <Skeleton className="size-9 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-56 max-w-full rounded-md" />
            </div>
          </div>
          <RowsSkeleton rows={5} />
        </Card>
      ) : !scope.year ? (
        <NoYearCard description="Attendance is recorded against an academic year. Ask the office to set one as current." />
      ) : (
        <>
          <SchoolPanel
            year={scope.year}
            month={month}
            onMonthChange={setMonth}
          />

          {/* The admin summary panel reads only — a principal gets it unchanged. */}
          <SummaryPanel
            sections={scope.sections as Section[]}
            sectionId={sectionId}
            onSectionChange={setSectionId}
          />
        </>
      )}
    </div>
  );
}
