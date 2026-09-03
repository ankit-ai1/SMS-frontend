"use client";

import * as React from "react";
import {
  CalendarRange,
  ChartColumn,
  IndianRupee,
  Layers,
  MousePointerClick,
  NotebookPen,
  TrendingUp,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Field, SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAttendanceReport,
  getCurrentAcademicYear,
  getExamReport,
  getFeeReport,
  listExams,
  type AcademicYear,
  type AttendanceReport,
  type Exam,
  type ExamReport,
  type FeeReport,
} from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "attendance", label: "Attendance", icon: ChartColumn },
  { value: "fees", label: "Fees", icon: Wallet },
  { value: "exams", label: "Exams", icon: NotebookPen },
];

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

/* -------------------------------------------------------------------------- */
/*                                   Pieces                                   */
/* -------------------------------------------------------------------------- */

function Stat({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Card className={cn("min-h-32 border-0 p-0 shadow-card ring-1", tone)}>
      <CardContent className="flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">{label}</p>
            <p className="mt-1 text-xs font-semibold opacity-65">{helper}</p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white/45">
            <Icon className="size-4.5" />
          </span>
        </div>
        <p className="mt-6 truncate text-2xl font-black tabular-nums sm:text-3xl">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function StatsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

function RowsSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="size-9 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-[50%] rounded-md" />
            <Skeleton className="h-3 w-56 max-w-[70%] rounded-md" />
          </div>
          <Skeleton className="h-3 w-16 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

/** Green is fine, amber needs watching, red needs a conversation. */
function barTone(percent: number): string {
  if (percent >= 90) return "bg-brand-500";
  if (percent >= 75) return "bg-gold";
  return "bg-destructive";
}

function Bar({ percent }: { percent: number | null }) {
  return (
    <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${Math.round(percent ?? 0)} percent`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            barTone(percent ?? 0)
          )}
          style={{ width: `${percent ?? 0}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums">
        {percent === null ? "—" : `${Math.round(percent)}%`}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Attendance                                 */
/* -------------------------------------------------------------------------- */

function AttendanceReportTab({ year }: { year: AcademicYear }) {
  const [month, setMonth] = React.useState(CURRENT_MONTH);
  const [loaded, setLoaded] = React.useState<{
    key: string;
    report: AttendanceReport;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const requestKey = `${year.id}|${month}|${reloadKey}`;

  React.useEffect(() => {
    let cancelled = false;

    getAttendanceReport({ academic_year_id: year.id, month: month || null })
      .then((report) => {
        if (cancelled) return;
        setLoaded({ key: requestKey, report });
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

  const report = loaded?.key === requestKey ? loaded.report : null;
  // Worst first — the sections that need a conversation lead the list.
  const sections = [...(report?.sections ?? [])].sort(
    (a, b) => (a.average_attendance_pct ?? 101) - (b.average_attendance_pct ?? 101)
  );

  return (
    <div className="space-y-6">
      {!report ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="School Average"
            value={
              report.totals.average_attendance_pct === null
                ? "—"
                : `${Math.round(report.totals.average_attendance_pct)}%`
            }
            helper={month ? "This month" : "This year"}
            icon={TrendingUp}
            tone="bg-brand-100 text-brand-900 ring-brand-200"
          />
          <Stat
            label="Days Marked"
            value={formatNumber(report.totals.total_marked)}
            helper={`${formatNumber(report.totals.total_present)} present`}
            icon={CalendarRange}
            tone="bg-gold-soft text-neutral-900 ring-gold/20"
          />
          <Stat
            label="Below 75%"
            value={formatNumber(report.totals.below_75_count)}
            helper="Students, not sections"
            icon={TriangleAlert}
            tone="bg-muted text-foreground ring-border"
          />
        </div>
      )}

      <Panel
        title="Section by section"
        description="Every section's average, worst first. A section with nothing marked still gets a row."
        icon={Layers}
        action={
          <Field id="report_month" label="Month">
            <Input
              id="report_month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="h-9 w-full rounded-xl sm:w-44"
            />
          </Field>
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
        ) : !report ? (
          <RowsSkeleton />
        ) : sections.length === 0 ? (
          <SectionEmpty
            icon={Layers}
            title="No sections set up"
            description="Once classes and sections exist for this year, their attendance shows up here."
          />
        ) : (
          <ul className="divide-y">
            {sections.map((row) => (
              <li
                key={String(row.section_id)}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <Layers className="size-4" />
                </span>

                <div className="min-w-0 flex-1 basis-44">
                  <p className="truncate text-sm font-semibold">
                    {[row.class_name?.trim(), row.section_name?.trim()]
                      .filter(Boolean)
                      .join(" — ") || `Section ${row.section_id}`}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                    {row.total_marked === 0
                      ? "Nothing marked"
                      : `${formatNumber(row.students_with_records)} tracked · ${formatNumber(
                          row.below_75_count
                        )} below 75%`}
                  </p>
                </div>

                <Bar percent={row.average_attendance_pct} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Fees                                    */
/* -------------------------------------------------------------------------- */

function FeeReportTab({ year }: { year: AcademicYear }) {
  const [loaded, setLoaded] = React.useState<{
    key: string;
    report: FeeReport;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const requestKey = `${year.id}|${reloadKey}`;

  React.useEffect(() => {
    let cancelled = false;

    getFeeReport({ academic_year_id: year.id })
      .then((report) => {
        if (cancelled) return;
        setLoaded({ key: requestKey, report });
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
  }, [requestKey, year.id]);

  const report = loaded?.key === requestKey ? loaded.report : null;
  const overdue = (report?.classes ?? []).reduce(
    (sum, row) => sum + row.overdue_allocations,
    0
  );

  return (
    <div className="space-y-6">
      {!report ? (
        <StatsSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Billed"
            value={formatCurrency(report.totals.billed)}
            helper="This academic year"
            icon={IndianRupee}
            tone="bg-brand-100 text-brand-900 ring-brand-200"
          />
          <Stat
            label="Collected"
            value={formatCurrency(report.totals.collected)}
            helper={
              report.totals.collection_pct === null
                ? "Nothing billed yet"
                : `${Math.round(report.totals.collection_pct)}% of billed`
            }
            icon={Wallet}
            tone="bg-brand-50 text-brand-800 ring-brand-100"
          />
          <Stat
            label="Outstanding"
            value={formatCurrency(report.totals.outstanding)}
            helper="Still to come in"
            icon={TrendingUp}
            tone="bg-gold-soft text-neutral-900 ring-gold/20"
          />
          <Stat
            label="Overdue"
            value={formatNumber(overdue)}
            helper="Past due, unpaid"
            icon={TriangleAlert}
            tone="bg-muted text-foreground ring-border"
          />
        </div>
      )}

      <Panel
        title="Class by class"
        description="What each class was billed, what has come in, and what is still owed."
        icon={IndianRupee}
      >
        {error ? (
          <SectionError
            message={error}
            onRetry={() => {
              setError(null);
              setReloadKey((key) => key + 1);
            }}
          />
        ) : !report ? (
          <RowsSkeleton />
        ) : report.classes.length === 0 ? (
          <SectionEmpty
            icon={IndianRupee}
            title="Nothing billed yet"
            description="Once fees are allocated to students, the collection picture shows up here."
          />
        ) : (
          <ul className="divide-y">
            {report.classes.map((row) => {
              const percent =
                row.billed > 0 ? (row.collected / row.billed) * 100 : null;

              return (
                <li
                  key={String(row.class_id)}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <Layers className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-sm font-semibold">
                      {row.class_name?.trim() || `Class ${row.class_id}`}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                      {formatNumber(row.students)} students ·{" "}
                      {formatNumber(row.unpaid_allocations)} unpaid
                      {row.overdue_allocations > 0
                        ? ` · ${formatNumber(row.overdue_allocations)} overdue`
                        : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-5 text-right">
                    {[
                      ["Billed", formatCurrency(row.billed)],
                      ["Collected", formatCurrency(row.collected)],
                      ["Outstanding", formatCurrency(row.outstanding)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
                          {label}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Bar percent={percent} />
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Exams                                   */
/* -------------------------------------------------------------------------- */

function ExamReportTab({ year }: { year: AcademicYear }) {
  const [exams, setExams] = React.useState<Exam[]>([]);
  const [examId, setExamId] = React.useState("");
  const [loaded, setLoaded] = React.useState<{
    key: string;
    report: ExamReport;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    listExams({ academic_year_id: year.id })
      .then((loaded) => {
        if (!cancelled) setExams(loaded);
      })
      .catch(() => {
        if (!cancelled) setExams([]);
      });

    return () => {
      cancelled = true;
    };
  }, [year.id]);

  const requestKey = `${examId}|${reloadKey}`;

  React.useEffect(() => {
    if (!examId) return;
    let cancelled = false;

    getExamReport({ exam_id: examId })
      .then((report) => {
        if (cancelled) return;
        setLoaded({ key: requestKey, report });
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
  }, [requestKey, examId]);

  const report = loaded?.key === requestKey ? loaded.report : null;

  return (
    <div className="space-y-6">
      {examId && report && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Papers Graded"
            value={formatNumber(report.totals.graded)}
            helper="Marks entered"
            icon={NotebookPen}
            tone="bg-brand-100 text-brand-900 ring-brand-200"
          />
          <Stat
            label="Passed"
            value={formatNumber(report.totals.passed)}
            helper="Across all subjects"
            icon={TrendingUp}
            tone="bg-brand-50 text-brand-800 ring-brand-100"
          />
          <Stat
            label="Pass Rate"
            value={
              report.totals.pass_pct === null
                ? "—"
                : `${Math.round(report.totals.pass_pct)}%`
            }
            helper="Of graded papers"
            icon={ChartColumn}
            tone="bg-gold-soft text-neutral-900 ring-gold/20"
          />
        </div>
      )}

      <Panel
        title="Subject by subject"
        description="Average, highest, lowest and pass rate for every paper in the exam."
        icon={NotebookPen}
        action={
          <Field id="report_exam" label="Examination">
            <Select
              value={examId}
              onValueChange={setExamId}
              disabled={exams.length === 0}
            >
              <SelectTrigger id="report_exam" className="h-9 w-full rounded-xl sm:w-64">
                <SelectValue
                  placeholder={
                    exams.length === 0 ? "No exams scheduled" : "Select an exam"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={String(exam.id)}>
                    {exam.name?.trim() || `Exam ${exam.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        }
      >
        {!examId ? (
          <SectionEmpty
            icon={MousePointerClick}
            title="Pick an exam"
            description="Choose an exam above to see how each subject went."
          />
        ) : error ? (
          <SectionError
            message={error}
            onRetry={() => {
              setError(null);
              setReloadKey((key) => key + 1);
            }}
          />
        ) : !report ? (
          <RowsSkeleton />
        ) : report.subjects.length === 0 ? (
          <SectionEmpty
            icon={NotebookPen}
            title="No subjects on this exam"
            description="Add subjects to the exam before a report can be built."
          />
        ) : (
          <ul className="divide-y">
            {report.subjects.map((row) => (
              <li
                key={String(row.exam_subject_id)}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <NotebookPen className="size-4" />
                </span>

                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-semibold">
                    {row.subject_name?.trim() || "Subject"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                    {row.graded === 0
                      ? "Not graded yet"
                      : `${formatNumber(row.graded)} graded · pass at ${formatNumber(
                          row.pass_marks
                        )}/${formatNumber(row.max_marks)}`}
                    {row.class_name?.trim() ? ` · ${row.class_name}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 gap-5 text-right">
                  {[
                    ["Average", row.average_marks],
                    ["Highest", row.highest_marks],
                    ["Lowest", row.lowest_marks],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
                        {label}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums">
                        {value === null || value === undefined
                          ? "—"
                          : formatNumber(Math.round(Number(value)))}
                      </p>
                    </div>
                  ))}
                </div>

                <Bar percent={row.pass_pct} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function ReportsView() {
  const [year, setYear] = React.useState<AcademicYear | null | undefined>(
    undefined
  );
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    getCurrentAcademicYear()
      .then((loaded) => {
        if (cancelled) return;
        setYear(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading your school."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const yearName = year?.name?.trim() || (year ? `Year ${year.id}` : "");

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Reports
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Attendance, collection and results across the whole school — the
            numbers you are asked for, already added up.
          </p>
        </div>

        {yearName && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
            <CalendarRange className="size-3.5" />
            {yearName}
          </span>
        )}
      </div>

      {error ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" />
            </span>
            <p className="mt-4 text-sm font-medium">
              We couldn&rsquo;t load your reports
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
            <Button
              size="lg"
              onClick={() => {
                setError(null);
                setReloadKey((key) => key + 1);
              }}
              className="mt-5 rounded-xl shadow-brand transition-all hover:bg-brand-700"
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : year === undefined ? (
        <StatsSkeleton />
      ) : !year ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <CalendarRange className="size-6" />
            </span>
            <p className="mt-4 text-sm font-medium">No academic year set up</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Reports are built per academic year. Ask the office to set one as
              current.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="attendance" className="gap-5">
          {/* The list keeps its natural width; the wrapper scrolls when narrow. */}
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="w-max gap-0.5 rounded-xl p-1">
              {TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="gap-2 rounded-lg px-3.5 data-active:text-brand-700 dark:data-active:text-brand-300"
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="attendance">
            <AttendanceReportTab year={year} />
          </TabsContent>
          <TabsContent value="fees">
            <FeeReportTab year={year} />
          </TabsContent>
          <TabsContent value="exams">
            <ExamReportTab year={year} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
