"use client";

import * as React from "react";
import { CalendarRange, FileBadge, NotebookPen, RefreshCw, Ruler, TriangleAlert } from "lucide-react";

import { ExamsTab } from "@/components/exams/exams-tab";
import { GradeScalesTab } from "@/components/exams/grade-scales-tab";
import { ReportCardsTab } from "@/components/exams/report-cards-tab";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCurrentAcademicYear,
  listExamTypes,
  listSections,
  listTerms,
  type AcademicYear,
  type ExamType,
  type Section,
  type Term,
} from "@/lib/api";

const TABS = [
  { value: "exams", label: "Exams", icon: NotebookPen },
  { value: "report-cards", label: "Report Cards", icon: FileBadge },
  { value: "grade-scales", label: "Grade Scales", icon: Ruler },
];

type Context = {
  year: AcademicYear | null;
  terms: Term[];
  sections: Section[];
  examTypes: ExamType[];
};

function ContextSkeleton() {
  return (
    <Card className="gap-0 py-0 shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b bg-muted/25 px-4 py-3.5">
        <Skeleton className="size-9 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-56 max-w-full rounded-md" />
        </div>
      </div>
      <div className="space-y-3 p-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </Card>
  );
}

export default function ExamsPage() {
  const [context, setContext] = React.useState<Context | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  // Shared across tabs: switching keeps the section you picked.
  const [sectionId, setSectionId] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    async function load(): Promise<Context> {
      const [year, examTypes] = await Promise.all([
        getCurrentAcademicYear(),
        listExamTypes(),
      ]);
      if (!year) return { year: null, terms: [], sections: [], examTypes };

      const [terms, sections] = await Promise.all([
        listTerms(year.id),
        listSections(year.id),
      ]);
      return { year, terms, sections, examTypes };
    }

    load()
      .then((loaded) => {
        if (cancelled) return;
        setContext(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading your exam setup."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const yearName =
    context?.year?.name?.trim() ||
    (context?.year ? `Year ${context.year.id}` : "");

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Exams
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule exams, record marks, and turn them into report cards.
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
              We couldn&rsquo;t load your exam setup
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {error}
            </p>
            <Button
              size="lg"
              onClick={() => {
                setError(null);
                setReloadKey((key) => key + 1);
              }}
              className="mt-5 rounded-xl shadow-brand transition-all hover:bg-brand-700 hover:shadow-lift"
            >
              <RefreshCw className="size-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : !context ? (
        <ContextSkeleton />
      ) : !context.year ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <CalendarRange className="size-6" />
            </span>
            <p className="mt-4 text-sm font-medium">No academic year set up</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Exams are tied to an academic year. Add one before scheduling
              exams.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="exams" className="gap-5">
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

          <TabsContent value="exams">
            <ExamsTab
              year={context.year}
              terms={context.terms}
              examTypes={context.examTypes}
              onExamTypesChanged={() => setReloadKey((key) => key + 1)}
            />
          </TabsContent>

          <TabsContent value="report-cards">
            <ReportCardsTab
              sections={context.sections}
              sectionId={sectionId}
              onSectionChange={setSectionId}
              terms={context.terms}
            />
          </TabsContent>

          <TabsContent value="grade-scales">
            <GradeScalesTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
