"use client";

import * as React from "react";
import { Cake, CalendarDays, PartyPopper } from "lucide-react";

import {
  PrintShell,
  SchoolLetterhead,
} from "@/components/print/print-shell";
import {
  useSchoolProfile,
  type SchoolProfile,
} from "@/components/print/use-school-profile";
import { Field } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listBirthdays, type StudentBirthday } from "@/lib/api";
import { formatDate, initialsFrom } from "@/lib/format";

/** `YYYY-MM-DD` for today in the browser's own calendar, not UTC. */
function todayInput(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function studentName(student: StudentBirthday): string {
  return `${student.first_name} ${student.last_name}`.trim() || "—";
}

function placementOf(student: StudentBirthday): string {
  return (
    [student.class_name?.trim(), student.section_name?.trim()]
      .filter(Boolean)
      .join(" — ") || ""
  );
}

/** The age being turned on the chosen day — the one number a card wants. */
function ageTurning(student: StudentBirthday, on: string): number | null {
  const born = new Date(student.date_of_birth);
  const target = new Date(on);
  if (Number.isNaN(born.getTime()) || Number.isNaN(target.getTime())) {
    return null;
  }
  const age = target.getFullYear() - born.getFullYear();
  return age > 0 && age < 120 ? age : null;
}

/* -------------------------------------------------------------------------- */
/*                                    Card                                    */
/* -------------------------------------------------------------------------- */

function GreetingCard({
  student,
  on,
  school,
}: {
  student: StudentBirthday;
  on: string;
  school: SchoolProfile | null;
}) {
  const name = studentName(student);
  const placement = placementOf(student);
  const age = ageTurning(student, on);

  return (
    <div className="print-avoid-break flex h-[125mm] flex-col overflow-hidden rounded-2xl border-2 border-gold/40 bg-white">
      {/* A wash of the accent colour, so the card does not read as a form. */}
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,var(--gold-soft),oklch(1_0_0))] px-6 pt-5 pb-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-8 -right-6 size-28 rounded-full bg-gold/10"
        />
        <SchoolLetterhead school={school} compact />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-gold-soft text-gold ring-2 ring-gold/25">
          <Cake className="size-7" />
        </span>

        <p className="mt-4 text-[0.625rem] font-black tracking-[0.32em] text-gold uppercase">
          Happy Birthday
        </p>

        <p className="mt-3 text-2xl font-black tracking-tight text-neutral-900">
          {name}
        </p>

        <p className="mt-1 text-xs font-semibold text-neutral-500">
          {[placement, age !== null ? `turning ${age}` : ""]
            .filter(Boolean)
            .join("  ·  ") || "—"}
        </p>

        <p className="mx-auto mt-5 max-w-sm text-xs leading-[1.9] text-neutral-700">
          The whole of{" "}
          <span className="font-bold">
            {school?.name?.trim() || "your school"}
          </span>{" "}
          wishes you a very happy birthday. May the year ahead bring you good
          health, good friends and every success in your studies.
        </p>
      </div>

      <div className="border-t border-gold/25 px-6 py-2.5">
        <p className="text-center text-[0.5625rem] text-neutral-500">
          {formatDate(on)}
          {student.admission_number
            ? `  ·  Admission No. ${student.admission_number}`
            : ""}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    List                                    */
/* -------------------------------------------------------------------------- */

function BirthdayRow({
  student,
  on,
}: {
  student: StudentBirthday;
  on: string;
}) {
  const name = studentName(student);
  const placement = placementOf(student);
  const age = ageTurning(student, on);

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-[0.7rem] font-bold text-gold ring-1 ring-gold/20">
        {initialsFrom(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
          {placement || "Not enrolled this year"}
          {student.admission_number ? ` · ${student.admission_number}` : ""}
        </p>
      </div>
      {age !== null && (
        <span className="shrink-0 rounded-lg bg-gold-soft px-2 py-0.5 text-xs font-bold text-gold tabular-nums">
          Turning {age}
        </span>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function BirthdaysView() {
  const school = useSchoolProfile();
  const [date, setDate] = React.useState(todayInput);

  const [loaded, setLoaded] = React.useState<{
    date: string;
    students: StudentBirthday[];
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const requestKey = `${date}|${reloadKey}`;

  React.useEffect(() => {
    if (!date) return;
    let cancelled = false;

    const [, month, day] = date.split("-");

    listBirthdays({ month, day })
      .then((students) => {
        if (cancelled) return;
        setLoaded({ date, students });
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading birthdays."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, date]);

  const isStale = loaded?.date !== date;
  const students = isStale ? null : (loaded?.students ?? []);
  const isToday = date === todayInput();

  return (
    <PrintShell
      title="Birthday Greetings"
      description="Whose birthday it is, and a greeting card ready to print for each of them."
      count={students?.length ?? 0}
      controls={
        <Card className="space-y-4 p-4 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Field id="birthday_date" label="Date">
              <Input
                id="birthday_date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-9 w-full rounded-xl sm:w-48"
              />
            </Field>

            {!isToday && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setDate(todayInput())}
                className="rounded-xl"
              >
                <CalendarDays className="size-4" />
                Back to today
              </Button>
            )}
          </div>

          {/* The list is the working view; the cards below are what prints. */}
          {error ? (
            <p className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive">
              {error}{" "}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setReloadKey((key) => key + 1);
                }}
                className="underline"
              >
                Try again
              </button>
            </p>
          ) : students === null ? (
            <div className="space-y-2">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : students.length === 0 ? (
            <p className="rounded-xl bg-muted/60 px-3.5 py-2.5 text-xs text-muted-foreground">
              Nobody has a birthday on {formatDate(date)}.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <div className="flex items-center gap-2 border-b bg-gold-soft/60 px-4 py-2.5">
                <PartyPopper className="size-4 text-gold" />
                <p className="text-xs font-bold text-neutral-800">
                  {students.length}{" "}
                  {students.length === 1 ? "birthday" : "birthdays"} on{" "}
                  {formatDate(date)}
                </p>
              </div>
              <ul className="divide-y">
                {students.map((student) => (
                  <BirthdayRow key={student.id} student={student} on={date} />
                ))}
              </ul>
            </div>
          )}
        </Card>
      }
    >
      {students && students.length > 0 && (
        // Two cards to an A4 sheet — a greeting is not worth a page each.
        <div className="grid gap-6 print:gap-0">
          {students.map((student) => (
            <GreetingCard
              key={student.id}
              student={student}
              on={date}
              school={school}
            />
          ))}
        </div>
      )}
    </PrintShell>
  );
}
