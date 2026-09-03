"use client";

import * as React from "react";
import { GraduationCap, Search, UsersRound, X } from "lucide-react";

import {
  CardSheet,
  PrintEmpty,
  PrintShell,
} from "@/components/print/print-shell";
import {
  useSchoolProfile,
  type SchoolProfile,
} from "@/components/print/use-school-profile";
import { SectionPicker } from "@/components/shared/section-picker";
import { SyneraxMark } from "@/components/site/logo";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCurrentAcademicYear,
  listSectionRoster,
  listSections,
  listStaff,
  type RosterEntry,
  type Section,
  type StaffMember,
} from "@/lib/api";
import { initialsFrom } from "@/lib/format";

const SEARCH_DEBOUNCE_MS = 350;

/** What each tab hands back to the shell: its pickers, its sheet, its count. */
type TabContent = {
  count: number;
  controls: React.ReactNode;
  body: React.ReactNode;
};

/* -------------------------------------------------------------------------- */
/*                                    Card                                    */
/* -------------------------------------------------------------------------- */

/**
 * A portrait card at 54mm × 86mm — the size of a standard lanyard badge, so it
 * fits the plastic sleeves a school already buys.
 */
function IdCardFrame({
  school,
  children,
}: {
  school: SchoolProfile | null;
  children: React.ReactNode;
}) {
  return (
    <div className="print-avoid-break flex h-[86mm] w-[54mm] flex-col overflow-hidden rounded-xl border border-neutral-300 bg-white">
      <div className="flex items-center gap-1.5 bg-brand-700 px-2 py-1.5 text-white">
        <SyneraxMark variant="mono" className="size-5 shrink-0" />
        <p className="min-w-0 truncate text-[0.5rem] leading-tight font-bold">
          {school?.name?.trim() || "Your School Name"}
        </p>
      </div>
      {children}
    </div>
  );
}

function CardField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <span className="w-[13mm] shrink-0 text-[0.4375rem] font-bold tracking-wide text-neutral-500 uppercase">
        {label}
      </span>
      <span className="min-w-0 flex-1 truncate text-[0.5rem] font-semibold text-neutral-900">
        {value || "—"}
      </span>
    </div>
  );
}

function CardFooter({ school }: { school: SchoolProfile | null }) {
  return (
    <div className="mt-auto border-t border-neutral-200 px-2 py-1">
      <p className="truncate text-center text-[0.4375rem] text-neutral-500">
        {school?.phone?.trim() || school?.address?.trim() || " "}
      </p>
    </div>
  );
}

function StudentIdCard({
  entry,
  section,
  school,
}: {
  entry: RosterEntry;
  section: Section | undefined;
  school: SchoolProfile | null;
}) {
  const fullName = `${entry.first_name} ${entry.last_name}`.trim();
  const placement = section
    ? [section.class_name?.trim(), section.name?.trim()]
        .filter(Boolean)
        .join(" — ")
    : "";
  const roll =
    entry.roll_number != null && String(entry.roll_number) !== ""
      ? String(entry.roll_number)
      : "";

  return (
    <IdCardFrame school={school}>
      <div className="flex flex-col items-center px-2 pt-2.5">
        <span className="flex size-[18mm] items-center justify-center rounded-lg bg-brand-50 text-sm font-black text-brand-700 ring-1 ring-brand-200">
          {initialsFrom(fullName)}
        </span>
        <p className="mt-1.5 line-clamp-2 text-center text-[0.625rem] leading-tight font-black text-neutral-900">
          {fullName || "—"}
        </p>
        <p className="mt-0.5 rounded-full bg-brand-50 px-1.5 text-[0.4375rem] font-bold tracking-wide text-brand-700 uppercase">
          Student
        </p>
      </div>

      <div className="mt-2 space-y-0.5 px-2">
        <CardField label="Adm No" value={entry.admission_number || ""} />
        <CardField label="Roll" value={roll} />
        <CardField label="Class" value={placement} />
        <CardField label="Session" value={school?.session ?? ""} />
      </div>

      <CardFooter school={school} />
    </IdCardFrame>
  );
}

function StaffIdCard({
  member,
  school,
}: {
  member: StaffMember;
  school: SchoolProfile | null;
}) {
  const fullName = `${member.first_name} ${member.last_name}`.trim();

  return (
    <IdCardFrame school={school}>
      <div className="flex flex-col items-center px-2 pt-2.5">
        <span className="flex size-[18mm] items-center justify-center rounded-lg bg-gold-soft text-sm font-black text-gold ring-1 ring-gold/25">
          {initialsFrom(fullName)}
        </span>
        <p className="mt-1.5 line-clamp-2 text-center text-[0.625rem] leading-tight font-black text-neutral-900">
          {fullName || "—"}
        </p>
        <p className="mt-0.5 rounded-full bg-gold-soft px-1.5 text-[0.4375rem] font-bold tracking-wide text-gold uppercase">
          Staff
        </p>
      </div>

      <div className="mt-2 space-y-0.5 px-2">
        <CardField label="Emp No" value={member.employee_code || ""} />
        <CardField label="Phone" value={member.phone || ""} />
        <CardField label="Email" value={member.email || ""} />
        <CardField label="Session" value={school?.session ?? ""} />
      </div>

      <CardFooter school={school} />
    </IdCardFrame>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-[86mm] w-[54mm] rounded-xl" />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Students                                  */
/* -------------------------------------------------------------------------- */

function useStudentCards(school: SchoolProfile | null): TabContent {
  const [sections, setSections] = React.useState<Section[] | null>(null);
  const [sectionId, setSectionId] = React.useState("");
  /** The roster together with the section it answers, so a stale one is
   *  recognisable rather than shown as another class's cards. */
  const [loaded, setLoaded] = React.useState<{
    sectionId: string;
    roster: RosterEntry[];
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    getCurrentAcademicYear()
      .then((year) => (year ? listSections(year.id) : []))
      .then((loaded) => {
        if (!cancelled) setSections(loaded);
      })
      .catch(() => {
        if (!cancelled) setSections([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!sectionId) return;
    let cancelled = false;

    listSectionRoster(sectionId)
      .then((roster) => {
        if (!cancelled) setLoaded({ sectionId, roster });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ sectionId, roster: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [sectionId]);

  const section = sections?.find((entry) => String(entry.id) === sectionId);
  const visible = loaded?.sectionId === sectionId ? loaded.roster : null;

  return {
    count: visible?.length ?? 0,
    controls: (
      <Card className="p-4 shadow-card">
        <SectionPicker
          id="idcard_section"
          sections={sections ?? []}
          value={sectionId}
          onChange={setSectionId}
        />
      </Card>
    ),
    body: !sectionId ? (
      <PrintEmpty>Pick a section — every student in it gets a card.</PrintEmpty>
    ) : !visible ? (
      <CardsSkeleton />
    ) : visible.length === 0 ? (
      <PrintEmpty>No students enrolled in this section yet.</PrintEmpty>
    ) : (
      <CardSheet>
        {visible.map((entry) => (
          <StudentIdCard
            key={String(entry.enrollment_id)}
            entry={entry}
            section={section}
            school={school}
          />
        ))}
      </CardSheet>
    ),
  };
}

/* -------------------------------------------------------------------------- */
/*                                    Staff                                   */
/* -------------------------------------------------------------------------- */

function useStaffCards(school: SchoolProfile | null): TabContent {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [staff, setStaff] = React.useState<StaffMember[] | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    let cancelled = false;

    listStaff({ page: 1, per_page: 60, search: debounced })
      .then((loaded) => {
        if (!cancelled) setStaff(loaded.items);
      })
      .catch(() => {
        if (!cancelled) setStaff([]);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return {
    count: staff?.length ?? 0,
    controls: (
      <Card className="p-4 shadow-card">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter by name, code or email"
            aria-label="Filter staff"
            className="h-10 rounded-2xl pr-9 pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear filter"
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Leave the box empty to print a card for everyone on the payroll.
        </p>
      </Card>
    ),
    body:
      staff === null ? (
        <CardsSkeleton />
      ) : staff.length === 0 ? (
        <PrintEmpty>Nobody matches that filter.</PrintEmpty>
      ) : (
        <CardSheet>
          {staff.map((member) => (
            <StaffIdCard key={member.id} member={member} school={school} />
          ))}
        </CardSheet>
      ),
  };
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function IdCardsView() {
  const school = useSchoolProfile();
  const [tab, setTab] = React.useState("students");

  const students = useStudentCards(school);
  const staff = useStaffCards(school);
  const active = tab === "students" ? students : staff;

  return (
    <PrintShell
      title="ID Cards"
      description="Printable identity cards for students and staff, on the school's own letterhead."
      count={active.count}
      controls={
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-max gap-0.5 rounded-xl p-1">
            <TabsTrigger
              value="students"
              className="gap-2 rounded-lg px-3.5 data-active:text-brand-700 dark:data-active:text-brand-300"
            >
              <GraduationCap className="size-4" />
              Students
            </TabsTrigger>
            <TabsTrigger
              value="staff"
              className="gap-2 rounded-lg px-3.5 data-active:text-brand-700 dark:data-active:text-brand-300"
            >
              <UsersRound className="size-4" />
              Staff
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-4">
            {students.controls}
          </TabsContent>
          <TabsContent value="staff" className="mt-4">
            {staff.controls}
          </TabsContent>
        </Tabs>
      }
    >
      {active.body}
    </PrintShell>
  );
}
