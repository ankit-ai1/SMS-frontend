"use client";

import * as React from "react";
import { CalendarRange, Hash, LayoutGrid, Loader2, School } from "lucide-react";
import { toast } from "sonner";

import {
  Field,
  SectionEmpty,
  SectionError,
  fieldProps,
} from "@/components/shared/form-field";
import { DetailItem, Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createEnrollment,
  getCurrentAcademicYear,
  getStudentEnrollment,
  listClasses,
  listSections,
  sameId,
  type AcademicYear,
  type Enrollment,
  type SchoolClass,
  type Section,
} from "@/lib/api";

type Context = {
  year: AcademicYear | null;
  classes: SchoolClass[];
  sections: Section[];
  enrollment: Enrollment | null;
};

function yearLabel(year: AcademicYear | null): string {
  return year?.name?.trim() || (year ? `Year ${year.id}` : "—");
}

/**
 * Sections may or may not carry their class. When none of them do, filtering by
 * class would leave the dropdown empty, so fall back to offering all of them.
 */
function sectionsForClass(
  sections: Section[],
  classId: string | number | ""
): Section[] {
  if (!classId) return [];
  const matching = sections.filter((section) =>
    sameId(section.class_id, classId)
  );
  const anyTagged = sections.some((section) => section.class_id != null);
  return anyTagged ? matching : sections;
}

/* -------------------------------------------------------------------------- */
/*                                Enrol dialog                                */
/* -------------------------------------------------------------------------- */

type EnrolValues = {
  class_id: string;
  section_id: string;
  roll_number: string;
};

type EnrolErrors = Partial<Record<keyof EnrolValues, string>>;

function EnrolForm({
  studentId,
  year,
  classes,
  sections,
  onCancel,
  onSaved,
}: {
  studentId: string | number;
  year: AcademicYear;
  classes: SchoolClass[];
  sections: Section[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = React.useState<EnrolValues>({
    class_id: "",
    section_id: "",
    roll_number: "",
  });
  const [errors, setErrors] = React.useState<EnrolErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const available = sectionsForClass(sections, values.class_id);

  function set<K extends keyof EnrolValues>(key: K, value: string) {
    setValues((current) => ({
      ...current,
      [key]: value,
      // A section belongs to a class, so changing the class clears it.
      ...(key === "class_id" ? { section_id: "" } : {}),
    }));
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found: EnrolErrors = {};
    if (!values.class_id) found.class_id = "Select a class.";
    if (!values.section_id) found.section_id = "Select a section.";
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      await createEnrollment({
        student_id: studentId,
        section_id: values.section_id,
        academic_year_id: year.id,
        ...(values.roll_number.trim()
          ? { roll_number: values.roll_number.trim() }
          : {}),
      });
      toast.success("Student enrolled", {
        description: `Enrolled for ${yearLabel(year)}.`,
      });
      onSaved();
    } catch (error) {
      toast.error("Could not enrol the student", {
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
          <CalendarRange className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Academic year</p>
            <p className="truncate text-sm font-medium">{yearLabel(year)}</p>
          </div>
        </div>

        <Field id="class_id" label="Class" error={errors.class_id}>
          <Select
            value={values.class_id}
            onValueChange={(value) => set("class_id", value)}
            disabled={isSubmitting || classes.length === 0}
          >
            <SelectTrigger
              {...fieldProps("class_id", errors.class_id)}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue
                placeholder={
                  classes.length === 0 ? "No classes set up" : "Select a class"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {classes.map((schoolClass) => (
                <SelectItem key={schoolClass.id} value={String(schoolClass.id)}>
                  {schoolClass.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="section_id" label="Section" error={errors.section_id}>
          <Select
            value={values.section_id}
            onValueChange={(value) => set("section_id", value)}
            disabled={isSubmitting || !values.class_id || available.length === 0}
          >
            <SelectTrigger
              {...fieldProps("section_id", errors.section_id)}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue
                placeholder={
                  !values.class_id
                    ? "Pick a class first"
                    : available.length === 0
                      ? "No sections in this class"
                      : "Select a section"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {available.map((section) => (
                <SelectItem key={section.id} value={String(section.id)}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="roll_number" label="Roll Number (optional)">
          <Input
            {...fieldProps("roll_number")}
            value={values.roll_number}
            onChange={(e) => set("roll_number", e.target.value)}
            placeholder="12"
            autoComplete="off"
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="rounded-xl"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Enrolling
            </>
          ) : (
            "Enroll Student"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Tab                                     */
/* -------------------------------------------------------------------------- */

export function EnrollmentTab({ studentId }: { studentId: string | number }) {
  const [context, setContext] = React.useState<Context | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [isEnrolOpen, setIsEnrolOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function load(): Promise<Context> {
      const [year, classes] = await Promise.all([
        getCurrentAcademicYear(),
        listClasses(),
      ]);

      if (!year) return { year: null, classes, sections: [], enrollment: null };

      const [sections, enrollment] = await Promise.all([
        listSections(year.id),
        getStudentEnrollment(studentId, year.id),
      ]);

      return { year, classes, sections, enrollment };
    }

    load()
      .then((loaded) => {
        if (cancelled) return;
        setContext(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading the enrolment."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, reloadKey]);

  function reload() {
    setError(null);
    setContext(null);
    setReloadKey((key) => key + 1);
  }

  const enrollment = context?.enrollment ?? null;
  const section = enrollment
    ? (context?.sections.find((candidate) =>
        sameId(candidate.id, enrollment.section_id)
      ) ?? null)
    : null;
  const schoolClass = section
    ? (context?.classes.find((candidate) =>
        sameId(candidate.id, section.class_id)
      ) ?? null)
    : null;

  return (
    <>
      <Panel
        title="Enrollment"
        description="Where this student sits in the current academic year."
        icon={School}
        action={
          context?.year && !enrollment ? (
            <Button
              size="lg"
              onClick={() => setIsEnrolOpen(true)}
              className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
            >
              <School className="size-4" />
              Enroll
            </Button>
          ) : undefined
        }
      >
        {error ? (
          <SectionError message={error} onRetry={reload} />
        ) : context === null ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-2.5 rounded-xl border p-3.5">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            ))}
          </div>
        ) : !context.year ? (
          <SectionEmpty
            icon={CalendarRange}
            title="No academic year set up"
            description="Add an academic year before students can be enrolled into classes."
          />
        ) : enrollment ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem
              label="Academic Year"
              icon={CalendarRange}
              value={yearLabel(context.year)}
            />
            <DetailItem
              label="Class"
              icon={School}
              value={
                enrollment.class_name ??
                section?.class_name ??
                schoolClass?.name ??
                undefined
              }
            />
            <DetailItem
              label="Section"
              icon={LayoutGrid}
              value={enrollment.section_name ?? section?.name ?? undefined}
            />
            <DetailItem
              label="Roll Number"
              icon={Hash}
              value={
                enrollment.roll_number != null
                  ? String(enrollment.roll_number)
                  : undefined
              }
            />
          </div>
        ) : (
          <SectionEmpty
            icon={School}
            title="Not enrolled yet"
            description={`This student has no place in ${yearLabel(
              context.year
            )}. Enroll them into a class and section.`}
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsEnrolOpen(true)}
              className="rounded-xl"
            >
              <School className="size-4" />
              Enroll Student
            </Button>
          </SectionEmpty>
        )}
      </Panel>

      {context?.year && (
        <Dialog open={isEnrolOpen} onOpenChange={setIsEnrolOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Enroll student</DialogTitle>
              <DialogDescription>
                Give this student a place in a class and section for the current
                academic year.
              </DialogDescription>
            </DialogHeader>
            <EnrolForm
              studentId={studentId}
              year={context.year}
              classes={context.classes}
              sections={context.sections}
              onCancel={() => setIsEnrolOpen(false)}
              onSaved={() => {
                setIsEnrolOpen(false);
                reload();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
