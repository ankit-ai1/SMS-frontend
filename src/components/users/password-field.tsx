"use client";

import * as React from "react";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generatePassword } from "@/components/users/user-meta";
import { fieldProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Password input with show/hide and a one-click strong generator. */
export function PasswordField({
  id,
  value,
  onChange,
  error,
  disabled,
  autoComplete = "new-password",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
}) {
  const [isVisible, setIsVisible] = React.useState(false);

  function handleGenerate() {
    const next = generatePassword();
    onChange(next);
    // Revealed on generate: an unreadable password cannot be handed over.
    setIsVisible(true);
    toast.success("Password generated", {
      description: "Copy it now — it is only shown here.",
    });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          {...fieldProps(id, error)}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          className="h-9 rounded-xl pr-9 font-mono text-xs"
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          disabled={disabled}
          aria-label={isVisible ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none"
        >
          {isVisible ? (
            <EyeOff className="size-3.5" />
          ) : (
            <Eye className="size-3.5" />
          )}
        </button>
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="shrink-0 rounded-xl"
        disabled={disabled}
        onClick={handleGenerate}
      >
        <Sparkles className="size-4" />
        <span className="hidden sm:inline">Generate</span>
      </Button>
    </div>
  );
}
