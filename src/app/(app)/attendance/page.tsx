"use client";

import * as React from "react";
import { CalendarRange, ChartColumn, ClipboardCheck, RefreshCw, TriangleAlert } from "lucide-react";

import { MarkPanel } from "@/components/attendance/mark-panel";
import { SummaryPanel } from "@/components/attendance/summary-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCurrentAcademicYear,
  listSections,
  type AcademicYear,
  type Section,
} from "@/lib/api";

const TABS = [
  { value: "mark", label: "Mark", icon: ClipboardCheck },
  { value: "summary", label: "Summary", icon: ChartColumn },
];

type Context = {
  year: AcademicYear | null;
  sections: Section[];
};

function ControlsSkeleton() {
  return (
    <Card className="gap-0 py-0 shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b bg-muted/25 px-4 py-3.5">
        <Skeleton className="size-9 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-56 max-w-full rounded-md" />
        </div>
      </div>
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <Skeleton className="h-9 w-full rounded-xl sm:w-64" />
        <Skeleton className="h-9 w-full rounded-xl sm:w-44" />
      </div>
    </Card>
  );
}

export default function AttendancePage() {
  const [context, setContext] = React.useState<Context | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  // Shared across both tabs: switching to Summary keeps the section you picked.
  const [sectionId, setSectionId] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    async function load(): Promise<Context> {
      const year = await getCurrentAcademicYear();
      if (!year) return { year: null, sections: [] };
      return { year, sections: await listSections(year.id) };
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
            : "Something went wrong while loading sections."
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
            Attendance
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mark the register for a section, or review how a month went.
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
              We couldn&rsquo;t load your sections
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
        <ControlsSkeleton />
      ) : !context.year ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <CalendarRange className="size-6" />
            </span>
            <p className="mt-4 text-sm font-medium">No academic year set up</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add an academic year and its sections before attendance can be
              marked.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="mark" className="gap-5">
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

          {/* forceMount: a half-marked register must survive a look at Summary. */}
          <TabsContent value="mark" forceMount>
            <MarkPanel
              sections={context.sections}
              sectionId={sectionId}
              onSectionChange={setSectionId}
            />
          </TabsContent>

          <TabsContent value="summary">
            <SummaryPanel
              sections={context.sections}
              sectionId={sectionId}
              onSectionChange={setSectionId}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
