"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarRange,
  ChevronRight,
  NotebookPen,
  PenLine,
  Plus,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";

import { AddSubjectDialog } from "@/components/exams/add-subject-dialog";
import { toMarks } from "@/components/exams/exam-meta";
import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCurrentAcademicYear,
  getExam,
  listClasses,
  listExamSubjects,
  listExamTypes,
  listSubjects,
  listTerms,
  sameId,
  type Exam,
  type ExamSubject,
  type SchoolClass,
  type Subject,
} from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";

type Loaded = {
  exam: Exam;
  subjects: Subject[];
  classes: SchoolClass[];
  typeName: string;
  termName: string;
};

/* -------------------------------------------------------------------------- */
/*                                   Chrome                                   */
/* -------------------------------------------------------------------------- */

function Breadcrumb({ name }: { name?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link
        href="/exams"
        className="rounded-md font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Exams
      </Link>
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
      {name ? (
        <span className="truncate font-medium">{name}</span>
      ) : (
        <Skeleton className="h-4 w-28 rounded-md" />
      )}
    </nav>
  );
}

function HeroFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof NotebookPen;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-card">
      <div className="border-b bg-gradient-to-br from-brand-50 via-card to-card px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-5">
          <Skeleton className="size-18 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-56 max-w-full rounded-md" />
            <Skeleton className="h-4 w-40 rounded-md" />
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 px-5 py-3.5">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Subjects                                  */
/* -------------------------------------------------------------------------- */

function SubjectRow({
  examId,
  examSubject,
  subjectName,
  className,
}: {
  examId: string;
  examSubject: ExamSubject;
  subjectName: string;
  className: string;
}) {
  const max = toMarks(examSubject.max_marks);
  const pass = toMarks(examSubject.pass_marks);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <BookOpen className="size-4.5" />
      </span>

      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-sm font-medium">{subjectName}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {className ? `${className} · ` : ""}
          {examSubject.exam_date
            ? formatDate(examSubject.exam_date)
            : "Date not set"}
        </p>
      </div>

      <div className="flex shrink-0 gap-5 text-right">
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
            Max
          </p>
          <p className="mt-0.5 text-sm font-medium tabular-nums">
            {max !== null ? formatNumber(max) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
            Pass
          </p>
          <p className="mt-0.5 text-sm tabular-nums">
            {pass !== null ? formatNumber(pass) : "—"}
          </p>
        </div>
      </div>

      <Button asChild variant="outline" size="sm" className="shrink-0 rounded-lg">
        <Link href={`/exams/${examId}/grades/${examSubject.id}`}>
          <PenLine className="size-3.5" />
          Enter Grades
        </Link>
      </Button>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function ExamDetailView({ examId }: { examId: string }) {
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [examSubjects, setExamSubjects] = React.useState<ExamSubject[] | null>(
    null
  );
  const [subjectsError, setSubjectsError] = React.useState<string | null>(null);
  const [subjectsKey, setSubjectsKey] = React.useState(0);
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function load(): Promise<Loaded> {
      const [exam, subjects, classes, examTypes] = await Promise.all([
        getExam(examId),
        listSubjects(),
        listClasses(),
        listExamTypes(),
      ]);

      const typeName =
        examTypes.find((type) => sameId(type.id, exam.exam_type_id))?.name ?? "";

      // Terms hang off the year, so they are only worth fetching once the exam
      // says which year it belongs to.
      let termName = "";
      if (exam.term_id != null) {
        const year =
          exam.academic_year_id != null
            ? { id: exam.academic_year_id }
            : await getCurrentAcademicYear();
        if (year) {
          const terms = await listTerms(year.id);
          const term = terms.find((entry) => sameId(entry.id, exam.term_id));
          termName = term?.name?.trim() || (term ? `Term ${term.id}` : "");
        }
      }

      return { exam, subjects, classes, typeName, termName };
    }

    load()
      .then((next) => {
        if (cancelled) return;
        setLoaded(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading this exam."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [examId, reloadKey]);

  React.useEffect(() => {
    let cancelled = false;

    listExamSubjects(examId)
      .then((next) => {
        if (cancelled) return;
        setExamSubjects(next);
        setSubjectsError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setSubjectsError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading subjects."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [examId, subjectsKey]);

  const exam = loaded?.exam ?? null;

  function nameOfSubject(examSubject: ExamSubject): string {
    return (
      examSubject.subject_name?.trim() ||
      loaded?.subjects.find((entry) => sameId(entry.id, examSubject.subject_id))
        ?.name ||
      "Subject"
    );
  }

  function nameOfClass(id: string | number | null | undefined): string {
    if (id == null) return "All classes";
    return (
      loaded?.classes.find((entry) => sameId(entry.id, id))?.name ?? ""
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumb />
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" />
            </span>
            <p className="mt-4 text-sm font-medium">
              We couldn&rsquo;t load this exam
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {error}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button
                size="lg"
                onClick={() => {
                  setError(null);
                  setReloadKey((key) => key + 1);
                }}
                className="rounded-xl shadow-brand transition-all hover:bg-brand-700 hover:shadow-lift"
              >
                <RefreshCw className="size-4" />
                Try again
              </Button>
              <Button variant="outline" size="lg" asChild className="rounded-xl">
                <Link href="/exams">Back to exams</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb name={exam?.name} />

      {/* ------------------------------- Hero ------------------------------- */}
      {!exam ? (
        <HeroSkeleton />
      ) : (
        <Card className="gap-0 overflow-hidden py-0 shadow-card">
          <div className="relative border-b bg-gradient-to-br from-brand-50 via-card to-card px-5 py-6 sm:px-6">
            {/* Faint grid, so the wash reads as designed rather than a gradient. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(24rem_12rem_at_0%_0%,black,transparent)]"
            />

            <div className="relative flex flex-wrap items-center gap-5">
              <span className="flex size-18 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-brand ring-4 ring-card">
                <NotebookPen className="size-7" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                    {exam.name}
                  </h2>
                  {loaded?.typeName && (
                    <span className="rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
                      {loaded.typeName}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {examSubjects === null
                    ? "Loading subjects…"
                    : examSubjects.length === 1
                      ? "1 subject"
                      : `${examSubjects.length} subjects`}
                </p>
              </div>
            </div>
          </div>

          <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <HeroFact
              icon={CalendarRange}
              label="Starts"
              value={exam.start_date ? formatDate(exam.start_date) : "—"}
            />
            <HeroFact
              icon={CalendarRange}
              label="Ends"
              value={exam.end_date ? formatDate(exam.end_date) : "—"}
            />
            <HeroFact
              icon={NotebookPen}
              label="Term"
              value={loaded?.termName || "—"}
            />
          </div>
        </Card>
      )}

      {/* ----------------------------- Subjects ----------------------------- */}
      <Panel
        title="Subjects"
        description="The papers this exam covers, and what each is out of."
        icon={BookOpen}
        action={
          <Button
            size="lg"
            disabled={!loaded}
            onClick={() => setIsAddOpen(true)}
            className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
          >
            <Plus className="size-4" />
            Add Subject
          </Button>
        }
      >
        {subjectsError ? (
          <SectionError
            message={subjectsError}
            onRetry={() => {
              setSubjectsError(null);
              setSubjectsKey((key) => key + 1);
            }}
          />
        ) : examSubjects === null ? (
          <ul className="divide-y">
            {Array.from({ length: 3 }, (_, index) => (
              <li key={index} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36 max-w-full rounded-md" />
                  <Skeleton className="h-3 w-28 rounded-md" />
                </div>
                <Skeleton className="h-7 w-28 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : examSubjects.length === 0 ? (
          <SectionEmpty
            icon={BookOpen}
            title="No subjects yet"
            description="Add the papers this exam covers, then enter marks against each one."
          >
            <Button
              variant="outline"
              size="lg"
              disabled={!loaded}
              onClick={() => setIsAddOpen(true)}
              className="rounded-xl"
            >
              <Plus className="size-4" />
              Add Subject
            </Button>
          </SectionEmpty>
        ) : (
          <ul className="divide-y">
            {examSubjects.map((examSubject) => (
              <SubjectRow
                key={examSubject.id}
                examId={examId}
                examSubject={examSubject}
                subjectName={nameOfSubject(examSubject)}
                className={nameOfClass(examSubject.class_id)}
              />
            ))}
          </ul>
        )}
      </Panel>

      {loaded && (
        <AddSubjectDialog
          examId={examId}
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          subjects={loaded.subjects}
          classes={loaded.classes}
          onAdded={() => setSubjectsKey((key) => key + 1)}
        />
      )}
    </div>
  );
}
