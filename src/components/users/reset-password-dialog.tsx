"use client";

import * as React from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PasswordField } from "@/components/users/password-field";
import { Field } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateUserPassword } from "@/lib/api";

export type ResetTarget = {
  id: string | number;
  name: string;
};

function ResetForm({
  target,
  onCancel,
  onDone,
}: {
  target: ResetTarget;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!password) {
      setError("Enter a new password.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUserPassword(target.id, password);
      toast.success("Password reset", {
        description: `${target.name} will need the new password to sign in.`,
      });
      onDone();
    } catch (cause) {
      toast.error("Could not reset the password", {
        description:
          cause instanceof Error
            ? cause.message
            : "Something went wrong. Please try again.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field
        id="reset_password"
        label="New Password"
        error={error}
        hint="Shown once — copy it before saving."
      >
        <PasswordField
          id="reset_password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setError(undefined);
          }}
          error={error}
          disabled={isSubmitting}
        />
      </Field>

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
              Resetting
            </>
          ) : (
            <>
              <KeyRound className="size-4" />
              Reset Password
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ResetPasswordDialog({
  target,
  onOpenChange,
}: {
  /** Null when closed. */
  target: ResetTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={target != null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            {target
              ? `Set a new sign-in password for ${target.name}.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {/* Mounted only while open, so the initialisers double as the reset. */}
        {target && (
          <ResetForm
            target={target}
            onCancel={() => onOpenChange(false)}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
