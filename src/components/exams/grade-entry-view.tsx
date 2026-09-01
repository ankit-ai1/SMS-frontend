"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  MousePointerClick,
  RefreshCw,
  TriangleAlert,
  UsersRound,
} from "lucide-react";

import { toMarks } from "@/components/exams/exam-meta";
import {
  GradeRosterEditor,
  buildGradeEntries,
  type Entries,
} from "@/components/exams/grade-roster-editor";
import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { SectionPicker } from "@/components/shared/section-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCurrentAcademicYear,
  getExam,
  listExamGrades,
  listExamSubjects,
  listSectionRoster,
  listSections,
  listSubjects,
  sameId,
  type Exam,
  type ExamSubject,
  type RosterEntry,
  type Section,
} from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";

type Context = {
  exam: Exam;
  examSubject: ExamSubject;
  subjectName: string;
  sections: Section[];
};

type Loaded = {
  /** The section this data answers — see `requestKey` below. */
  requestKey: string;
  /** Bumped on every successful load, and used to remount the editor. */
  version: number;
  roster: RosterEntry[];
  entries: Entries;
  alreadyGraded: number;
};

/* -------------------------------------------------------------------------- */
/*                                   Editor                                   */
/* -------------------------------------------------------------------------- */


/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function GradeEntryView({
  examId,
  examSubjectId,
}: {
  examId: string;
  examSubjectId: string;
}) {
  const [context, setContext] = React.useState<Context | null>(null);
  const [contextError, setContextError] = React.useState<string | null>(null);
  const [contextKey, setContextKey] = React.useState(0);

  const [sectionId, setSectionId] = React.useState("");
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    async function load(): Promise<Context> {
      const [exam, examSubjects, subjects] = await Promise.all([
        getExam(examId),
        listExamSubjects(examId),
        listSubjects(),
      ]);

      const examSubject = examSubjects.find((entry) =>
        sameId(entry.id, examSubjectId)
      );
      if (!examSubject) {
        throw new Error("This subject is no longer part of the exam.");
      }

      const yearId =
        exam.academic_year_id ?? (await getCurrentAcademicYear())?.id ?? null;
      const sections = yearId ? await listSections(yearId) : [];

      return {
        exam,
        examSubject,
        subjectName:
          examSubject.subject_name?.trim() ||
          subjects.find((entry) => sameId(entry.id, examSubject.subject_id))
            ?.name ||
          "Subject",
        sections,
      };
    }

    load()
      .then((next) => {
        if (cancelled) return;
        setContext(next);
        setContextError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setContextError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading this subject."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [examId, examSubjectId, contextKey]);

  // Identifies the roster the controls ask for. Loading is then simply "what we
  // hold isn't what we asked for" — no loading flag to keep in sync.
  const requestKey = `${sectionId}|${examSubjectId}`;

  React.useEffect(() => {
    if (!sectionId) return;
    let cancelled = false;

    Promise.all([
      listSectionRoster(sectionId),
      listExamGrades(examSubjectId),
    ])
      .then(([roster, grades]) => {
        if (cancelled) return;

        const { entries, alreadyGraded } = buildGradeEntries(roster, grades);

        setLoaded((previous) => ({
          requestKey,
          version: (previous?.version ?? 0) + 1,
          roster,
          entries,
          alreadyGraded,
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
  }, [requestKey, sectionId, examSubjectId, reloadKey]);

  const isStale = loaded?.requestKey !== requestKey;
  const maxMarks = toMarks(context?.examSubject.max_marks);
  const passMarks = toMarks(context?.examSubject.pass_marks);

  // A paper set for one class should not offer another class's sections.
  const sections = React.useMemo(() => {
    const all = context?.sections ?? [];
    const classId = context?.examSubject.class_id;
    if (classId == null) return all;
    const matching = all.filter((section) =>
      sameId(section.class_id, classId)
    );
    return matching.length > 0 ? matching : all;
  }, [context]);

  if (contextError) {
    return (
      <div className="space-y-6">
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" />
            </span>
            <p className="mt-4 text-sm font-medium">
              We couldn&rsquo;t open this subject
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {contextError}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button
                size="lg"
                onClick={() => {
                  setContextError(null);
                  setContextKey((key) => key + 1);
                }}
                className="rounded-xl shadow-brand transition-all hover:bg-brand-700 hover:shadow-lift"
              >
                <RefreshCw className="size-4" />
                Try again
              </Button>
              <Button variant="outline" size="lg" asChild className="rounded-xl">
                <Link href={`/exams/${examId}`}>Back to exam</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------------------------- Breadcrumb ---------------------------- */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <Link
          href="/exams"
          className="rounded-md font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Exams
        </Link>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
        {context ? (
          <Link
            href={`/exams/${examId}`}
            className="max-w-40 truncate rounded-md font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:max-w-none"
          >
            {context.exam.name}
          </Link>
        ) : (
          <Skeleton className="h-4 w-24 rounded-md" />
        )}
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
        {context ? (
          <span className="truncate font-medium">{context.subjectName}</span>
        ) : (
          <Skeleton className="h-4 w-20 rounded-md" />
        )}
      </nav>

      <Panel
        title={context ? `${context.subjectName} — marks` : "Enter marks"}
        description={
          context
            ? `Out of ${maxMarks !== null ? formatNumber(maxMarks) : "—"}${
                passMarks !== null ? `, pass at ${formatNumber(passMarks)}` : ""
              }${
                context.examSubject.exam_date
                  ? ` · ${formatDate(context.examSubject.exam_date)}`
                  : ""
              }`
            : "Loading this paper…"
        }
        icon={BookOpen}
      >
        <div className="border-b p-4">
          <SectionPicker
            id="grades_section"
            sections={sections}
            value={sectionId}
            onChange={setSectionId}
            disabled={!context}
          />
        </div>

        {!context ? (
          <ul className="divide-y">
            {Array.from({ length: 5 }, (_, index) => (
              <li key={index} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 max-w-full rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
                <Skeleton className="h-9 w-24 rounded-xl" />
              </li>
            ))}
          </ul>
        ) : !sectionId ? (
          <SectionEmpty
            icon={MousePointerClick}
            title="Pick a section to start"
            description="Choose a section above and its roster loads here, ready for marks."
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
              <li key={index} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 max-w-full rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
                <Skeleton className="h-9 w-24 rounded-xl" />
              </li>
            ))}
          </ul>
        ) : loaded.roster.length === 0 ? (
          <SectionEmpty
            icon={UsersRound}
            title="No students in this section"
            description="Enroll students into this section before marks can be entered."
          />
        ) : (
          <GradeRosterEditor
            key={loaded.version}
            examSubjectId={examSubjectId}
            roster={loaded.roster}
            initialEntries={loaded.entries}
            maxMarks={maxMarks}
            passMarks={passMarks}
            alreadyGraded={loaded.alreadyGraded}
            onSaved={() => setReloadKey((key) => key + 1)}
          />
        )}
      </Panel>
    </div>
  );
}
