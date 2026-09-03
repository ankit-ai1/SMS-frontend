"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  BookOpen,
  Cake,
  CalendarPlus,
  ChevronRight,
  Droplet,
  FileText,
  Globe,
  IdCard,
  Pencil,
  RefreshCw,
  School,
  Tag,
  Trash2,
  TriangleAlert,
  User,
  Users,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { StudentStatusBadge } from "@/components/clerk/clerk-students-view";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DocumentsTab } from "@/components/students/documents-tab";
import { EnrollmentTab } from "@/components/students/enrollment-tab";
import { GuardiansTab } from "@/components/students/guardians-tab";
import { SiblingsPanel } from "@/components/students/siblings-panel";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import { DetailItem, Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteStudent, getStudent, type StudentDetail } from "@/lib/api";
import { formatDate, humanizeToken, initialsFrom } from "@/lib/format";

/**
 * Medical is deliberately absent: a clerk's remit is admissions, papers and
 * placement. Health records belong to whoever the school gives them to, and the
 * tab is one line to add here if that changes.
 */
const TABS = [
  { value: "overview", label: "Overview", icon: IdCard },
  { value: "guardians", label: "Guardians", icon: Users },
  { value: "siblings", label: "Siblings", icon: UsersRound },
  { value: "documents", label: "Documents", icon: FileText },
  { value: "enrollment", label: "Enrollment", icon: School },
];

/* -------------------------------------------------------------------------- */
/*                                   Chrome                                   */
/* -------------------------------------------------------------------------- */

function Breadcrumb({ name }: { name?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link
        href="/clerk/students"
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
          <Skeleton className="h-9 w-32 rounded-xl" />
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
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function ClerkStudentDetailView({ studentId }: { studentId: string }) {
  const router = useRouter();

  const [student, setStudent] = React.useState<StudentDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

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
                <RefreshCw className="size-4" />
                Try again
              </Button>
              <Button variant="outline" size="lg" asChild className="rounded-xl">
                <Link href="/clerk/students">Back to students</Link>
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

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-2xl bg-card"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
                <Button
                  size="lg"
                  onClick={() => setIsEditOpen(true)}
                  className="rounded-2xl"
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
              </div>
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
            action={
              <Button
                variant="outline"
                size="lg"
                className="rounded-xl"
                disabled={!student}
                onClick={() => setIsEditOpen(true)}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            }
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
          <GuardiansTab studentId={studentId} />
        </TabsContent>

        <TabsContent value="siblings">
          <SiblingsPanel studentId={studentId} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab studentId={studentId} />
        </TabsContent>

        <TabsContent value="enrollment">
          <EnrollmentTab studentId={studentId} />
        </TabsContent>
      </Tabs>

      <StudentFormDialog
        mode="edit"
        studentId={studentId}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSaved={() => setReloadKey((key) => key + 1)}
      />

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Remove this student?"
        description={
          <>
            {fullName || "This student"} will be taken off the roll. The record
            is kept on file, so this can be undone by your administrator.
          </>
        }
        confirmLabel="Remove student"
        pendingLabel="Removing"
        errorTitle="Could not remove the student"
        onConfirm={async () => {
          await deleteStudent(studentId);
          toast.success("Student removed", {
            description: `${fullName} has been taken off the roll.`,
          });
          router.push("/clerk/students");
        }}
      />
    </div>
  );
}
