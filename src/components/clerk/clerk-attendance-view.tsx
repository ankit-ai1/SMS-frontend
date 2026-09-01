"use client";

import * as React from "react";
import {
  CalendarRange,
  ChartColumn,
  ClipboardCheck,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";

import { MarkPanel } from "@/components/attendance/mark-panel";
import { SummaryPanel } from "@/components/attendance/summary-panel";
import { useClerkScope, yearLabel } from "@/components/clerk/use-clerk-scope";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "mark", label: "Mark", icon: ClipboardCheck },
  { value: "summary", label: "Summary", icon: ChartColumn },
];

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

/**
 * The register, for the office rather than a class teacher. A teacher marks the
 * sections they hold; a clerk marks any of them, which is the only difference —
 * so the admin panels are reused unchanged and simply handed the full section
 * list.
 */
export function ClerkAttendanceView() {
  const { scope, error, reload } = useClerkScope();
  // Shared across both tabs: switching to Summary keeps the section you picked.
  const [sectionId, setSectionId] = React.useState("");

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

        {yearLabel(scope?.year) && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
            <CalendarRange className="size-3.5" />
            {yearLabel(scope?.year)}
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
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
            <Button
              size="lg"
              onClick={reload}
              className="mt-5 rounded-xl shadow-brand transition-all hover:bg-brand-700 hover:shadow-lift"
            >
              <RefreshCw className="size-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : !scope ? (
        <ControlsSkeleton />
      ) : !scope.year ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <CalendarRange className="size-6" />
            </span>
            <p className="mt-4 text-sm font-medium">No academic year set up</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Attendance is recorded against an academic year. Ask the office to
              set one as current.
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
              sections={scope.sections}
              sectionId={sectionId}
              onSectionChange={setSectionId}
            />
          </TabsContent>

          <TabsContent value="summary">
            <SummaryPanel
              sections={scope.sections}
              sectionId={sectionId}
              onSectionChange={setSectionId}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
