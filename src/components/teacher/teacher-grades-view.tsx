"use client";

import * as React from "react";
import {
  BookOpen,
  CalendarRange,
  MousePointerClick,
  RefreshCw,
  ShieldAlert,
  SquarePen,
  TriangleAlert,
  UsersRound,
} from "lucide-react";

import { toMarks } from "@/components/exams/exam-meta";
import {
  GradeRosterEditor,
  buildGradeEntries,
  type Entries,
} from "@/components/exams/grade-roster-editor";
import { NoSectionsCard } from "@/components/teacher/no-sections-card";
import { useTeacherScope } from "@/components/teacher/use-teacher-scope";
import {
  Field,
  SectionEmpty,
  SectionError,
} from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { SectionPicker } from "@/components/shared/section-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isForbiddenError,
  listExamGrades,
  listExamSubjects,
  listExams,
  listSectionRoster,
  sameId,
  type Exam,
  type ExamSubject,
  type RosterEntry,
} from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";

type Loaded = {
  /** The section+paper this data answers — see `requestKey` below. */
  requestKey: string;
  /** Bumped on every successful load, and used to remount the editor. */
  version: number;
  roster: RosterEntry[];
  entries: Entries;
  alreadyGraded: number;
};

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
          <Skeleton className="h-9 w-24 rounded-xl" />
        </li>
      ))}
    </ul>
  );
}

/** "Mathematics · out of 100", the label a paper carries in the picker. */
function paperLabel(paper: ExamSubject): string {
  const subject = paper.subject_name?.trim() || `Subject ${paper.subject_id}`;
  return `${subject} · out of ${formatNumber(paper.max_marks)}`;
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function TeacherGradesView() {
  const { scope, error: scopeError, reload: reloadScope } = useTeacherScope();

  const [examId, setExamId] = React.useState("");
  const [examSubjectId, setExamSubjectId] = React.useState("");
  const [sectionId, setSectionId] = React.useState("");

  const [exams, setExams] = React.useState<Exam[] | null>(null);
  const [examsError, setExamsError] = React.useState<string | null>(null);
  const [papers, setPapers] = React.useState<ExamSubject[] | null>(null);
  const [papersError, setPapersError] = React.useState<string | null>(null);

  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [rosterError, setRosterError] = React.useState<string | null>(null);
  const [isForbidden, setIsForbidden] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  const yearId = scope?.year?.id;

  /* --------------------------- exams for the year -------------------------- */

  React.useEffect(() => {
    if (yearId == null) return;
    let cancelled = false;

    listExams({ academic_year_id: yearId })
      .then((loadedExams) => {
        if (cancelled) return;
        setExams(loadedExams);
        setExamsError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setExamsError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading exams.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [yearId, reloadKey]);

  /* --------------------------- papers for the exam ------------------------- */

  // Papers are cleared by the exam picker itself, not here — resetting them
  // in the effect body would cost an extra render on every load.
  React.useEffect(() => {
    if (!examId) return;
    let cancelled = false;

    listExamSubjects(examId)
      .then((loadedPapers) => {
        if (cancelled) return;
        setPapers(loadedPapers);
        setPapersError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setPapersError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading this exam's subjects.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [examId, reloadKey]);

  const paper = (papers ?? []).find((entry) => sameId(entry.id, examSubjectId));

  const mySections = scope?.sections ?? [];

  // A paper set for one class should not offer another class's sections.
  const sections = React.useMemo(() => {
    const mine = scope?.sections ?? [];
    if (paper?.class_id == null) return mine;
    const matching = mine.filter((section) =>
      sameId(section.class_id, paper.class_id),
    );
    return matching.length > 0 ? matching : mine;
  }, [scope, paper]);

  /* ------------------------------ roster + marks --------------------------- */

  const requestKey = `${sectionId}|${examSubjectId}`;

  React.useEffect(() => {
    if (!sectionId || !examSubjectId) return;
    let cancelled = false;

    Promise.all([listSectionRoster(sectionId), listExamGrades(examSubjectId)])
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
        setRosterError(null);
        setIsForbidden(false);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setIsForbidden(isForbiddenError(cause));
        setRosterError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading the roster.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, sectionId, examSubjectId, reloadKey]);

  const isStale = loaded?.requestKey !== requestKey;
  const maxMarks = toMarks(paper?.max_marks);
  const passMarks = toMarks(paper?.pass_marks);
  const yearName =
    scope?.year?.name?.trim() || (scope?.year ? `Year ${scope.year.id}` : "");

  /* ------------------------------- rendering ------------------------------- */

  const fatal = scopeError ?? examsError;
  if (fatal) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" />
          </span>
          <p className="mt-4 text-sm font-medium">
            We couldn&rsquo;t load the exams
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{fatal}</p>
          <Button
            size="lg"
            onClick={() => {
              setExamsError(null);
              setReloadKey((key) => key + 1);
              reloadScope();
            }}
            className="mt-5 rounded-xl shadow-brand transition-all hover:bg-brand-700 hover:shadow-lift"
          >
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Grades
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Pick an exam and one of its papers, then enter marks for a section
            you teach. Marks already on file load in first.
          </p>
        </div>

        {yearName && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
            <CalendarRange className="size-3.5" />
            {yearName}
          </span>
        )}
      </div>

      {scope && mySections.length === 0 ? (
        <NoSectionsCard />
      ) : (
        <Panel
          title={paper ? paperLabel(paper) : "Enter marks"}
          description={
            paper
              ? `${
                  passMarks !== null
                    ? `Pass at ${formatNumber(passMarks)}`
                    : "No pass mark set"
                }${paper.exam_date ? ` · ${formatDate(paper.exam_date)}` : ""}`
              : "Choose an exam, a subject, and a section to start."
          }
          icon={SquarePen}
        >
          {/* ----------------------------- Controls ---------------------------- */}
          <div className="grid gap-4 border-b p-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field id="grades_exam" label="Exam">
              <Select
                value={examId}
                onValueChange={(value) => {
                  setExamId(value);
                  setExamSubjectId("");
                  setPapers(null);
                  setPapersError(null);
                }}
                disabled={!exams || exams.length === 0}
              >
                <SelectTrigger
                  id="grades_exam"
                  className="h-9 w-full rounded-xl"
                >
                  <SelectValue
                    placeholder={
                      !exams
                        ? "Loading exams…"
                        : exams.length === 0
                          ? "No exams this year"
                          : "Select an exam"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(exams ?? []).map((exam) => (
                    <SelectItem key={exam.id} value={String(exam.id)}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              id="grades_paper"
              label="Subject"
              error={papersError ?? undefined}
            >
              <Select
                value={examSubjectId}
                onValueChange={setExamSubjectId}
                disabled={!examId || !papers || papers.length === 0}
              >
                <SelectTrigger
                  id="grades_paper"
                  className="h-9 w-full rounded-xl"
                >
                  <SelectValue
                    placeholder={
                      !examId
                        ? "Pick an exam first"
                        : !papers
                          ? "Loading subjects…"
                          : papers.length === 0
                            ? "No subjects on this exam"
                            : "Select a subject"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(papers ?? []).map((entry) => (
                    <SelectItem key={entry.id} value={String(entry.id)}>
                      {paperLabel(entry)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <SectionPicker
              id="grades_section"
              sections={sections}
              value={sectionId}
              onChange={setSectionId}
              disabled={!examSubjectId}
            />
          </div>

          {/* ------------------------------ Roster ----------------------------- */}
          {!examSubjectId ? (
            <SectionEmpty
              icon={BookOpen}
              title="Pick a paper to start"
              description="Choose the exam and the subject you are marking, and the section's roll loads here."
            />
          ) : !sectionId ? (
            <SectionEmpty
              icon={MousePointerClick}
              title="Pick a section to start"
              description="Choose one of your sections above and its roster loads here, ready for marks."
            />
          ) : rosterError ? (
            isForbidden ? (
              <SectionEmpty
                icon={ShieldAlert}
                title="This section isn't yours"
                description="You are not assigned to this section, so its marks are not yours to enter. Pick one of your own sections instead."
              />
            ) : (
              <SectionError
                message={rosterError}
                onRetry={() => {
                  setRosterError(null);
                  setReloadKey((key) => key + 1);
                }}
              />
            )
          ) : isStale ? (
            <RosterSkeleton />
          ) : loaded.roster.length === 0 ? (
            <SectionEmpty
              icon={UsersRound}
              title="No students in this section"
              description="Nobody is enrolled here yet, so there is nothing to mark."
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
      )}
    </div>
  );
}
