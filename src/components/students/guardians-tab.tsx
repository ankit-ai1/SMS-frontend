"use client";

import * as React from "react";
import {
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { ParentLoginDialog } from "@/components/students/parent-login-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Field,
  SectionEmpty,
  SectionError,
  fieldProps,
} from "@/components/shared/form-field";
import { Panel, RowActions } from "@/components/shared/panel";
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
  createGuardian,
  deleteGuardian,
  listGuardians,
  updateGuardian,
  type Guardian,
  type NewGuardian,
} from "@/lib/api";
import { initialsFrom } from "@/lib/format";

/** The relations the school records. Anything else already on file is kept. */
const RELATIONS = [
  "Father",
  "Mother",
  "Guardian",
  "Grandfather",
  "Grandmother",
  "Other",
];

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

type GuardianValues = {
  name: string;
  relation: string;
  phone: string;
  email: string;
  is_primary: boolean;
};

type GuardianErrors = Partial<Record<keyof GuardianValues, string>>;

function valuesFrom(guardian: Guardian | null): GuardianValues {
  return {
    name: guardian?.name ?? "",
    relation: guardian?.relation ?? "",
    phone: guardian?.phone ?? "",
    email: guardian?.email ?? "",
    is_primary: guardian?.is_primary ?? false,
  };
}

/** Title-cases a stored relation so "mother" matches the "Mother" option. */
function normaliseRelation(relation: string): string {
  const trimmed = relation.trim();
  if (!trimmed) return "";
  const match = RELATIONS.find(
    (option) => option.toLowerCase() === trimmed.toLowerCase()
  );
  return match ?? trimmed;
}

function validate(values: GuardianValues): GuardianErrors {
  const errors: GuardianErrors = {};

  if (!values.name.trim()) errors.name = "Name is required.";
  if (!values.relation.trim()) errors.relation = "Select a relation.";
  if (values.email.trim() && !/^\S+@\S+\.\S+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (values.phone.trim() && values.phone.replace(/\D/g, "").length < 6) {
    errors.phone = "Enter a valid phone number.";
  }

  return errors;
}

function buildPayload(values: GuardianValues): NewGuardian {
  return {
    name: values.name.trim(),
    relation: values.relation.trim(),
    ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
    ...(values.email.trim() ? { email: values.email.trim() } : {}),
    is_primary: values.is_primary,
  };
}

function GuardianForm({
  studentId,
  guardian,
  onCancel,
  onSaved,
}: {
  studentId: string | number;
  /** Null in create mode. */
  guardian: Guardian | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  // Mounted fresh each time the dialog opens, so the initialiser is the reset.
  const initial = React.useMemo(() => valuesFrom(guardian), [guardian]);
  const [values, setValues] = React.useState<GuardianValues>(initial);
  const [errors, setErrors] = React.useState<GuardianErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const storedRelation = normaliseRelation(initial.relation);
  // Keep a relation that predates this list so editing cannot silently drop it.
  const options = RELATIONS.includes(storedRelation)
    ? RELATIONS
    : storedRelation
      ? [...RELATIONS, storedRelation]
      : RELATIONS;

  function set<K extends keyof GuardianValues>(
    key: K,
    value: GuardianValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found = validate(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      if (guardian) {
        await updateGuardian(studentId, guardian.id, buildPayload(values));
        toast.success("Guardian updated", {
          description: `${values.name.trim()}'s details have been saved.`,
        });
      } else {
        await createGuardian(studentId, buildPayload(values));
        toast.success("Guardian added", {
          description: `${values.name.trim()} is now linked to this student.`,
        });
      }
      onSaved();
    } catch (error) {
      toast.error(
        guardian ? "Could not save the guardian" : "Could not add the guardian",
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
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="guardian_name" label="Name" error={errors.name}>
            <Input
              {...fieldProps("guardian_name", errors.name)}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Priya Sharma"
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>

          <Field id="guardian_relation" label="Relation" error={errors.relation}>
            <Select
              value={normaliseRelation(values.relation)}
              onValueChange={(value) => set("relation", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger
                {...fieldProps("guardian_relation", errors.relation)}
                className="h-9 w-full rounded-xl"
              >
                <SelectValue placeholder="Select a relation" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="guardian_phone"
            label="Phone (optional)"
            error={errors.phone}
          >
            <Input
              {...fieldProps("guardian_phone", errors.phone)}
              type="tel"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+91 98765 43210"
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>

          <Field
            id="guardian_email"
            label="Email (optional)"
            error={errors.email}
          >
            <Input
              {...fieldProps("guardian_email", errors.email)}
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="priya@example.com"
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/25 p-3.5">
          <div>
            <Label htmlFor="is_primary" className="text-sm font-medium">
              Primary contact
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              The first person the school calls about this student.
            </p>
          </div>
          <Switch
            id="is_primary"
            checked={values.is_primary}
            onCheckedChange={(checked) => set("is_primary", checked)}
            disabled={isSubmitting}
          />
        </div>
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
          ) : guardian ? (
            "Save Changes"
          ) : (
            "Add Guardian"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Rows                                    */
/* -------------------------------------------------------------------------- */

function GuardianRow({
  guardian,
  onEdit,
  onDelete,
  onCreateLogin,
}: {
  guardian: Guardian;
  onEdit: () => void;
  onDelete: () => void;
  onCreateLogin: () => void;
}) {
  const loginEmail = guardian.user_email?.trim();
  // A linked account without an address on the row still counts as a login —
  // offering to create a second one would only fail.
  const hasLogin = Boolean(loginEmail) || guardian.user_id != null;

  return (
    <li className="group/row flex flex-wrap items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/40">
      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
        {initialsFrom(guardian.name)}
        {guardian.is_primary && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-card">
            <Star className="size-2.5 fill-current" />
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{guardian.name}</p>
          {guardian.is_primary && (
            <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[0.625rem] font-medium tracking-wide text-brand-700 uppercase">
              Primary
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground capitalize">
          {guardian.relation}
        </p>

        {/* Whether this guardian can sign in to the parent portal. */}
        <div className="mt-2">
          {hasLogin ? (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20">
              <ShieldCheck className="size-3.5 shrink-0" />
              <span className="truncate">
                {loginEmail ? `Login: ${loginEmail}` : "Parent login linked"}
              </span>
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateLogin}
              className="rounded-lg"
            >
              <KeyRound className="size-3.5" />
              Create parent login
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:items-end">
        {guardian.phone && (
          <a
            href={`tel:${guardian.phone}`}
            className="flex items-center gap-1.5 rounded-md transition-colors hover:text-foreground"
          >
            <Phone className="size-3.5" />
            {guardian.phone}
          </a>
        )}
        {guardian.email && (
          <a
            href={`mailto:${guardian.email}`}
            className="flex items-center gap-1.5 rounded-md transition-colors hover:text-foreground"
          >
            <Mail className="size-3.5" />
            <span className="truncate">{guardian.email}</span>
          </a>
        )}
      </div>

      <RowActions label={guardian.name} onEdit={onEdit} onDelete={onDelete} />
    </li>
  );
}

function GuardianRowSkeleton() {
  return (
    <li className="flex items-center gap-4 px-4 py-4">
      <Skeleton className="size-10 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40 max-w-full rounded-md" />
        <Skeleton className="h-3 w-20 rounded-md" />
      </div>
      <Skeleton className="h-3 w-32 rounded-md" />
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Tab                                     */
/* -------------------------------------------------------------------------- */

export function GuardiansTab({ studentId }: { studentId: string | number }) {
  const [guardians, setGuardians] = React.useState<Guardian[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Guardian | null>(null);
  const [deleting, setDeleting] = React.useState<Guardian | null>(null);
  const [creatingLoginFor, setCreatingLoginFor] =
    React.useState<Guardian | null>(null);

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

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  function openAdd() {
    setEditing(null);
    setIsFormOpen(true);
  }

  function openEdit(guardian: Guardian) {
    setEditing(guardian);
    setIsFormOpen(true);
  }

  return (
    <>
      <Panel
        title="Guardians"
        description="Parents and carers the school can contact."
        icon={Users}
        action={
          <Button
            size="lg"
            onClick={openAdd}
            className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
          >
            <Plus className="size-4" />
            Add Guardian
          </Button>
        }
      >
        {error ? (
          <SectionError
            message={error}
            onRetry={() => {
              setError(null);
              refresh();
            }}
          />
        ) : guardians === null ? (
          <ul className="divide-y">
            {Array.from({ length: 2 }, (_, index) => (
              <GuardianRowSkeleton key={index} />
            ))}
          </ul>
        ) : guardians.length === 0 ? (
          <SectionEmpty
            icon={Users}
            title="No guardians yet"
            description="Add a parent or carer so the school knows who to contact."
          >
            <Button
              variant="outline"
              size="lg"
              onClick={openAdd}
              className="rounded-xl"
            >
              <Plus className="size-4" />
              Add Guardian
            </Button>
          </SectionEmpty>
        ) : (
          <ul className="divide-y">
            {guardians.map((guardian) => (
              <GuardianRow
                key={guardian.id}
                guardian={guardian}
                onEdit={() => openEdit(guardian)}
                onDelete={() => setDeleting(guardian)}
                onCreateLogin={() => setCreatingLoginFor(guardian)}
              />
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit guardian" : "Add a guardian"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this guardian's details and contact information."
                : "Link a parent or carer to this student's record."}
            </DialogDescription>
          </DialogHeader>
          <GuardianForm
            studentId={studentId}
            guardian={editing}
            onCancel={() => setIsFormOpen(false)}
            onSaved={() => {
              setIsFormOpen(false);
              refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <ParentLoginDialog
        studentId={studentId}
        guardian={creatingLoginFor}
        onOpenChange={(next) => {
          if (!next) setCreatingLoginFor(null);
        }}
        onCreated={() => {
          setCreatingLoginFor(null);
          refresh();
        }}
      />

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        title="Remove this guardian?"
        description={
          <>
            {deleting?.name ?? "This guardian"} will no longer be linked to this
            student. You can add them again at any time.
          </>
        }
        confirmLabel="Remove guardian"
        pendingLabel="Removing"
        errorTitle="Could not remove the guardian"
        onConfirm={async () => {
          if (!deleting) return;
          await deleteGuardian(studentId, deleting.id);
          toast.success("Guardian removed", {
            description: `${deleting.name} is no longer linked to this student.`,
          });
          setDeleting(null);
          refresh();
        }}
      />
    </>
  );
}
