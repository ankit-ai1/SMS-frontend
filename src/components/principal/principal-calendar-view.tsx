"use client";

import {
  LoadErrorCard,
  NoYearCard,
  PageHeader,
  RowsSkeleton,
  ViewOnlyChip,
} from "@/components/principal/principal-chrome";
import { useSchoolScope, yearLabel } from "@/components/principal/use-school-scope";
import { SchoolAgendaPanel } from "@/components/calendar/school-agenda-view";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PrincipalCalendarView() {
  const { scope, error, reload } = useSchoolScope();

  if (error) {
    return (
      <LoadErrorCard
        title="We couldn't load your calendar"
        message={error}
        onRetry={reload}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="What the school has coming up — events and holidays in one running list."
        year={yearLabel(scope?.year)}
        action={<ViewOnlyChip />}
      />

      {!scope ? (
        <Card className="gap-0 py-0 shadow-card">
          <div className="flex flex-wrap items-center gap-3 border-b bg-muted/25 px-4 py-3.5">
            <Skeleton className="size-9 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-56 max-w-full rounded-md" />
            </div>
          </div>
          <RowsSkeleton />
        </Card>
      ) : !scope.year ? (
        <NoYearCard description="The calendar is kept per academic year. Ask the office to set one as current." />
      ) : (
        <SchoolAgendaPanel year={scope.year} />
      )}
    </div>
  );
}
