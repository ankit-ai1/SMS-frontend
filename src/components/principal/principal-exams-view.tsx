"use client";

import * as React from "react";
import {
  ChevronDown,
  FileBadge,
  MousePointerClick,
  NotebookPen,
  UsersRound,
} from "lucide-react";

import {
  LoadErrorCard,
  NoYearCard,
  PageHeader,
  RowsSkeleton,
  ViewOnlyChip,
} from "@/components/principal/principal-chrome";
import { useSchoolScope, yearLabel } from "@/components/principal/use-school-scope";
import { marksTone, percentTone, toMarks } from "@/components/exams/exam-meta";
import { Field, SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { SectionPicker } from "@/components/shared/section-picker";
import { Card } from "@/components/ui/card";
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
  listExamGrades,
  listExamSubjects,
  listExams,
  listReportCards,
  listSectionRoster,
  sameId,
  type Exam,
  type ExamGrade,
  type ExamSubject,
  type ReportCard,
  type RosterEntry,
  type Section,
  type Term,
} from "@/lib/api";
import { formatDate, formatNumber, initialsFrom } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "results", label: "Results", icon: NotebookPen },
  { value: "report-cards", label: "Report Cards", icon: FileBadge },
];

/* -------------------------------------------------------------------------- */
/*                                   Results                                  */
/* -------------------------------------------------------------------------- */

type ResultsLoaded = {
  /** The exam subject this data answers — see `requestKey` below. */
  requestKey: string;
  grades: ExamGrade[];
};

function GradeRow({
  grade,
  subject,
}: {
  grade: ExamGrade;
  subject: ExamSubject | undefined;
}) {
  const fullName = `${grade.first_name ?? ""} ${grade.last_name ?? ""}`.trim();
  const marks = toMarks(grade.marks_obtained);
  const max = toMarks(subject?.max_marks);
  const pass = toMarks(subject?.pass_marks);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-[0.7rem] font-bold text-brand-700 ring-1 ring-brand-100">
        {initialsFrom(fullName)}
      </span>

      <div className="min-w-0 flex-1 basis-44">
        <p className="truncate text-sm font-semibold">{fullName || "—"}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
          {grade.admission_number || "—"}
        </p>
      </div>

      {grade.remarks?.trim() && (
        <p className="min-w-0 flex-1 basis-40 truncate text-xs text-muted-foreground">
          {grade.remarks}
        </p>
      )}

      {grade.grade?.trim() && (
        <span className="inline-flex shrink-0 items-center rounded-lg bg-muted px-2 py-0.5 text-xs font-semibold">
          {grade.grade}
        </span>
      )}

      <span
        className={cn(
          "w-24 shrink-0 text-right text-sm font-semibold tabular-nums",
          marksTone(marks, max, pass)
        )}
      >
        {marks !== null ? formatNumber(marks) : "—"}
        {max !== null && (
          <span className="text-muted-foreground"> / {formatNumber(max)}</span>
        )}
      </span>
    </li>
  );
}

function ResultsTab({
  academicYearId,
  terms,
}: {
  academicYearId: string | number;
  terms: Term[];
}) {
  const [exams, setExams] = React.useState<Exam[] | null>(null);
  const [examsError, setExamsError] = React.useState<string | null>(null);
  const [examId, setExamId] = React.useState("");

  const [loadedSubjects, setLoadedSubjects] = React.useState<{
    examId: string;
    subjects: ExamSubject[];
  } | null>(null);
  const [examSubjectId, setExamSubjectId] = React.useState("");

  const [loaded, setLoaded] = React.useState<ResultsLoaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    listExams({ academic_year_id: academicYearId })
      .then((loaded) => {
        if (cancelled) return;
        setExams(loaded);
        setExamsError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setExamsError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading exams."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [academicYearId, reloadKey]);

  React.useEffect(() => {
    if (!examId) return;
    let cancelled = false;

    listExamSubjects(examId)
      .then((loaded) => {
        if (!cancelled) setLoadedSubjects({ examId, subjects: loaded });
      })
      .catch(() => {
        // A subject list that will not load reads as an exam with no subjects.
        if (!cancelled) setLoadedSubjects({ examId, subjects: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [examId]);

  // Subjects belong to one exam, so anything held for a different one is stale.
  const subjects =
    loadedSubjects?.examId === examId ? loadedSubjects.subjects : [];

  const requestKey = `${examSubjectId}|${reloadKey}`;

  React.useEffect(() => {
    if (!examSubjectId) return;
    let cancelled = false;

    listExamGrades(examSubjectId)
      .then((grades) => {
        if (cancelled) return;
        setLoaded({ requestKey, grades });
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading results."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, examSubjectId]);

  const isStale = loaded?.requestKey !== requestKey;
  const grades = loaded?.grades ?? [];
  const subject = subjects.find((entry) => String(entry.id) === examSubjectId);
  const max = toMarks(subject?.max_marks);
  const pass = toMarks(subject?.pass_marks);
  const scored = grades
    .map((grade) => toMarks(grade.marks_obtained))
    .filter((value): value is number => value !== null);
  const average =
    scored.length > 0
      ? scored.reduce((sum, value) => sum + value, 0) / scored.length
      : null;
  const passed =
    pass != null ? scored.filter((value) => value >= pass).length : null;

  function termName(exam: Exam): string {
    const term = terms.find((entry) => sameId(entry.id, exam.term_id));
    return term?.name?.trim() ?? "";
  }

  return (
    <Panel
      title="Exam results"
      description="Marks recorded for one exam subject, as entered by the teacher."
      icon={NotebookPen}
    >
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-end">
        <Field id="principal_exam" label="Exam">
          <Select
            value={examId}
            onValueChange={(value) => {
              setExamId(value);
              // The old subject belongs to the old exam.
              setExamSubjectId("");
            }}
            disabled={!exams || exams.length === 0}
          >
            <SelectTrigger
              id="principal_exam"
              className="h-9 w-full rounded-xl sm:w-64"
            >
              <SelectValue
                placeholder={
                  exams && exams.length === 0
                    ? "No exams scheduled"
                    : "Select an exam"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(exams ?? []).map((exam) => (
                <SelectItem key={exam.id} value={String(exam.id)}>
                  {exam.name?.trim() || `Exam ${exam.id}`}
                  {termName(exam) ? ` — ${termName(exam)}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="principal_exam_subject" label="Subject">
          <Select
            value={examSubjectId}
            onValueChange={setExamSubjectId}
            disabled={!examId || subjects.length === 0}
          >
            <SelectTrigger
              id="principal_exam_subject"
              className="h-9 w-full rounded-xl sm:w-64"
            >
              <SelectValue
                placeholder={
                  !examId
                    ? "Pick an exam first"
                    : subjects.length === 0
                      ? "No subjects added"
                      : "Select a subject"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((entry) => (
                <SelectItem key={entry.id} value={String(entry.id)}>
                  {entry.subject_name?.trim() || `Subject ${entry.subject_id}`}
                  {entry.exam_date ? ` — ${formatDate(entry.exam_date)}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {examsError ? (
        <SectionError
          message={examsError}
          onRetry={() => {
            setExamsError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      ) : !examSubjectId ? (
        <SectionEmpty
          icon={MousePointerClick}
          title="Pick an exam subject"
          description="Choose an exam and one of its subjects above to see how the school scored."
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
        <RowsSkeleton />
      ) : grades.length === 0 ? (
        <SectionEmpty
          icon={NotebookPen}
          title="No marks entered yet"
          description="Once the teacher records marks for this subject, they show up here."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-6 border-b bg-muted/25 px-4 py-3.5">
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Graded
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatNumber(scored.length)}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Average
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {average !== null
                  ? `${formatNumber(Math.round(average))}${
                      max !== null ? ` / ${formatNumber(max)}` : ""
                    }`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Passed
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {passed !== null
                  ? `${formatNumber(passed)} of ${formatNumber(scored.length)}`
                  : "—"}
              </p>
            </div>
          </div>

          <ul className="divide-y">
            {grades.map((grade) => (
              <GradeRow
                key={String(grade.enrollment_id)}
                grade={grade}
                subject={subject}
              />
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Report cards                                */
/* -------------------------------------------------------------------------- */

function ReportCardRow({ card, terms }: { card: ReportCard; terms: Term[] }) {
  const percentage = toMarks(card.percentage);
  const total = toMarks(card.total_marks);
  const term = terms.find((entry) => sameId(entry.id, card.term_id));

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-3.5 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <FileBadge className="size-3.5" />
      </span>

      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-sm font-medium">
          {term?.name?.trim() || (card.term_id ? `Term ${card.term_id}` : "Term")}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {card.generated_at
            ? `Generated ${formatDate(card.generated_at)}`
            : "Generated"}
        </p>
      </div>

      <div className="flex shrink-0 gap-5 text-right">
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
            Total
          </p>
          <p className="mt-0.5 text-sm tabular-nums">
            {total !== null ? formatNumber(total) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
            Rank
          </p>
          <p className="mt-0.5 text-sm tabular-nums">
            {card.rank != null ? `#${card.rank}` : "—"}
          </p>
        </div>
      </div>

      {card.overall_grade && (
        <span className="inline-flex shrink-0 items-center rounded-lg bg-muted px-2 py-0.5 text-xs font-semibold">
          {card.overall_grade}
        </span>
      )}

      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-lg px-2 py-0.5 text-xs font-semibold ring-1 tabular-nums",
          percentTone(percentage)
        )}
      >
        {percentage !== null ? `${percentage}%` : "—"}
      </span>
    </li>
  );
}

function StudentCard({
  entry,
  terms,
}: {
  entry: RosterEntry;
  terms: Term[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [cards, setCards] = React.useState<ReportCard[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fullName = `${entry.first_name} ${entry.last_name}`.trim();

  // Report cards load per student, so they are fetched only once expanded.
  React.useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    listReportCards(entry.enrollment_id)
      .then((loaded) => {
        if (cancelled) return;
        setCards(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading report cards."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, entry.enrollment_id]);

  return (
    <li className="px-4 py-3 transition-colors hover:bg-muted/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 basis-56 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[0.7rem] font-semibold text-brand-700">
            {initialsFrom(fullName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {fullName || "—"}
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
              {entry.roll_number != null && String(entry.roll_number) !== ""
                ? `Roll ${entry.roll_number} · `
                : ""}
              {entry.admission_number || "—"}
            </span>
          </span>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="mt-3">
          {error ? (
            <p className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive">
              {error}
            </p>
          ) : !cards ? (
            <div className="space-y-2">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : cards.length === 0 ? (
            <p className="rounded-xl bg-muted/60 px-3.5 py-2.5 text-xs text-muted-foreground">
              No report card published for this student yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {cards.map((card) => (
                <ReportCardRow key={card.id} card={card} terms={terms} />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function ReportCardsTab({
  sections,
  sectionId,
  onSectionChange,
  terms,
}: {
  sections: Section[];
  sectionId: string;
  onSectionChange: (value: string) => void;
  terms: Term[];
}) {
  const [roster, setRoster] = React.useState<RosterEntry[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const requestKey = `${sectionId}|${reloadKey}`;
  const [loadedKey, setLoadedKey] = React.useState("");

  React.useEffect(() => {
    if (!sectionId) return;
    let cancelled = false;

    listSectionRoster(sectionId)
      .then((loaded) => {
        if (cancelled) return;
        setRoster(loaded);
        setLoadedKey(requestKey);
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
  }, [requestKey, sectionId]);

  const isStale = loadedKey !== requestKey;

  return (
    <Panel
      title="Report cards"
      description="Published term results, student by student."
      icon={FileBadge}
    >
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-end">
        <SectionPicker
          id="principal_reportcards_section"
          sections={sections}
          value={sectionId}
          onChange={onSectionChange}
        />
      </div>

      {!sectionId ? (
        <SectionEmpty
          icon={MousePointerClick}
          title="Pick a section to start"
          description="Choose a section above, then open a student to see their report cards."
        />
      ) : error ? (
        <SectionError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      ) : isStale || !roster ? (
        <RowsSkeleton />
      ) : roster.length === 0 ? (
        <SectionEmpty
          icon={UsersRound}
          title="No students in this section"
          description="Enroll students into this section before report cards can be published."
        />
      ) : (
        <ul className="divide-y">
          {roster.map((entry) => (
            <StudentCard
              key={String(entry.enrollment_id)}
              entry={entry}
              terms={terms}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function PrincipalExamsView() {
  const { scope, error, reload } = useSchoolScope();
  // Shared across tabs: switching keeps the section you picked.
  const [sectionId, setSectionId] = React.useState("");

  if (error) {
    return (
      <LoadErrorCard
        title="We couldn't load your exam setup"
        message={error}
        onRetry={reload}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams"
        description="How the school scored, subject by subject, and the report cards published from it."
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
          <RowsSkeleton rows={4} />
        </Card>
      ) : !scope.year ? (
        <NoYearCard description="Exams are tied to an academic year. Ask the office to set one as current." />
      ) : (
        <Tabs defaultValue="results" className="gap-5">
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

          <TabsContent value="results">
            <ResultsTab academicYearId={scope.year.id} terms={scope.terms} />
          </TabsContent>

          <TabsContent value="report-cards">
            <ReportCardsTab
              sections={scope.sections}
              sectionId={sectionId}
              onSectionChange={setSectionId}
              terms={scope.terms}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
