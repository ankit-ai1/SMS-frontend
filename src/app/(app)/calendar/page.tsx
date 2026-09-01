"use client";

import * as React from "react";
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  RefreshCw,
  Settings2,
  TriangleAlert,
} from "lucide-react";

import { AgendaTab } from "@/components/calendar/agenda-tab";
import { MonthTab } from "@/components/calendar/month-tab";
import { SettingsTab } from "@/components/calendar/settings-tab";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentAcademicYear, type AcademicYear } from "@/lib/api";

const TABS = [
  { value: "month", label: "Month", icon: CalendarDays },
  { value: "agenda", label: "Agenda", icon: CalendarClock },
  { value: "settings", label: "Settings", icon: Settings2 },
];

function ContextSkeleton() {
  return (
    <Card className="gap-0 py-0 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/25 px-4 py-3.5">
        <Skeleton className="h-9 w-56 rounded-xl" />
        <Skeleton className="h-9 w-20 rounded-xl" />
      </div>
      <div className="grid grid-cols-7 border-r border-b">
        {Array.from({ length: 42 }, (_, index) => (
          <div
            key={index}
            className="min-h-24 space-y-1.5 border-t border-l p-1.5 first:border-l-0"
          >
            <Skeleton className="size-6 rounded-lg" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function CalendarPage() {
  const [year, setYear] = React.useState<AcademicYear | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    getCurrentAcademicYear()
      .then((loaded) => {
        if (cancelled) return;
        setYear(loaded);
        setIsLoaded(true);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading the calendar."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const yearName =
    year?.name?.trim() || (year ? `Year ${year.id}` : "");

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Calendar
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Events, holidays and the shape of the school week.
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
              We couldn&rsquo;t load your calendar
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
      ) : !isLoaded ? (
        <ContextSkeleton />
      ) : !year ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <CalendarRange className="size-6" />
            </span>
            <p className="mt-4 text-sm font-medium">No academic year set up</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Events, holidays and calendar settings all hang off an academic
              year. Add one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="month" className="gap-5">
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

          <TabsContent value="month">
            <MonthTab year={year} />
          </TabsContent>

          <TabsContent value="agenda">
            <AgendaTab year={year} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab year={year} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
