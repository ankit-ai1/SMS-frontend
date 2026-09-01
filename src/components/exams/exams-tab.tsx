"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarRange, ChevronRight, NotebookPen, Plus } from "lucide-react";

import { CreateExamDialog } from "@/components/exams/create-exam-dialog";
import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listExams,
  sameId,
  type AcademicYear,
  type Exam,
  type ExamType,
  type Term,
} from "@/lib/api";
import { formatDate } from "@/lib/format";

/** Radix rejects an empty item value, so "no filter" needs a sentinel. */
const ALL_TERMS = "all";

function ExamRow({
  exam,
  typeName,
  termName,
}: {
  exam: Exam;
  typeName: string;
  termName: string;
}) {
  const dates =
    exam.start_date && exam.end_date
      ? `${formatDate(exam.start_date)} – ${formatDate(exam.end_date)}`
      : exam.start_date
        ? `From ${formatDate(exam.start_date)}`
        : "Dates not set";

  return (
    <li>
      <Link
        href={`/exams/${exam.id}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <NotebookPen className="size-4.5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{exam.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {typeName && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {typeName}
              </span>
            )}
            {termName && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {termName}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{dates}</span>
          </div>
        </div>

        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function ExamRowSkeleton() {
  return (
    <li className="flex items-center gap-4 px-4 py-3.5">
      <Skeleton className="size-10 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48 max-w-full rounded-md" />
        <Skeleton className="h-3 w-56 max-w-full rounded-md" />
      </div>
    </li>
  );
}

export function ExamsTab({
  year,
  terms,
  examTypes,
  onExamTypesChanged,
}: {
  year: AcademicYear;
  terms: Term[];
  examTypes: ExamType[];
  onExamTypesChanged: () => void;
}) {
  const [termFilter, setTermFilter] = React.useState(ALL_TERMS);
  const [exams, setExams] = React.useState<Exam[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  // Identifies the request the filter asks for, so a stale response cannot win.
  const requestKey = `${year.id}|${termFilter}|${reloadKey}`;

  React.useEffect(() => {
    let cancelled = false;

    listExams({
      academic_year_id: year.id,
      term_id: termFilter === ALL_TERMS ? "" : termFilter,
    })
      .then((loaded) => {
        if (cancelled) return;
        setExams(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading exams."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, year.id, termFilter]);

  function nameOfType(id: string | number): string {
    return examTypes.find((type) => sameId(type.id, id))?.name ?? "";
  }

  function nameOfTerm(id: string | number | null | undefined): string {
    if (id == null) return "";
    const term = terms.find((entry) => sameId(entry.id, id));
    return term?.name?.trim() || (term ? `Term ${term.id}` : "");
  }

  return (
    <>
      <Panel
        title="Exams"
        description="Every exam scheduled for this academic year."
        icon={NotebookPen}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={termFilter}
              onValueChange={setTermFilter}
              disabled={terms.length === 0}
            >
              <SelectTrigger
                aria-label="Filter by term"
                className="h-9 w-40 rounded-xl"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TERMS}>All terms</SelectItem>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={String(term.id)}>
                    {term.name?.trim() || `Term ${term.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="lg"
              onClick={() => setIsCreateOpen(true)}
              className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
            >
              <Plus className="size-4" />
              Create Exam
            </Button>
          </div>
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
        ) : exams === null ? (
          <ul className="divide-y">
            {Array.from({ length: 3 }, (_, index) => (
              <ExamRowSkeleton key={index} />
            ))}
          </ul>
        ) : exams.length === 0 ? (
          <SectionEmpty
            icon={CalendarRange}
            title={
              termFilter === ALL_TERMS
                ? "No exams yet"
                : "No exams in this term"
            }
            description="Create an exam, then add the subjects it covers and enter marks against them."
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsCreateOpen(true)}
              className="rounded-xl"
            >
              <Plus className="size-4" />
              Create Exam
            </Button>
          </SectionEmpty>
        ) : (
          <ul className="divide-y">
            {exams.map((exam) => (
              <ExamRow
                key={exam.id}
                exam={exam}
                typeName={nameOfType(exam.exam_type_id)}
                termName={nameOfTerm(exam.term_id)}
              />
            ))}
          </ul>
        )}
      </Panel>

      <CreateExamDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        year={year}
        terms={terms}
        examTypes={examTypes}
        onCreated={() => {
          setReloadKey((key) => key + 1);
          // A type may have been added inline while creating the exam.
          onExamTypesChanged();
        }}
      />
    </>
  );
}
