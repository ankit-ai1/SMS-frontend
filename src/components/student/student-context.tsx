"use client";

import * as React from "react";
import { GraduationCap, RefreshCw, TriangleAlert } from "lucide-react";

import { SectionEmpty } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getStudentDashboard,
  type StudentDashboard,
  type StudentSelf,
} from "@/lib/api";
import { initialsFrom } from "@/lib/format";

/**
 * The student portal's equivalent of `ParentPortalProvider`. The parent version
 * resolves a list of children and puts a picker above every screen; a student
 * resolves exactly one record — themselves — so the picker becomes a plain
 * identity card and every screen below can assume a subject.
 */

type StudentState =
  | { status: "loading" }
  | { status: "error"; message: string; reload: () => void }
  | {
      status: "ready";
      dashboard: StudentDashboard;
      student: StudentSelf | null;
      reload: () => void;
    };

const StudentContext = React.createContext<StudentState | null>(null);

export function useStudentPortal() {
  const value = React.useContext(StudentContext);
  if (!value) {
    throw new Error(
      "useStudentPortal must be used inside StudentPortalProvider."
    );
  }
  return value;
}

export function studentName(student: StudentSelf): string {
  return `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || "Student";
}

export function classLabel(student: StudentSelf): string {
  return [student.class_name?.trim(), student.section_name?.trim()]
    .filter(Boolean)
    .join(" / ");
}

/* -------------------------------------------------------------------------- */
/*                                  Identity                                  */
/* -------------------------------------------------------------------------- */

function IdentityCard({ student }: { student: StudentSelf }) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-[0.7rem] font-bold text-brand-700 ring-1 ring-brand-100">
          {initialsFrom(studentName(student))}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{studentName(student)}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {classLabel(student) || "Class not assigned"}
            {student.admission_number
              ? ` · ${student.admission_number}`
              : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Chrome                                   */
/* -------------------------------------------------------------------------- */

function StudentChrome({
  state,
  children,
}: {
  state: StudentState;
  children: React.ReactNode;
}) {
  if (state.status === "loading") {
    return (
      <div className="space-y-6">
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-3 p-4">
            <Skeleton className="size-10 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-3 w-52 rounded-md" />
            </div>
          </CardContent>
        </Card>
        {children}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" />
          </span>
          <p className="mt-4 text-sm font-medium">
            We couldn&rsquo;t load your record
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {state.message}
          </p>
          <Button size="lg" onClick={state.reload} className="mt-5 rounded-xl">
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!state.student) {
    return (
      <Card className="shadow-card">
        <SectionEmpty
          icon={GraduationCap}
          title="No student record linked yet"
          description="Ask the school office to link your login to your student record."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <IdentityCard student={state.student} />
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Provider                                  */
/* -------------------------------------------------------------------------- */

export function StudentPortalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dashboard, setDashboard] = React.useState<StudentDashboard | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    getStudentDashboard()
      .then((loaded) => {
        if (cancelled) return;
        setDashboard(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading your record."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = React.useCallback(() => {
    setError(null);
    setDashboard(null);
    setReloadKey((key) => key + 1);
  }, []);

  const state: StudentState = error
    ? { status: "error", message: error, reload }
    : dashboard
      ? {
          status: "ready",
          dashboard,
          student: dashboard.student ?? null,
          reload,
        }
      : { status: "loading" };

  return (
    <StudentContext.Provider value={state}>
      <StudentChrome state={state}>{children}</StudentChrome>
    </StudentContext.Provider>
  );
}
