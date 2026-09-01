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
import { sectionLabel } from "@/components/shared/section-picker";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getAttendanceSummary, type Section } from "@/lib/api";
import { formatNumber } from "@/lib/format";

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

/** Sections are fetched one at a time; a small pool keeps a big school quick. */
const CONCURRENCY = 4;

type SectionAverage = {
  section: Section;
  /** Null when the section has no marked days in the month. */
  percent: number | null;
  students: number;
  belowThreshold: number;
};

type Loaded = {
  /** The month this data answers — see `requestKey` below. */
  requestKey: string;
  rows: SectionAverage[];
};

async function mapWithPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run())
  );
  return results;
}

/** Green is fine, amber needs watching, red needs a conversation. */
function barTone(percent: number): string {
  if (percent >= 90) return "bg-emerald-500";
  if (percent >= 75) return "bg-amber-500";
  return "bg-destructive";
}

function SectionRow({ row }: { row: SectionAverage }) {
  const hasRecords = row.percent !== null;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <Layers className="size-4" />
      </span>

      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-sm font-semibold">
          {sectionLabel(row.section)}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
          {hasRecords
            ? `${formatNumber(row.students)} tracked · ${formatNumber(
                row.belowThreshold
              )} below 75%`
            : "No attendance marked"}
        </p>
      </div>

      <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${Math.round(row.percent ?? 0)} percent present`}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${barTone(
              row.percent ?? 0
            )}`}
            style={{ width: `${hasRecords ? row.percent : 0}%` }}
          />
        </div>
        <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums">
          {hasRecords ? `${Math.round(row.percent ?? 0)}%` : "—"}
        </span>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                             School-wide summary                            */
/* -------------------------------------------------------------------------- */

function SchoolPanel({
  sections,
  month,
  onMonthChange,
}: {
  sections: Section[];
  month: string;
  onMonthChange: (value: string) => void;
}) {
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Identifies the data the controls ask for. Loading is then simply "what we
  // hold isn't what we asked for" — no loading flag to keep in sync.
  const requestKey = `${month}|${sections.map((s) => s.id).join(",")}`;

  React.useEffect(() => {
    if (!month || sections.length === 0) return;
    let cancelled = false;

    mapWithPool(sections, CONCURRENCY, async (section): Promise<SectionAverage> => {
      // One weak section must not blank the whole report.
      const summary = await getAttendanceSummary({
        section_id: section.id,
        month,
      }).catch(() => []);

      const tracked = summary.filter((row) => Number(row.total_days) > 0);
      if (tracked.length === 0) {
        return { section, percent: null, students: 0, belowThreshold: 0 };
      }

      // `present_pct` may be a percentage or a 0–1 fraction. A whole section
      // sitting at 1% or below is not a real case, so read that as fractions.
      const asFraction = tracked.every((row) => Number(row.present_pct) <= 1);
      const percents = tracked.map((row) => {
        const raw = Number(row.present_pct);
        const value = asFraction ? raw * 100 : raw;
        return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
      });

      return {
        section,
        percent:
          percents.reduce((sum, value) => sum + value, 0) / percents.length,
        students: tracked.length,
        belowThreshold: percents.filter((value) => value < 75).length,
      };
    })
      .then((rows) => {
        if (cancelled) return;
        setLoaded({ requestKey, rows });
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
  }, [requestKey, month, sections]);

  const isStale = loaded?.requestKey !== requestKey;
  const rows = loaded?.rows ?? [];
  const tracked = rows.filter((row) => row.percent !== null);
  const schoolAverage =
    tracked.length > 0
      ? tracked.reduce((sum, row) => sum + (row.percent ?? 0), 0) / tracked.length
      : null;

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

      {sections.length === 0 ? (
        <SectionEmpty
          icon={Layers}
          title="No sections set up"
          description="Once classes and sections exist for this year, their attendance shows up here."
        />
      ) : error ? (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" />
          </span>
          <p className="mt-4 text-sm font-medium">
            Couldn&rsquo;t build this report
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
        </div>
      ) : isStale ? (
        <RowsSkeleton rows={5} />
      ) : (
        <>
          <div className="flex flex-wrap gap-6 border-b bg-muted/25 px-4 py-3.5">
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Sections
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatNumber(rows.length)}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                School average
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {schoolAverage !== null ? `${Math.round(schoolAverage)}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Sections below 75%
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatNumber(
                  tracked.filter((row) => (row.percent ?? 0) < 75).length
                )}
              </p>
            </div>
          </div>

          <ul className="divide-y">
            {/* Worst first: the sections that need a conversation lead. */}
            {[...rows]
              .sort((a, b) => (a.percent ?? 101) - (b.percent ?? 101))
              .map((row) => (
                <SectionRow key={String(row.section.id)} row={row} />
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
            sections={scope.sections}
            month={month}
            onMonthChange={setMonth}
          />

          {/* The admin summary panel reads only — a principal gets it unchanged. */}
          <SummaryPanel
            sections={scope.sections}
            sectionId={sectionId}
            onSectionChange={setSectionId}
          />
        </>
      )}
    </div>
  );
}
