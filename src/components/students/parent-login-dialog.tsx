"use client";

import * as React from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PasswordField } from "@/components/users/password-field";
import { Field, fieldProps } from "@/components/shared/form-field";
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
  createGuardianLogin,
  isConflictError,
  type Guardian,
} from "@/lib/api";

type Errors = { email?: string; password?: string };

/**
 * Creates the parent login for one guardian. The password is shown once, here,
 * and never again — the copy says so, and the generator reveals what it makes.
 */
export function ParentLoginDialog({
  studentId,
  guardian,
  onOpenChange,
  onCreated,
}: {
  studentId: string | number;
  /** Null when closed. Also the create-mode subject when open. */
  guardian: Guardian | null;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  return (
    <Dialog open={guardian !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create parent login</DialogTitle>
          <DialogDescription>
            {guardian
              ? `${guardian.name} will be able to sign in and follow this student's record.`
              : "Give this guardian access to the parent portal."}
          </DialogDescription>
        </DialogHeader>

        {/* Remounted with the dialog, so the initialisers double as the reset. */}
        {guardian && (
          <ParentLoginForm
            studentId={studentId}
            guardian={guardian}
            onCancel={() => onOpenChange(false)}
            onCreated={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ParentLoginForm({
  studentId,
  guardian,
  onCancel,
  onCreated,
}: {
  studentId: string | number;
  guardian: Guardian;
  onCancel: () => void;
  onCreated: () => void;
}) {
  // The guardian's own address is the obvious default, and usually the right one.
  const [email, setEmail] = React.useState(guardian.email?.trim() ?? "");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function validate(): Errors {
    const found: Errors = {};

    if (!email.trim()) {
      found.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      found.email = "Enter a valid email address.";
    }

    if (!password) {
      found.password = "Password is required.";
    } else if (password.length < 8) {
      found.password = "Use at least 8 characters.";
    }

    return found;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      await createGuardianLogin(studentId, guardian.id, {
        email: email.trim(),
        password,
      });
      toast.success("Parent login created", {
        description: `${guardian.name} can sign in with ${email.trim()}.`,
      });
      onCreated();
    } catch (error) {
      // A taken address is the one failure worth correcting in place, so the
      // dialog stays open with the field flagged rather than just toasting.
      if (isConflictError(error)) {
        setErrors({ email: "This email already has an account." });
        toast.error("This email already has an account", {
          description: "Pick a different address for this parent login.",
        });
      } else {
        toast.error("Could not create the parent login", {
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
        });
      }
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="space-y-4">
        <Field id="parent_login_email" label="Email" error={errors.email}>
          <Input
            {...fieldProps("parent_login_email", errors.email)}
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({ ...current, email: undefined }));
            }}
            placeholder="priya@example.com"
            autoComplete="off"
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field
          id="parent_login_password"
          label="Password"
          error={errors.password}
          hint="Shown only here — copy it before you close this dialog."
        >
          <PasswordField
            id="parent_login_password"
            value={password}
            onChange={(next) => {
              setPassword(next);
              setErrors((current) => ({ ...current, password: undefined }));
            }}
            error={errors.password}
            disabled={isSubmitting}
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
              Creating
            </>
          ) : (
            <>
              <KeyRound className="size-4" />
              Create Login
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
