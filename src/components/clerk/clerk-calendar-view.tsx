"use client";

import { CalendarRange, RefreshCw, TriangleAlert } from "lucide-react";

import { SchoolAgendaPanel } from "@/components/calendar/school-agenda-view";
import { useClerkScope, yearLabel } from "@/components/clerk/use-clerk-scope";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Read-only: a clerk needs to know when the school is shut and what is coming,
 * but the calendar itself is set by the office, so there is nothing to edit
 * here.
 */
export function ClerkCalendarView() {
  const { scope, error, reload } = useClerkScope();
  const year = yearLabel(scope?.year);

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Calendar
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Events and holidays coming up, so you know which days the register
            is closed.
          </p>
        </div>

        {year && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
            <CalendarRange className="size-3.5" />
            {year}
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
              We couldn&rsquo;t load your calendar
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
      ) : !scope.year ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <CalendarRange className="size-6" />
            </span>
            <p className="mt-4 text-sm font-medium">No academic year set up</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              The calendar is kept per academic year. Ask the office to set one
              as current.
            </p>
          </CardContent>
        </Card>
      ) : (
        <SchoolAgendaPanel year={scope.year} />
      )}
    </div>
  );
}
