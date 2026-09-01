"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Field, SectionError, fieldProps } from "@/components/shared/form-field";
import { LookupSelect, type LookupOption } from "@/components/shared/lookup-select";
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
  createDepartment,
  createDesignation,
  createStaff,
  getStaffMember,
  listDepartments,
  listDesignations,
  updateStaff,
  type Department,
  type Designation,
  type Gender,
  type NewStaff,
  type StaffDetail,
  type StaffPatch,
} from "@/lib/api";
import { toDateInputValue } from "@/lib/format";

type Mode = "create" | "edit";

/* -------------------------------------------------------------------------- */
/*                                Form plumbing                               */
/* -------------------------------------------------------------------------- */

type FormValues = {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: "" | Gender;
  date_of_birth: string;
  department_id: string;
  designation_id: string;
  join_date: string;
  is_active: boolean;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

/** Both the date inputs and the backend speak ISO, so no conversion is needed. */
const TODAY_ISO = new Date().toISOString().slice(0, 10);

function normaliseGender(value: string | null | undefined): "" | Gender {
  const lower = (value ?? "").trim().toLowerCase();
  return lower === "male" || lower === "female" ? lower : "";
}

function idToString(value: string | number | null | undefined): string {
  return value == null ? "" : String(value);
}

function valuesFrom(staff: StaffDetail | null): FormValues {
  return {
    employee_code: staff?.employee_code ?? "",
    first_name: staff?.first_name ?? "",
    last_name: staff?.last_name ?? "",
    email: staff?.email ?? "",
    phone: staff?.phone ?? "",
    gender: normaliseGender(staff?.gender),
    date_of_birth: toDateInputValue(staff?.date_of_birth),
    department_id: idToString(staff?.department_id),
    designation_id: idToString(staff?.designation_id),
    join_date: toDateInputValue(staff?.join_date),
    is_active: staff?.is_active ?? true,
  };
}

function validate(values: FormValues, mode: Mode): FormErrors {
  const errors: FormErrors = {};

  if (mode === "create" && !values.employee_code.trim()) {
    errors.employee_code = "Employee code is required.";
  }
  if (!values.first_name.trim()) {
    errors.first_name = "First name is required.";
  }
  if (!values.last_name.trim()) {
    errors.last_name = "Last name is required.";
  }
  if (values.email.trim() && !/^\S+@\S+\.\S+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (values.phone.trim() && values.phone.replace(/\D/g, "").length < 6) {
    errors.phone = "Enter a valid phone number.";
  }
  // ISO dates compare correctly as strings.
  if (values.date_of_birth && values.date_of_birth > TODAY_ISO) {
    errors.date_of_birth = "Date of birth cannot be in the future.";
  }

  return errors;
}

function buildCreatePayload(values: FormValues): NewStaff {
  const payload: NewStaff = {
    employee_code: values.employee_code.trim(),
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
  };

  // Optional fields are omitted rather than sent blank.
  if (values.email.trim()) payload.email = values.email.trim();
  if (values.phone.trim()) payload.phone = values.phone.trim();
  if (values.gender) payload.gender = values.gender;
  if (values.date_of_birth) payload.date_of_birth = values.date_of_birth;
  if (values.department_id) payload.department_id = values.department_id;
  if (values.designation_id) payload.designation_id = values.designation_id;
  if (values.join_date) payload.join_date = values.join_date;

  return payload;
}

/** Only what the user actually changed — the backend leaves the rest alone. */
function buildPatch(values: FormValues, initial: FormValues): StaffPatch {
  const patch: StaffPatch = {};

  if (values.first_name.trim() !== initial.first_name)
    patch.first_name = values.first_name.trim();
  if (values.last_name.trim() !== initial.last_name)
    patch.last_name = values.last_name.trim();
  if (values.email.trim() !== initial.email) patch.email = values.email.trim();
  if (values.phone.trim() !== initial.phone) patch.phone = values.phone.trim();
  if (values.gender && values.gender !== initial.gender)
    patch.gender = values.gender;
  if (values.date_of_birth !== initial.date_of_birth)
    patch.date_of_birth = values.date_of_birth;
  if (values.department_id !== initial.department_id)
    patch.department_id = values.department_id;
  if (values.designation_id !== initial.designation_id)
    patch.designation_id = values.designation_id;
  if (values.join_date !== initial.join_date) patch.join_date = values.join_date;
  if (values.is_active !== initial.is_active) patch.is_active = values.is_active;

  return patch;
}

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

function StaffForm({
  mode,
  staff,
  departments,
  designations,
  onCancel,
  onSaved,
}: {
  mode: Mode;
  staff: StaffDetail | null;
  departments: Department[];
  designations: Designation[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  // Mounted fresh each time the dialog opens, so the initialiser is the reset.
  const initial = React.useMemo(() => valuesFrom(staff), [staff]);
  const [values, setValues] = React.useState<FormValues>(initial);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const departmentOptions: LookupOption[] = departments.map((department) => ({
    id: department.id,
    label: department.name,
  }));
  const designationOptions: LookupOption[] = designations.map((designation) => ({
    id: designation.id,
    label: designation.title,
  }));

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    // Clear as they type — a stale error under a corrected field reads as a bug.
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found = validate(values, mode);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    const fullName = `${values.first_name.trim()} ${values.last_name.trim()}`;

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        await createStaff(buildCreatePayload(values));
        toast.success("Staff member added", {
          description: `${fullName} is now on the roster.`,
        });
      } else if (staff) {
        const patch = buildPatch(values, initial);
        if (Object.keys(patch).length === 0) {
          toast.info("Nothing to save", {
            description: "No changes were made to this staff member.",
          });
          setIsSubmitting(false);
          onCancel();
          return;
        }
        await updateStaff(staff.id, patch);
        toast.success("Staff member updated", {
          description: `${fullName}'s record has been saved.`,
        });
      }
      onSaved();
    } catch (error) {
      toast.error(
        mode === "create"
          ? "Could not add the staff member"
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
          id="employee_code"
          label="Employee Code"
          error={errors.employee_code}
          hint={
            mode === "edit"
              ? "Employee codes cannot be changed after joining."
              : undefined
          }
        >
          <Input
            {...fieldProps("employee_code", errors.employee_code)}
            value={values.employee_code}
            onChange={(e) => set("employee_code", e.target.value)}
            placeholder="EMP-2026-001"
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
              placeholder="Meera"
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
              placeholder="Iyer"
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="email" label="Email (optional)" error={errors.email}>
            <Input
              {...fieldProps("email", errors.email)}
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="meera@school.edu"
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>

          <Field id="phone" label="Phone (optional)" error={errors.phone}>
            <Input
              {...fieldProps("phone", errors.phone)}
              type="tel"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+91 98765 43210"
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="gender" label="Gender (optional)">
            <Select
              value={values.gender}
              onValueChange={(value) => set("gender", value as Gender)}
              disabled={isSubmitting}
            >
              <SelectTrigger
                {...fieldProps("gender")}
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

          <Field
            id="date_of_birth"
            label="Date of Birth (optional)"
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
        </div>

        <Field id="department_id" label="Department (optional)">
          <LookupSelect
            id="department_id"
            value={values.department_id}
            onChange={(value) => set("department_id", value)}
            options={departmentOptions}
            placeholder="Select a department"
            createLabel="Add a department"
            createPlaceholder="e.g. Mathematics"
            onCreate={createDepartment}
            disabled={isSubmitting}
          />
        </Field>

        <Field id="designation_id" label="Designation (optional)">
          <LookupSelect
            id="designation_id"
            value={values.designation_id}
            onChange={(value) => set("designation_id", value)}
            options={designationOptions}
            placeholder="Select a designation"
            createLabel="Add a designation"
            createPlaceholder="e.g. Senior Teacher"
            onCreate={createDesignation}
            disabled={isSubmitting}
          />
        </Field>

        <Field id="join_date" label="Join Date (optional)">
          <Input
            {...fieldProps("join_date")}
            type="date"
            value={values.join_date}
            onChange={(e) => set("join_date", e.target.value)}
            disabled={isSubmitting}
            className="h-9 rounded-xl sm:max-w-[calc(50%-0.5rem)]"
          />
        </Field>

        {mode === "edit" && (
          <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/25 p-3.5">
            <div>
              <Label htmlFor="is_active" className="text-sm font-medium">
                Active on the roster
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Inactive staff stay on file but drop out of day-to-day lists.
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
            "Add Staff Member"
          ) : (
            "Save Changes"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Loader                                   */
/* -------------------------------------------------------------------------- */

type Loaded = {
  staff: StaffDetail | null;
  departments: Department[];
  designations: Designation[];
};

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
 * Loads the dropdown options — and, in edit mode, a fresh record. Edits always
 * work from a fresh GET: the list row only carries a handful of columns, and
 * blanking the rest would be a silent data loss.
 */
function FormLoader({
  mode,
  staffId,
  onCancel,
  onSaved,
}: {
  mode: Mode;
  staffId?: string | number | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([
      mode === "edit" && staffId != null
        ? getStaffMember(staffId)
        : Promise.resolve(null),
      listDepartments(),
      listDesignations(),
    ])
      .then(([staff, departments, designations]) => {
        if (cancelled) return;
        setLoaded({ staff, departments, designations });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while opening this form."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [mode, staffId, reloadKey]);

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

  if (!loaded) return <FormSkeleton />;

  return (
    <StaffForm
      mode={mode}
      staff={loaded.staff}
      departments={loaded.departments}
      designations={loaded.designations}
      onCancel={onCancel}
      onSaved={onSaved}
    />
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
export function StaffFormDialog({
  mode,
  staffId,
  open,
  onOpenChange,
  onSaved,
}: {
  mode: Mode;
  /** Required in edit mode. */
  staffId?: string | number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add a staff member" : "Edit staff member"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add someone to the roster. Optional details can be filled in later."
              : "Update this record. Only the fields you change are sent."}
          </DialogDescription>
        </DialogHeader>

        {mode === "edit" && staffId == null ? null : (
          <FormLoader
            mode={mode}
            staffId={staffId}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false);
              onSaved();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
