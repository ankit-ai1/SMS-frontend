"use client";

import * as React from "react";
import { CalendarRange, RefreshCw, TriangleAlert } from "lucide-react";

import { MarkPanel } from "@/components/attendance/mark-panel";
import { NoSectionsCard } from "@/components/teacher/no-sections-card";
import { useTeacherScope } from "@/components/teacher/use-teacher-scope";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ControlsSkeleton() {
  return (
    <Card className="gap-0 py-0 shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b bg-muted/25 px-4 py-3.5">
        <Skeleton className="size-10 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-56 max-w-full rounded-md" />
        </div>
      </div>
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <Skeleton className="h-9 w-full rounded-xl sm:w-64" />
        <Skeleton className="h-9 w-full rounded-xl sm:w-44" />
      </div>
      <ul className="divide-y">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full rounded-md" />
              <Skeleton className="h-3 w-24 rounded-md" />
            </div>
            <Skeleton className="h-9 w-40 rounded-xl" />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * The same register the admin screen uses, with the picker narrowed to the
 * teacher's own sections. `MarkPanel` already pre-fills whatever was marked
 * for the chosen date and surfaces a failed load — including the backend's
 * 403 for a section that is not theirs — with a retry.
 */
export function TeacherAttendanceView() {
  const { scope, error, reload } = useTeacherScope();
  const [sectionId, setSectionId] = React.useState("");

  const yearName =
    scope?.year?.name?.trim() || (scope?.year ? `Year ${scope.year.id}` : "");

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Attendance
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mark the register for one of your sections. Anything already saved
            for the date loads in first.
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
      ) : scope.sections.length === 0 ? (
        <NoSectionsCard />
      ) : (
        <MarkPanel
          sections={scope.sections}
          sectionId={sectionId}
          onSectionChange={setSectionId}
        />
      )}
    </div>
  );
}
