"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Field, SectionError, fieldProps } from "@/components/shared/form-field";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  createEnrollment,
  createStudent,
  getCurrentAcademicYear,
  getStudent,
  listClasses,
  listSections,
  sameId,
  updateStudent,
  type AcademicYear,
  type Gender,
  type NewStudent,
  type SchoolClass,
  type Section,
  type StudentDetail,
  type StudentPatch,
} from "@/lib/api";
import { toDateInputValue } from "@/lib/format";

/* -------------------------------------------------------------------------- */
/*                                Form plumbing                               */
/* -------------------------------------------------------------------------- */

type FormValues = {
  admission_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: "" | Gender;
  blood_group: string;
  admission_date: string;
  nationality: string;
  religion: string;
  category: string;
  is_active: boolean;
  class_id: string;
  section_id: string;
  roll_number: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

/**
 * What a new student can be placed into. Null when the school has no academic
 * year or no sections yet — the form then drops the class fields rather than
 * showing empty dropdowns nobody can satisfy.
 */
type Placement = {
  year: AcademicYear;
  classes: SchoolClass[];
  sections: Section[];
};

/**
 * Sections may or may not carry their class. When none of them do, filtering by
 * class would leave the dropdown empty, so fall back to offering all of them.
 */
function sectionsForClass(sections: Section[], classId: string): Section[] {
  if (!classId) return [];
  const matching = sections.filter((section) =>
    sameId(section.class_id, classId)
  );
  const anyTagged = sections.some((section) => section.class_id != null);
  return anyTagged ? matching : sections;
}

/** "Class 8 — A" where the section knows its class, otherwise just "A". */
function sectionLabel(sections: Section[], sectionId: string): string {
  const section = sections.find((candidate) => sameId(candidate.id, sectionId));
  if (!section) return "their section";
  return section.class_name
    ? `${section.class_name} — ${section.name}`
    : section.name;
}

/** Both the date inputs and the backend speak ISO, so no conversion is needed. */
const TODAY_ISO = new Date().toISOString().slice(0, 10);

function normaliseGender(value: string | null | undefined): "" | Gender {
  const lower = (value ?? "").trim().toLowerCase();
  return lower === "male" || lower === "female" ? lower : "";
}

function valuesFrom(student: StudentDetail | null): FormValues {
  return {
    admission_number: student?.admission_number ?? "",
    first_name: student?.first_name ?? "",
    last_name: student?.last_name ?? "",
    date_of_birth: toDateInputValue(student?.date_of_birth),
    gender: normaliseGender(student?.gender),
    blood_group: student?.blood_group ?? "",
    admission_date: toDateInputValue(student?.admission_date),
    nationality: student?.nationality ?? "",
    religion: student?.religion ?? "",
    category: student?.category ?? "",
    is_active: student?.is_active ?? true,
    class_id: "",
    section_id: "",
    roll_number: "",
  };
}

function validate(
  values: FormValues,
  mode: Mode,
  placement: Placement | null
): FormErrors {
  const errors: FormErrors = {};

  if (mode === "create" && placement) {
    if (!values.class_id) errors.class_id = "Select a class.";
    if (!values.section_id) errors.section_id = "Select a section.";
  }

  if (mode === "create" && !values.admission_number.trim()) {
    errors.admission_number = "Admission number is required.";
  }
  if (!values.first_name.trim()) {
    errors.first_name = "First name is required.";
  }
  if (!values.last_name.trim()) {
    errors.last_name = "Last name is required.";
  }
  if (!values.date_of_birth) {
    errors.date_of_birth = "Date of birth is required.";
  } else if (values.date_of_birth > TODAY_ISO) {
    // ISO dates compare correctly as strings.
    errors.date_of_birth = "Date of birth cannot be in the future.";
  }
  if (!values.gender) {
    errors.gender = "Select a gender.";
  }
  if (values.admission_date && values.admission_date > TODAY_ISO) {
    errors.admission_date = "Admission date cannot be in the future.";
  }

  return errors;
}

/** Only what the user actually changed — the backend leaves the rest alone. */
function buildPatch(values: FormValues, initial: FormValues): StudentPatch {
  const patch: StudentPatch = {};

  if (values.first_name.trim() !== initial.first_name)
    patch.first_name = values.first_name.trim();
  if (values.last_name.trim() !== initial.last_name)
    patch.last_name = values.last_name.trim();
  if (values.date_of_birth !== initial.date_of_birth)
    patch.date_of_birth = values.date_of_birth;
  if (values.gender && values.gender !== initial.gender)
    patch.gender = values.gender;
  if (values.blood_group.trim() !== initial.blood_group)
    patch.blood_group = values.blood_group.trim();
  if (values.nationality.trim() !== initial.nationality)
    patch.nationality = values.nationality.trim();
  if (values.religion.trim() !== initial.religion)
    patch.religion = values.religion.trim();
  if (values.category.trim() !== initial.category)
    patch.category = values.category.trim();
  if (values.is_active !== initial.is_active) patch.is_active = values.is_active;

  return patch;
}

function buildCreatePayload(values: FormValues): NewStudent {
  const payload: NewStudent = {
    admission_number: values.admission_number.trim(),
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    date_of_birth: values.date_of_birth,
    gender: values.gender as Gender,
  };

  // Optional fields are omitted rather than sent blank.
  if (values.blood_group.trim()) payload.blood_group = values.blood_group.trim();
  if (values.admission_date) payload.admission_date = values.admission_date;
  if (values.nationality.trim()) payload.nationality = values.nationality.trim();
  if (values.religion.trim()) payload.religion = values.religion.trim();
  if (values.category.trim()) payload.category = values.category.trim();

  return payload;
}

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

type Mode = "create" | "edit";

function StudentForm({
  mode,
  student,
  placement,
  onCancel,
  onSaved,
}: {
  mode: Mode;
  student: StudentDetail | null;
  /** Create mode only: the year and sections a new student can be placed into. */
  placement?: Placement | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  // Mounted fresh each time the dialog opens, so the initialiser is the reset.
  const initial = React.useMemo(() => valuesFrom(student), [student]);
  const [values, setValues] = React.useState<FormValues>(initial);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const sections = placement?.sections;
  const availableSections = React.useMemo(
    () => (sections ? sectionsForClass(sections, values.class_id) : []),
    [sections, values.class_id]
  );

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({
      ...current,
      [key]: value,
      // A section belongs to one class, so the old pick is never still valid.
      ...(key === "class_id" ? { section_id: "" } : {}),
    }));
    // Clear as they type — a stale error under a corrected field reads as a bug.
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found = validate(values, mode, placement ?? null);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    const name = `${values.first_name.trim()} ${values.last_name.trim()}`;

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const created = await createStudent(buildCreatePayload(values));

        if (placement && values.section_id) {
          // The student record already exists by now. If the enrolment call
          // fails we must not report a plain failure — that would send them to
          // re-add a student who is already on the roll.
          try {
            await createEnrollment({
              student_id: created.id,
              section_id: values.section_id,
              academic_year_id: placement.year.id,
              ...(values.roll_number.trim()
                ? { roll_number: values.roll_number.trim() }
                : {}),
            });
          } catch (cause: unknown) {
            toast.warning("Student added, but not placed in a class", {
              description: `${name} is on the roll. Open their Enrollment tab to assign the class. (${
                cause instanceof Error ? cause.message : "Enrolment failed"
              })`,
            });
            onSaved();
            return;
          }
        }

        toast.success("Student added", {
          description: placement && values.section_id
            ? `${name} is on the roll in ${sectionLabel(
                placement.sections,
                values.section_id
              )}.`
            : `${name} is now on the roll.`,
        });
      } else if (student) {
        const patch = buildPatch(values, initial);
        if (Object.keys(patch).length === 0) {
          toast.info("Nothing to save", {
            description: "No changes were made to this student.",
          });
          setIsSubmitting(false);
          onCancel();
          return;
        }
        await updateStudent(student.id, patch);
        toast.success("Student updated", {
          description: `${values.first_name.trim()} ${values.last_name.trim()}'s record has been saved.`,
        });
      }
      onSaved();
    } catch (error) {
      toast.error(
        mode === "create"
          ? "Could not add the student"
          : "Could not save the changes",
        {
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
        }
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="-mx-1 max-h-[55vh] space-y-4 overflow-y-auto px-1">
        <Field
          id="admission_number"
          label="Admission Number"
          error={errors.admission_number}
          hint={
            mode === "edit"
              ? "Admission numbers cannot be changed after enrolment."
              : undefined
          }
        >
          <Input
            {...fieldProps("admission_number", errors.admission_number)}
            value={values.admission_number}
            onChange={(e) => set("admission_number", e.target.value)}
            placeholder="ADM-2026-001"
            autoComplete="off"
            disabled={isSubmitting || mode === "edit"}
            className="h-9 rounded-xl"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="first_name" label="First Name" error={errors.first_name}>
            <Input
              {...fieldProps("first_name", errors.first_name)}
              value={values.first_name}
              onChange={(e) => set("first_name", e.target.value)}
              placeholder="Aarav"
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>

          <Field id="last_name" label="Last Name" error={errors.last_name}>
            <Input
              {...fieldProps("last_name", errors.last_name)}
              value={values.last_name}
              onChange={(e) => set("last_name", e.target.value)}
              placeholder="Sharma"
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="date_of_birth"
            label="Date of Birth"
            error={errors.date_of_birth}
          >
            <Input
              {...fieldProps("date_of_birth", errors.date_of_birth)}
              type="date"
              max={TODAY_ISO}
              value={values.date_of_birth}
              onChange={(e) => set("date_of_birth", e.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>

          <Field id="gender" label="Gender" error={errors.gender}>
            <Select
              value={values.gender}
              onValueChange={(value) => set("gender", value as Gender)}
              disabled={isSubmitting}
            >
              <SelectTrigger
                {...fieldProps("gender", errors.gender)}
                className="h-9 w-full rounded-xl"
              >
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/*
          Class placement is create-only. Moving a student later is a transfer,
          which the Enrollment tab owns — offering it here too would give one
          fact two owners.
        */}
        {mode === "create" && placement && (
          <div className="space-y-4 rounded-xl border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Class placement · {placement.year.name?.trim() || "current year"}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="class_id" label="Class" error={errors.class_id}>
                <Select
                  value={values.class_id}
                  onValueChange={(value) => set("class_id", value)}
                  disabled={isSubmitting || placement.classes.length === 0}
                >
                  <SelectTrigger
                    {...fieldProps("class_id", errors.class_id)}
                    className="h-9 w-full rounded-xl"
                  >
                    <SelectValue
                      placeholder={
                        placement.classes.length === 0
                          ? "No classes set up"
                          : "Select a class"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {placement.classes.map((schoolClass) => (
                      <SelectItem
                        key={schoolClass.id}
                        value={String(schoolClass.id)}
                      >
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
                  disabled={
                    isSubmitting ||
                    !values.class_id ||
                    availableSections.length === 0
                  }
                >
                  <SelectTrigger
                    {...fieldProps("section_id", errors.section_id)}
                    className="h-9 w-full rounded-xl"
                  >
                    <SelectValue
                      placeholder={
                        !values.class_id
                          ? "Pick a class first"
                          : availableSections.length === 0
                            ? "No sections in this class"
                            : "Select a section"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSections.map((section) => (
                      <SelectItem key={section.id} value={String(section.id)}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field id="roll_number" label="Roll Number (optional)">
              <Input
                {...fieldProps("roll_number")}
                value={values.roll_number}
                onChange={(e) => set("roll_number", e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. 14"
                className="h-9 rounded-xl sm:max-w-[calc(50%-0.5rem)]"
              />
            </Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="blood_group" label="Blood Group (optional)">
            <Input
              {...fieldProps("blood_group")}
              value={values.blood_group}
              onChange={(e) => set("blood_group", e.target.value)}
              placeholder="O+"
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>

          <Field id="nationality" label="Nationality (optional)">
            <Input
              {...fieldProps("nationality")}
              value={values.nationality}
              onChange={(e) => set("nationality", e.target.value)}
              placeholder="Indian"
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="religion" label="Religion (optional)">
            <Input
              {...fieldProps("religion")}
              value={values.religion}
              onChange={(e) => set("religion", e.target.value)}
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>

          <Field id="category" label="Category (optional)">
            <Input
              {...fieldProps("category")}
              value={values.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="General"
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>
        </div>

        {/* Admission date is create-only: the update endpoint does not take it. */}
        {mode === "create" && (
          <Field
            id="admission_date"
            label="Admission Date (optional)"
            error={errors.admission_date}
          >
            <Input
              {...fieldProps("admission_date", errors.admission_date)}
              type="date"
              max={TODAY_ISO}
              value={values.admission_date}
              onChange={(e) => set("admission_date", e.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-xl sm:max-w-[calc(50%-0.5rem)]"
            />
          </Field>
        )}

        {mode === "edit" && (
          <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
            <div>
              <Label htmlFor="is_active" className="text-sm font-medium">
                Active on the roll
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Inactive students stay on file but drop out of day-to-day lists.
              </p>
            </div>
            <Switch
              id="is_active"
              checked={values.is_active}
              onCheckedChange={(checked) => set("is_active", checked)}
              disabled={isSubmitting}
            />
          </div>
        )}
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
              Saving
            </>
          ) : mode === "create" ? (
            "Add Student"
          ) : (
            "Save Changes"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Edit loader                                */
/* -------------------------------------------------------------------------- */

function FormSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="space-y-1.5">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/**
 * Edits always work from a freshly fetched record: the list row only carries a
 * handful of columns, and blanking the rest would be a silent data loss.
 */
function EditLoader({
  studentId,
  onCancel,
  onSaved,
}: {
  studentId: string | number;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [student, setStudent] = React.useState<StudentDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    getStudent(studentId)
      .then((loaded) => {
        if (!cancelled) setStudent(loaded);
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

  if (error) {
    return (
      <SectionError
        message={error}
        onRetry={() => {
          setError(null);
          setReloadKey((key) => key + 1);
        }}
      />
    );
  }

  if (!student) return <FormSkeleton />;

  return (
    <StudentForm
      mode="edit"
      student={student}
      onCancel={onCancel}
      onSaved={onSaved}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                               Create loader                                */
/* -------------------------------------------------------------------------- */

type PlacementState =
  | { status: "loading" }
  | { status: "ready"; placement: Placement | null }
  | { status: "failed" };

/**
 * Loads the classes a new student can be placed into. A failure here never
 * blocks the form: adding the student is the point, and the class can still be
 * set from their Enrollment tab afterwards.
 */
function CreateLoader({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [state, setState] = React.useState<PlacementState>({
    status: "loading",
  });

  React.useEffect(() => {
    let cancelled = false;

    async function load(): Promise<Placement | null> {
      const [year, classes] = await Promise.all([
        getCurrentAcademicYear(),
        listClasses(),
      ]);
      if (!year) return null;

      const sections = await listSections(year.id);
      return sections.length > 0 ? { year, classes, sections } : null;
    }

    load()
      .then((placement) => {
        if (!cancelled) setState({ status: "ready", placement });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "failed" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") return <FormSkeleton />;

  const placement = state.status === "ready" ? state.placement : null;

  return (
    <>
      {state.status === "failed" && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          Could not load the class list. You can still add the student — set
          their class from the Enrollment tab afterwards.
        </p>
      )}
      {state.status === "ready" && !placement && (
        <p className="rounded-xl border bg-muted/50 p-3 text-xs text-muted-foreground">
          No academic year or sections are set up yet, so this student will be
          added without a class. Finish Academic Setup, then place them from
          their Enrollment tab.
        </p>
      )}
      <StudentForm
        mode="create"
        student={null}
        placement={placement}
        onCancel={onCancel}
        onSaved={onSaved}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Dialog                                   */
/* -------------------------------------------------------------------------- */

/**
 * Controlled by the caller so it can be opened from a dropdown item, which
 * unmounts itself on select. Radix unmounts the content when closed, so the
 * form state resets on every open without an effect to reset it.
 */
export function StudentFormDialog({
  mode,
  studentId,
  open,
  onOpenChange,
  onSaved,
}: {
  mode: Mode;
  /** Required in edit mode. */
  studentId?: string | number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  function close() {
    onOpenChange(false);
  }

  function handleSaved() {
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add a student" : "Edit student"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Enrol a new student and place them in a class. Optional details can be filled in later."
              : "Update this student's record. Only the fields you change are sent."}
          </DialogDescription>
        </DialogHeader>

        {mode === "create" ? (
          <CreateLoader onCancel={close} onSaved={handleSaved} />
        ) : studentId != null ? (
          <EditLoader
            studentId={studentId}
            onCancel={close}
            onSaved={handleSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
