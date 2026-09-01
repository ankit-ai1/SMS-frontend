"use client";

import * as React from "react";
import { CircleCheck, KeyRound, Loader2, TriangleAlert, UserRound } from "lucide-react";
import { toast } from "sonner";

import { PasswordField } from "@/components/users/password-field";
import { Field, fieldProps } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchCurrentUser,
  getUser,
  setUser as cacheUser,
  updateUser,
  updateUserPassword,
  type AuthUser,
} from "@/lib/api";
import { initialsFrom } from "@/lib/format";

/** The signed-in user's name, however the backend spells the field. */
function nameOf(user: AuthUser | null): string {
  const named = user as (AuthUser & { full_name?: string }) | null;
  return (named?.full_name || named?.name || "").trim();
}

function phoneOf(user: AuthUser | null): string {
  const named = user as (AuthUser & { phone?: string }) | null;
  return (named?.phone ?? "").trim();
}

/* -------------------------------------------------------------------------- */
/*                                   Details                                  */
/* -------------------------------------------------------------------------- */

function DetailsForm({
  user,
  userId,
  onSaved,
}: {
  user: AuthUser;
  userId: string | number;
  onSaved: (patch: { full_name: string; phone: string }) => void;
}) {
  const initial = React.useMemo(
    () => ({ full_name: nameOf(user), phone: phoneOf(user) }),
    [user]
  );
  const [values, setValues] = React.useState(initial);
  const [errors, setErrors] = React.useState<{
    full_name?: string;
    phone?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isDirty =
    values.full_name !== initial.full_name || values.phone !== initial.phone;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !isDirty) return;

    const found: typeof errors = {};
    if (!values.full_name.trim()) found.full_name = "Your name is required.";
    if (values.phone.trim() && values.phone.replace(/\D/g, "").length < 6) {
      found.phone = "Enter a valid phone number.";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    const patch = {
      full_name: values.full_name.trim(),
      phone: values.phone.trim(),
    };

    setIsSubmitting(true);
    try {
      await updateUser(userId, patch);
      toast.success("Profile updated", {
        description: "Your details have been saved.",
      });
      onSaved(patch);
    } catch (error) {
      toast.error("Could not save your profile", {
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-wrap items-center gap-4 border-b bg-muted/25 px-4 py-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-sm font-semibold text-white shadow-brand">
          {initialsFrom(values.full_name, user.email)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {values.full_name || user.email || "Signed in"}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {user.email}
            {user.role ? ` · ${String(user.role).toLowerCase()}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <Field id="profile_name" label="Full Name" error={errors.full_name}>
          <Input
            {...fieldProps("profile_name", errors.full_name)}
            value={values.full_name}
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                full_name: event.target.value,
              }));
              setErrors((current) => ({ ...current, full_name: undefined }));
            }}
            autoComplete="name"
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field id="profile_phone" label="Phone (optional)" error={errors.phone}>
          <Input
            {...fieldProps("profile_phone", errors.phone)}
            type="tel"
            value={values.phone}
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                phone: event.target.value,
              }));
              setErrors((current) => ({ ...current, phone: undefined }));
            }}
            placeholder="+91 98765 43210"
            autoComplete="tel"
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/40 p-4">
        <p className="text-xs text-muted-foreground">
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
              <span className="size-1.5 rounded-full bg-current" />
              Unsaved changes
            </span>
          ) : (
            "No changes yet."
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="rounded-xl"
            disabled={isSubmitting || !isDirty}
            onClick={() => setValues(initial)}
          >
            Discard changes
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || !isDirty}
            className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Password                                  */
/* -------------------------------------------------------------------------- */

function PasswordCard({ userId }: { userId: string | number }) {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [errors, setErrors] = React.useState<{
    password?: string;
    confirm?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found: typeof errors = {};
    if (!password) {
      found.password = "Enter a new password.";
    } else if (password.length < 8) {
      found.password = "Use at least 8 characters.";
    }
    if (password && confirm !== password) {
      found.confirm = "The two passwords do not match.";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUserPassword(userId, password);
      toast.success("Password changed", {
        description: "Use your new password the next time you sign in.",
      });
      setPassword("");
      setConfirm("");
    } catch (error) {
      toast.error("Could not change your password", {
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Panel
      title="Password"
      description="Change the password you sign in with."
      icon={KeyRound}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4 p-4">
          <Field
            id="profile_password"
            label="New Password"
            error={errors.password}
          >
            <PasswordField
              id="profile_password"
              value={password}
              onChange={(value) => {
                setPassword(value);
                setErrors((current) => ({ ...current, password: undefined }));
              }}
              error={errors.password}
              disabled={isSubmitting}
            />
          </Field>

          <Field
            id="profile_password_confirm"
            label="Confirm Password"
            error={errors.confirm}
          >
            <Input
              {...fieldProps("profile_password_confirm", errors.confirm)}
              type="password"
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value);
                setErrors((current) => ({ ...current, confirm: undefined }));
              }}
              autoComplete="new-password"
              disabled={isSubmitting}
              className="h-9 rounded-xl font-mono text-xs"
            />
          </Field>
        </div>

        <div className="flex justify-end border-t bg-muted/40 p-4">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || !password}
            className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Changing…
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Tab                                     */
/* -------------------------------------------------------------------------- */

export function ProfileTab() {
  const [user, setUserState] = React.useState<AuthUser | null>(() => getUser());
  const [isResolved, setIsResolved] = React.useState(
    () => getUser()?.id != null
  );
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [version, setVersion] = React.useState(0);

  // The id is what the profile endpoints need, and login does not always
  // return it — fall back to /auth/me.
  React.useEffect(() => {
    if (isResolved) return;
    let cancelled = false;

    fetchCurrentUser().then((fetched) => {
      if (cancelled) return;
      if (fetched) setUserState(fetched);
      setIsResolved(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isResolved]);

  // The confirmation fades on its own so it never becomes part of the furniture.
  React.useEffect(() => {
    if (savedAt === null) return;
    const timer = setTimeout(() => setSavedAt(null), 5000);
    return () => clearTimeout(timer);
  }, [savedAt]);

  const userId = user?.id;

  if (!isResolved) {
    return (
      <Panel title="Your profile" description="Loading your account…" icon={UserRound}>
        <div className="space-y-4 p-4">
          <Skeleton className="h-12 w-64 max-w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </div>
      </Panel>
    );
  }

  if (!user || userId == null) {
    return (
      <Panel title="Your profile" description="Your account details." icon={UserRound}>
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <TriangleAlert className="size-6" />
          </span>
          <p className="mt-4 text-sm font-medium">
            We couldn&rsquo;t identify your account
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Your sign-in did not return an account id, so these settings cannot
            be edited here. Sign out and back in, or ask an administrator to
            update your details on the Users page.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Your profile"
        description="How your name appears across the app."
        icon={UserRound}
        action={
          savedAt !== null ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CircleCheck className="size-3.5" />
              Saved
            </span>
          ) : undefined
        }
      >
        <DetailsForm
          key={version}
          user={user}
          userId={userId}
          onSaved={(patch) => {
            // Mirror into the cached session so the topbar updates without a
            // reload, and remount the form so "dirty" resets.
            const next: AuthUser = {
              ...user,
              name: patch.full_name,
              full_name: patch.full_name,
              phone: patch.phone,
            };
            cacheUser(next);
            setUserState(next);
            setSavedAt(Date.now());
            setVersion((current) => current + 1);
          }}
        />
      </Panel>

      <PasswordCard userId={userId} />
    </div>
  );
}
