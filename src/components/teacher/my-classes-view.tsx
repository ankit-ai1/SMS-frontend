"use client";

import * as React from "react";
import {
  CalendarRange,
  ChevronRight,
  Library,
  MousePointerClick,
  RefreshCw,
  ShieldAlert,
  TriangleAlert,
  UsersRound,
} from "lucide-react";

import { NoSectionsCard } from "@/components/teacher/no-sections-card";
import { useTeacherScope } from "@/components/teacher/use-teacher-scope";
import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { sectionLabel } from "@/components/shared/section-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isForbiddenError,
  listSectionRoster,
  type RosterEntry,
  type Section,
} from "@/lib/api";
import { formatNumber, initialsFrom } from "@/lib/format";
import { cn } from "@/lib/utils";

type Loaded = {
  /** The section this roster answers — see `requestKey` below. */
  requestKey: string;
  roster: RosterEntry[];
};

/* -------------------------------------------------------------------------- */
/*                                Section list                                */
/* -------------------------------------------------------------------------- */

function SectionButton({
  section,
  isActive,
  onSelect,
}: {
  section: Section;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={isActive ? "true" : undefined}
        className={cn(
          "flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors outline-none focus-visible:bg-muted/60",
          isActive ? "bg-brand-50/70" : "hover:bg-muted/40",
        )}
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ring-1 transition-colors",
            isActive
              ? "bg-brand-600 text-white ring-brand-600"
              : "bg-brand-50 text-brand-600 ring-brand-100",
          )}
        >
          {(section.name?.trim() || "?").slice(0, 2).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-semibold",
              isActive && "text-brand-800",
            )}
          >
            {sectionLabel(section)}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {section.capacity
              ? `Capacity ${formatNumber(section.capacity)}`
              : "Capacity not set"}
          </p>
        </div>

        <ChevronRight
          className={cn(
            "size-4 shrink-0 transition-colors",
            isActive ? "text-brand-600" : "text-muted-foreground/50",
          )}
        />
      </button>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Roster                                   */
/* -------------------------------------------------------------------------- */

function StudentRow({ entry }: { entry: RosterEntry }) {
  const fullName = `${entry.first_name} ${entry.last_name}`.trim();
  const roll =
    entry.roll_number != null && String(entry.roll_number) !== ""
      ? String(entry.roll_number)
      : null;

  return (
    <li className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
        {roll ?? initialsFrom(fullName)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fullName || "—"}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
          {entry.admission_number || "—"}
        </p>
      </div>

      {roll && (
        <span className="shrink-0 rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
          Roll {roll}
        </span>
      )}
    </li>
  );
}

function RosterSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-full rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function MyClassesView() {
  const { scope, error, reload } = useTeacherScope();

  const [selectedId, setSelectedId] = React.useState("");
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [rosterError, setRosterError] = React.useState<string | null>(null);
  const [isForbidden, setIsForbidden] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  const sections = scope?.sections ?? [];

  // The first section stands in until one is picked, so the roster panel has
  // something to show the moment the page settles. Derived rather than synced
  // into state: there is nothing to keep in step once the list arrives.
  const sectionId =
    selectedId || (sections.length > 0 ? String(sections[0].id) : "");

  React.useEffect(() => {
    if (!sectionId) return;
    let cancelled = false;

    listSectionRoster(sectionId)
      .then((roster) => {
        if (cancelled) return;
        setLoaded({ requestKey: sectionId, roster });
        setRosterError(null);
        setIsForbidden(false);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setIsForbidden(isForbiddenError(cause));
        setRosterError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading this roster.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [sectionId, reloadKey]);

  const isStale = loaded?.requestKey !== sectionId;
  const activeSection = sections.find(
    (section) => String(section.id) === sectionId,
  );
  const yearName =
    scope?.year?.name?.trim() || (scope?.year ? `Year ${scope.year.id}` : "");

  if (error) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" />
          </span>
          <p className="mt-4 text-sm font-medium">
            We couldn&rsquo;t load your classes
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
    );
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            My Classes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The sections assigned to you, and who is on each roll.
          </p>
        </div>

        {yearName && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
            <CalendarRange className="size-3.5" />
            {yearName}
          </span>
        )}
      </div>

      {/* Nothing to split into two panels when there are no sections at all. */}
      {scope && sections.length === 0 ? (
        <NoSectionsCard />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          {/* ----------------------------- Sections ---------------------------- */}
          <Panel
            title="Sections"
            description="Pick a section to see its roll."
            icon={Library}
          >
            {!scope ? (
              <ul className="divide-y">
                {Array.from({ length: 4 }, (_, index) => (
                  <li key={index} className="flex items-center gap-4 px-4 py-4">
                    <Skeleton className="size-9 shrink-0 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32 rounded-md" />
                      <Skeleton className="h-3 w-20 rounded-md" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="divide-y">
                {sections.map((section) => (
                  <SectionButton
                    key={section.id}
                    section={section}
                    isActive={String(section.id) === sectionId}
                    onSelect={() => setSelectedId(String(section.id))}
                  />
                ))}
              </ul>
            )}
          </Panel>

          {/* ------------------------------ Roster ----------------------------- */}
          <Panel
            title={
              activeSection ? sectionLabel(activeSection) : "Student roster"
            }
            description={
              loaded && !isStale && !rosterError
                ? `${formatNumber(loaded.roster.length)} ${
                    loaded.roster.length === 1 ? "student" : "students"
                  } on the roll`
                : "Name, roll number, and admission number."
            }
            icon={UsersRound}
          >
            {!sectionId ? (
              <SectionEmpty
                icon={MousePointerClick}
                title="Pick a section to start"
                description="Choose a section on the left and its roster loads here."
              />
            ) : rosterError ? (
              isForbidden ? (
                <SectionEmpty
                  icon={ShieldAlert}
                  title="This section isn't yours"
                  description="You are not assigned to this section, so its roll is not available to you. Pick one of your own sections instead."
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
                description="Nobody is enrolled here yet. Once students are added to this section they show up on the roll."
              />
            ) : (
              <ul className="divide-y">
                {loaded.roster.map((entry) => (
                  <StudentRow key={entry.enrollment_id} entry={entry} />
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
