"use client";

import * as React from "react";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpen,
  Cake,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Droplet,
  Globe,
  IdCard,
  Mail,
  Phone,
  School,
  Tag,
  TriangleAlert,
  User,
  Users,
} from "lucide-react";

import {
  RowsSkeleton,
  ViewOnlyChip,
} from "@/components/principal/principal-chrome";
import { StudentStatusBadge } from "@/components/principal/principal-students-view";
import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import { DetailItem, Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getStudent,
  getStudentAttendance,
  listEnrollments,
  listGuardians,
  sameId,
  type Enrollment,
  type Guardian,
  type StudentAttendance,
  type StudentDetail,
} from "@/lib/api";
import { formatDate, formatNumber, humanizeToken, initialsFrom } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "overview", label: "Overview", icon: IdCard },
  { value: "guardians", label: "Guardians", icon: Users },
  { value: "enrollment", label: "Enrollment", icon: School },
  { value: "attendance", label: "Attendance", icon: ClipboardCheck },
];

/* -------------------------------------------------------------------------- */
/*                                   Chrome                                   */
/* -------------------------------------------------------------------------- */

function Breadcrumb({ name }: { name?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link
        href="/principal/students"
        className="rounded-md font-semibold text-muted-foreground transition-colors outline-none hover:text-brand-700 focus-visible:ring-3 focus-visible:ring-ring/35"
      >
        Students
      </Link>
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
      {name ? (
        <span className="truncate font-bold">{name}</span>
      ) : (
        <Skeleton className="h-4 w-28 rounded-md" />
      )}
    </nav>
  );
}

/** One cell of the fact strip that runs along the bottom of the hero card. */
function HeroFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof IdCard;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-soft ring-1 ring-brand-100">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-card">
      <div className="border-b bg-gradient-to-br from-brand-50 via-card to-card px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-5">
          <Skeleton className="size-18 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-56 max-w-full rounded-md" />
            <Skeleton className="h-4 w-40 rounded-md" />
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 px-5 py-3.5">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Tabs                                    */
/* -------------------------------------------------------------------------- */

function GuardiansPanel({ studentId }: { studentId: string }) {
  const [guardians, setGuardians] = React.useState<Guardian[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    listGuardians(studentId)
      .then((loaded) => {
        if (cancelled) return;
        setGuardians(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading guardians."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, reloadKey]);

  return (
    <Panel
      title="Guardians"
      description="Who the school contacts about this student."
      icon={Users}
    >
      {error ? (
        <SectionError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      ) : !guardians ? (
        <RowsSkeleton rows={2} />
      ) : guardians.length === 0 ? (
        <SectionEmpty
          icon={Users}
          title="No guardians recorded"
          description="Guardians added by the school office will appear here."
        />
      ) : (
        <ul className="divide-y">
          {guardians.map((guardian) => (
            <li
              key={guardian.id}
              className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-[0.7rem] font-bold text-brand-700 ring-1 ring-brand-100">
                {initialsFrom(guardian.name)}
              </span>

              <div className="min-w-0 flex-1 basis-44">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold">
                    {guardian.name || "—"}
                  </p>
                  {guardian.is_primary && (
                    <span className="rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
                      Primary
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {humanizeToken(guardian.relation) || "Guardian"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {guardian.phone && (
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Phone className="size-3.5" />
                    {guardian.phone}
                  </span>
                )}
                {guardian.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    {guardian.email}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function EnrollmentPanel({ studentId }: { studentId: string }) {
  const [enrollments, setEnrollments] = React.useState<Enrollment[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    listEnrollments({ student_id: studentId })
      .then((loaded) => {
        if (cancelled) return;
        // Narrowed again here, so this is correct whether or not the backend
        // honours the `student_id` filter.
        setEnrollments(
          loaded.filter((entry) => sameId(entry.student_id, studentId))
        );
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading enrollment."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, reloadKey]);

  return (
    <Panel
      title="Enrollment"
      description="Which class and section this student sits in."
      icon={School}
    >
      {error ? (
        <SectionError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      ) : !enrollments ? (
        <RowsSkeleton rows={2} />
      ) : enrollments.length === 0 ? (
        <SectionEmpty
          icon={School}
          title="Not enrolled yet"
          description="Once the office places this student in a section, it shows up here."
        />
      ) : (
        <ul className="divide-y">
          {enrollments.map((enrollment) => (
            <li
              key={enrollment.id}
              className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                <School className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {[enrollment.class_name?.trim(), enrollment.section_name?.trim()]
                    .filter(Boolean)
                    .join(" — ") || `Section ${enrollment.section_id}`}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                  {enrollment.roll_number != null &&
                  String(enrollment.roll_number) !== ""
                    ? `Roll ${enrollment.roll_number}`
                    : "No roll number"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function AttendanceRow({
  row,
}: {
  row: StudentAttendance["history"][number];
}) {
  const normalized = row.status?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const isPresent = normalized === "present" || normalized === "late";

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl ring-1",
          isPresent
            ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20"
            : "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/20"
        )}
      >
        <CheckCircle2 className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{formatDate(row.date)}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {row.subject ? `${row.subject}` : "Daily register"}
          {row.remarks ? ` · ${row.remarks}` : ""}
        </p>
      </div>
      <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-semibold">
        {humanizeToken(row.status)}
      </span>
    </li>
  );
}

function AttendancePanel({ studentId }: { studentId: string }) {
  const [data, setData] = React.useState<StudentAttendance | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    getStudentAttendance(studentId)
      .then((loaded) => {
        if (cancelled) return;
        setData({
          ...loaded,
          history: [...loaded.history].sort((a, b) =>
            b.date.localeCompare(a.date)
          ),
        });
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading attendance."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, reloadKey]);

  const percent = data?.attendance_pct;
  const display =
    percent == null || !Number.isFinite(Number(percent))
      ? null
      : Number(percent) <= 1
        ? Math.round(Number(percent) * 100)
        : Math.round(Number(percent));

  return (
    <Panel
      title="Attendance record"
      description="The daily register held for this student."
      icon={ClipboardCheck}
      action={
        display !== null ? (
          <span className="rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100 tabular-nums">
            {display}% present
          </span>
        ) : undefined
      }
    >
      {error ? (
        <SectionError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      ) : !data ? (
        <RowsSkeleton />
      ) : data.history.length === 0 ? (
        <SectionEmpty
          icon={ClipboardCheck}
          title="No attendance recorded"
          description="Attendance marked for this student will appear here."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-6 border-b bg-muted/25 px-4 py-3.5">
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Present
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatNumber(data.present_days ?? null)}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                Total days
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatNumber(data.total_days ?? data.history.length)}
              </p>
            </div>
          </div>

          <ul className="divide-y">
            {data.history.map((row, index) => (
              <AttendanceRow key={`${row.id ?? row.date}-${index}`} row={row} />
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function PrincipalStudentDetailView({
  studentId,
}: {
  studentId: string;
}) {
  const [student, setStudent] = React.useState<StudentDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    getStudent(studentId)
      .then((loaded) => {
        if (cancelled) return;
        setStudent(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading this student."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, reloadKey]);

  const fullName = student
    ? `${student.first_name} ${student.last_name}`.trim()
    : "";

  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumb />
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" />
            </span>
            <p className="mt-4 text-sm font-medium">
              We couldn&rsquo;t load this student
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {error}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button
                size="lg"
                onClick={() => {
                  setError(null);
                  setReloadKey((key) => key + 1);
                }}
                className="rounded-xl shadow-brand transition-all hover:bg-brand-700 hover:shadow-lift"
              >
                Try again
              </Button>
              <Button variant="outline" size="lg" asChild className="rounded-xl">
                <Link href="/principal/students">Back to students</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb name={fullName || undefined} />

      {/* ------------------------------- Hero ------------------------------- */}
      {!student ? (
        <HeroSkeleton />
      ) : (
        <Card className="gap-0 overflow-hidden py-0 shadow-card">
          <div className="relative border-b bg-[linear-gradient(135deg,var(--brand-50),oklch(1_0_0_/_0.92)_44%,var(--card))] px-5 py-7 sm:px-6">
            {/* Faint grid, so the wash reads as designed rather than a gradient. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(24rem_12rem_at_0%_0%,black,transparent)]"
            />

            <div className="relative flex flex-wrap items-center gap-5">
              <span className="flex size-24 shrink-0 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,var(--brand-600),var(--brand-400))] text-2xl font-black text-white shadow-brand ring-4 ring-card">
                {initialsFrom(fullName)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="truncate text-2xl font-black sm:text-3xl">
                    {fullName || "Unnamed student"}
                  </h2>
                  <StudentStatusBadge isActive={student.is_active} />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <IdCard className="size-3.5" />
                  Admission No.
                  <span className="font-medium text-foreground tabular-nums">
                    {student.admission_number || "—"}
                  </span>
                </p>
              </div>

              <ViewOnlyChip className="bg-card/80" />
            </div>
          </div>

          {/* Fact strip — the three things you look up most, without a tab switch. */}
          <div className="grid divide-y bg-card/45 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <HeroFact
              icon={Cake}
              label="Date of Birth"
              value={formatDate(student.date_of_birth)}
            />
            <HeroFact
              icon={User}
              label="Gender"
              value={humanizeToken(student.gender) || "—"}
            />
            <HeroFact
              icon={Droplet}
              label="Blood Group"
              value={student.blood_group || "—"}
            />
          </div>
        </Card>
      )}

      {/* ------------------------------- Tabs ------------------------------- */}
      <Tabs defaultValue="overview" className="gap-5">
        {/* The list keeps its natural width; the wrapper scrolls when narrow. */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max gap-1 rounded-2xl bg-card/70 p-1 shadow-card ring-1 ring-white/70">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="gap-2 rounded-xl px-4 data-active:text-brand-700 dark:data-active:text-brand-300"
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <Panel
            title="Basic details"
            description="The core record held for this student."
            icon={IdCard}
          >
            {!student ? (
              <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }, (_, index) => (
                  <div key={index} className="space-y-2.5 rounded-xl border p-3.5">
                    <Skeleton className="h-3 w-20 rounded-md" />
                    <Skeleton className="h-4 w-28 rounded-md" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailItem
                  label="Date of Birth"
                  icon={Cake}
                  value={formatDate(student.date_of_birth)}
                />
                <DetailItem
                  label="Gender"
                  icon={User}
                  value={humanizeToken(student.gender)}
                />
                <DetailItem
                  label="Blood Group"
                  icon={Droplet}
                  value={student.blood_group}
                />
                <DetailItem
                  label="Admission Date"
                  icon={CalendarPlus}
                  value={
                    student.admission_date
                      ? formatDate(student.admission_date)
                      : undefined
                  }
                />
                <DetailItem
                  label="Nationality"
                  icon={Globe}
                  value={student.nationality}
                />
                <DetailItem
                  label="Religion"
                  icon={BookOpen}
                  value={student.religion}
                />
                <DetailItem label="Category" icon={Tag} value={student.category} />
                <DetailItem
                  label="Status"
                  icon={BadgeCheck}
                  value={student.is_active ? "Active" : "Inactive"}
                />
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="guardians">
          <GuardiansPanel studentId={studentId} />
        </TabsContent>

        <TabsContent value="enrollment">
          <EnrollmentPanel studentId={studentId} />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendancePanel studentId={studentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
