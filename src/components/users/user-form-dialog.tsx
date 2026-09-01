"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  EntityPicker,
  type LinkedEntity,
} from "@/components/users/entity-picker";
import { PasswordField } from "@/components/users/password-field";
import { ROLE_META, linkKindFor } from "@/components/users/user-meta";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  USER_ROLES,
  createUser,
  getManagedUser,
  toUserRole,
  updateUser,
  type ManagedUser,
  type UserPatch,
  type UserRole,
} from "@/lib/api";

type Mode = "create" | "edit";

type Values = {
  full_name: string;
  email: string;
  password: string;
  role: "" | UserRole;
  phone: string;
};

type Errors = Partial<Record<keyof Values, string>>;

function valuesFrom(user: ManagedUser | null): Values {
  return {
    full_name: user?.full_name ?? "",
    email: user?.email ?? "",
    password: "",
    role: toUserRole(user?.role) ?? "",
    phone: user?.phone ?? "",
  };
}

function entityFrom(user: ManagedUser | null): LinkedEntity | null {
  if (!user?.linked_entity_id || !user.linked_entity_type) return null;
  const type = user.linked_entity_type.toLowerCase().includes("staff")
    ? "staff"
    : "student";
  return {
    id: user.linked_entity_id,
    type,
    // The list endpoint carries only the id, so the name fills in on re-pick.
    label: `Linked ${type}`,
    subtitle: `ID ${user.linked_entity_id}`,
  };
}

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

function UserForm({
  mode,
  user,
  onCancel,
  onSaved,
}: {
  mode: Mode;
  user: ManagedUser | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  // Mounted fresh each time the dialog opens, so the initialiser is the reset.
  const initial = React.useMemo(() => valuesFrom(user), [user]);
  const [values, setValues] = React.useState<Values>(initial);
  const [entity, setEntity] = React.useState<LinkedEntity | null>(() =>
    entityFrom(user)
  );
  const [errors, setErrors] = React.useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const linkKind = linkKindFor(values.role);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    // Clear as they type — a stale error under a corrected field reads as a bug.
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current
    );
  }

  function handleRoleChange(role: UserRole) {
    set("role", role);
    // A staff link makes no sense on a student account, and vice versa.
    if (entity && linkKindFor(role) !== entity.type) setEntity(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found: Errors = {};
    if (!values.full_name.trim()) found.full_name = "Full name is required.";
    if (mode === "create") {
      if (!values.email.trim()) {
        found.email = "Email is required.";
      } else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) {
        found.email = "Enter a valid email address.";
      }
      if (!values.password) {
        found.password = "Password is required.";
      } else if (values.password.length < 8) {
        found.password = "Use at least 8 characters.";
      }
    }
    if (!values.role) found.role = "Select a role.";
    if (values.phone.trim() && values.phone.replace(/\D/g, "").length < 6) {
      found.phone = "Enter a valid phone number.";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        await createUser({
          email: values.email.trim(),
          password: values.password,
          role: values.role as UserRole,
          full_name: values.full_name.trim(),
          ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
          ...(entity
            ? {
                linked_entity_id: entity.id,
                linked_entity_type: entity.type,
              }
            : {}),
        });
        toast.success("User added", {
          description: `${values.full_name.trim()} can now sign in.`,
        });
      } else if (user) {
        // Only what the user actually changed — the backend leaves the rest alone.
        const patch: UserPatch = {};
        if (values.full_name.trim() !== initial.full_name) {
          patch.full_name = values.full_name.trim();
        }
        if (values.phone.trim() !== initial.phone) {
          patch.phone = values.phone.trim();
        }
        if (values.role && values.role !== initial.role) {
          patch.role = values.role as UserRole;
        }

        const initialEntity = entityFrom(user);
        const entityChanged =
          String(entity?.id ?? "") !== String(initialEntity?.id ?? "") ||
          (entity?.type ?? "") !== (initialEntity?.type ?? "");
        if (entityChanged) {
          patch.linked_entity_id = entity ? entity.id : null;
          patch.linked_entity_type = entity ? entity.type : null;
        }

        if (Object.keys(patch).length === 0) {
          toast.info("Nothing to save", {
            description: "No changes were made to this user.",
          });
          setIsSubmitting(false);
          onCancel();
          return;
        }

        await updateUser(user.id, patch);
        toast.success("User updated", {
          description: `${values.full_name.trim()}'s account has been saved.`,
        });
      }
      onSaved();
    } catch (error) {
      toast.error(
        mode === "create"
          ? "Could not add the user"
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
        <Field id="user_full_name" label="Full Name" error={errors.full_name}>
          <Input
            {...fieldProps("user_full_name", errors.full_name)}
            value={values.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Meera Iyer"
            autoComplete="off"
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field
          id="user_email"
          label="Email"
          error={errors.email}
          hint={mode === "edit" ? "Sign-in email cannot be changed." : undefined}
        >
          <Input
            {...fieldProps("user_email", errors.email)}
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="meera@school.edu"
            autoComplete="off"
            disabled={isSubmitting || mode === "edit"}
            className="h-9 rounded-xl"
          />
        </Field>

        {mode === "create" && (
          <Field
            id="user_password"
            label="Password"
            error={errors.password}
            hint="Shown once — copy it before saving."
          >
            <PasswordField
              id="user_password"
              value={values.password}
              onChange={(value) => set("password", value)}
              error={errors.password}
              disabled={isSubmitting}
            />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="user_role" label="Role" error={errors.role}>
            <Select
              value={values.role}
              onValueChange={(value) => handleRoleChange(value as UserRole)}
              disabled={isSubmitting}
            >
              <SelectTrigger
                {...fieldProps("user_role", errors.role)}
                className="h-9 w-full rounded-xl"
              >
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_META[role].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="user_phone" label="Phone (optional)" error={errors.phone}>
            <Input
              {...fieldProps("user_phone", errors.phone)}
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

        {linkKind && (
          <Field
            id="user_linked_entity"
            label={
              linkKind === "staff"
                ? "Link to a staff member (optional)"
                : "Link to a student (optional)"
            }
            hint="Connects this login to a person already on file."
          >
            <EntityPicker
              kind={linkKind}
              value={entity}
              onChange={setEntity}
              disabled={isSubmitting}
            />
          </Field>
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
            "Add User"
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
 * Edits always work from a freshly fetched record: the list row carries only a
 * handful of columns, and blanking the rest would be a silent data loss.
 */
function EditLoader({
  userId,
  onCancel,
  onSaved,
}: {
  userId: string | number;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [user, setUser] = React.useState<ManagedUser | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    getManagedUser(userId)
      .then((loaded) => {
        if (!cancelled) setUser(loaded);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading this user."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

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

  if (!user) return <FormSkeleton />;

  return (
    <UserForm mode="edit" user={user} onCancel={onCancel} onSaved={onSaved} />
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Dialog                                   */
/* -------------------------------------------------------------------------- */

export function UserFormDialog({
  mode,
  userId,
  open,
  onOpenChange,
  onSaved,
}: {
  mode: Mode;
  /** Required in edit mode. */
  userId?: string | number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add a user" : "Edit user"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a sign-in for someone at your school."
              : "Update this account. Only the fields you change are sent."}
          </DialogDescription>
        </DialogHeader>

        {mode === "create" ? (
          <UserForm
            mode="create"
            user={null}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false);
              onSaved();
            }}
          />
        ) : userId != null ? (
          <EditLoader
            userId={userId}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false);
              onSaved();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
