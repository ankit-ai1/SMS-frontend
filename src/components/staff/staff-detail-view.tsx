"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Briefcase,
  Cake,
  CalendarCheck,
  CalendarPlus,
  ChevronRight,
  IdCard,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Trash2,
  TriangleAlert,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailItem, Panel } from "@/components/shared/panel";
import { AttendanceTab } from "@/components/staff/attendance-tab";
import { StaffFormDialog } from "@/components/staff/staff-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteStaff,
  getStaffMember,
  listDepartments,
  listDesignations,
  sameId,
  type Department,
  type Designation,
  type StaffDetail,
} from "@/lib/api";
import { formatDate, humanizeToken, initialsFrom } from "@/lib/format";

const TABS = [
  { value: "overview", label: "Overview", icon: IdCard },
  { value: "attendance", label: "Attendance", icon: CalendarCheck },
];

type Loaded = {
  staff: StaffDetail;
  departments: Department[];
  designations: Designation[];
};

/* -------------------------------------------------------------------------- */
/*                                   Chrome                                   */
/* -------------------------------------------------------------------------- */

function Breadcrumb({ name }: { name?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link
        href="/staff"
        className="rounded-md font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Staff
      </Link>
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
      {name ? (
        <span className="truncate font-medium">{name}</span>
      ) : (
        <Skeleton className="h-4 w-28 rounded-md" />
      )}
    </nav>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-medium ring-1 ${
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20"
          : "bg-muted text-muted-foreground ring-border"
      }`}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-muted-foreground/50"
        }`}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
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
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate text-sm font-medium">{value}</p>
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

export function StaffDetailView({ staffId }: { staffId: string }) {
  const router = useRouter();

  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([
      getStaffMember(staffId),
      listDepartments(),
      listDesignations(),
    ])
      .then(([staff, departments, designations]) => {
        if (cancelled) return;
        setLoaded({ staff, departments, designations });
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading this staff member."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [staffId, reloadKey]);

  const staff = loaded?.staff ?? null;
  const fullName = staff ? `${staff.first_name} ${staff.last_name}`.trim() : "";

  const departmentName = staff
    ? (loaded?.departments.find((department) =>
        sameId(department.id, staff.department_id)
      )?.name ?? "")
    : "";
  const designationTitle = staff
    ? (loaded?.designations.find((designation) =>
        sameId(designation.id, staff.designation_id)
      )?.title ?? "")
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
              We couldn&rsquo;t load this staff member
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
                <Link href="/staff">Back to staff</Link>
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
      {!staff ? (
        <HeroSkeleton />
      ) : (
        <Card className="gap-0 overflow-hidden py-0 shadow-card">
          <div className="relative border-b bg-gradient-to-br from-brand-50 via-card to-card px-5 py-6 sm:px-6">
            {/* Faint grid, so the wash reads as designed rather than a gradient. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(24rem_12rem_at_0%_0%,black,transparent)]"
            />

            <div className="relative flex flex-wrap items-center gap-5">
              <span className="flex size-18 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-xl font-semibold text-white shadow-brand ring-4 ring-card">
                {initialsFrom(fullName)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                    {fullName || "Unnamed staff member"}
                  </h2>
                  <StatusBadge isActive={staff.is_active} />
                </div>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <IdCard className="size-3.5" />
                    Employee Code
                    <span className="font-medium text-foreground tabular-nums">
                      {staff.employee_code || "—"}
                    </span>
                  </span>
                  {designationTitle && (
                    <>
                      <span aria-hidden className="text-muted-foreground/40">
                        •
                      </span>
                      <span className="font-medium text-foreground">
                        {designationTitle}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-xl bg-card"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
                <Button
                  size="lg"
                  onClick={() => setIsEditOpen(true)}
                  className="rounded-xl shadow-brand transition-all hover:bg-brand-700 hover:shadow-lift"
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
              </div>
            </div>
          </div>

          {/* Fact strip — the three things you look up most, without a tab switch. */}
          <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <HeroFact
              icon={Briefcase}
              label="Department"
              value={departmentName || "—"}
            />
            <HeroFact icon={Mail} label="Email" value={staff.email || "—"} />
            <HeroFact icon={Phone} label="Phone" value={staff.phone || "—"} />
          </div>
        </Card>
      )}

      {/* ------------------------------- Tabs ------------------------------- */}
      <Tabs defaultValue="overview" className="gap-5">
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

        <TabsContent value="overview">
          <Panel
            title="Basic details"
            description="The core record held for this staff member."
            icon={IdCard}
            action={
              <Button
                variant="outline"
                size="lg"
                className="rounded-xl"
                disabled={!staff}
                onClick={() => setIsEditOpen(true)}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            }
          >
            {!staff ? (
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
                  label="Employee Code"
                  icon={IdCard}
                  value={staff.employee_code}
                />
                <DetailItem label="Email" icon={Mail} value={staff.email} />
                <DetailItem label="Phone" icon={Phone} value={staff.phone} />
                <DetailItem
                  label="Gender"
                  icon={User}
                  value={humanizeToken(staff.gender)}
                />
                <DetailItem
                  label="Date of Birth"
                  icon={Cake}
                  value={
                    staff.date_of_birth
                      ? formatDate(staff.date_of_birth)
                      : undefined
                  }
                />
                <DetailItem
                  label="Department"
                  icon={Briefcase}
                  value={departmentName}
                />
                <DetailItem
                  label="Designation"
                  icon={BadgeCheck}
                  value={designationTitle}
                />
                <DetailItem
                  label="Join Date"
                  icon={CalendarPlus}
                  value={staff.join_date ? formatDate(staff.join_date) : undefined}
                />
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceTab staffId={staffId} />
        </TabsContent>
      </Tabs>

      <StaffFormDialog
        mode="edit"
        staffId={staffId}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSaved={() => setReloadKey((key) => key + 1)}
      />

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Remove this staff member?"
        description={
          <>
            {fullName || "This person"} will be taken off the roster. The record
            is kept on file, so this can be undone by your administrator.
          </>
        }
        confirmLabel="Remove staff member"
        pendingLabel="Removing"
        errorTitle="Could not remove the staff member"
        onConfirm={async () => {
          await deleteStaff(staffId);
          toast.success("Staff member removed", {
            description: `${fullName} has been taken off the roster.`,
          });
          router.push("/staff");
        }}
      />
    </div>
  );
}
