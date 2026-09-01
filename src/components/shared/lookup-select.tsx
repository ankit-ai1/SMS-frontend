"use client";

import * as React from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { fieldProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type LookupOption = { id: string | number; label: string };

/** Radix rejects an empty item value, so "no selection" needs a sentinel. */
const NONE = "__none__";

/**
 * A select over a small reference table (departments, designations…) with an
 * inline "add new" that never leaves the form: the row swaps to a text input,
 * creates the record, and selects it. Newly created options are held locally
 * too, so the choice sticks even before the parent refetches the list.
 */
export function LookupSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  createLabel,
  createPlaceholder,
  onCreate,
  disabled,
  error,
  allowNone = true,
}: {
  id: string;
  /** "" means nothing is selected. */
  value: string;
  onChange: (value: string) => void;
  options: LookupOption[];
  placeholder: string;
  /** Names the add button for screen readers, e.g. "Add a department". */
  createLabel: string;
  createPlaceholder: string;
  onCreate: (name: string) => Promise<{ id: string | number }>;
  disabled?: boolean;
  error?: string;
  allowNone?: boolean;
}) {
  const [isCreating, setIsCreating] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [extra, setExtra] = React.useState<LookupOption[]>([]);

  const all = React.useMemo(() => {
    const seen = new Set(options.map((option) => String(option.id)));
    return [...options, ...extra.filter((option) => !seen.has(String(option.id)))];
  }, [options, extra]);

  function cancelCreate() {
    setIsCreating(false);
    setDraft("");
  }

  async function submitCreate() {
    const name = draft.trim();
    if (!name || isSaving) return;

    setIsSaving(true);
    try {
      const created = await onCreate(name);
      setExtra((current) => [...current, { id: created.id, label: name }]);
      onChange(String(created.id));
      toast.success(`${name} added`);
      cancelCreate();
    } catch (cause) {
      toast.error(createLabel + " failed", {
        description:
          cause instanceof Error
            ? cause.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isCreating) {
    return (
      <div className="flex items-center gap-2">
        <Input
          id={id}
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // The outer form must not submit when this inline field is used.
            if (event.key === "Enter") {
              event.preventDefault();
              void submitCreate();
            } else if (event.key === "Escape") {
              event.preventDefault();
              cancelCreate();
            }
          }}
          placeholder={createPlaceholder}
          autoComplete="off"
          disabled={isSaving}
          className="h-9 flex-1 rounded-xl"
        />
        <Button
          type="button"
          size="icon-lg"
          className="rounded-xl"
          disabled={!draft.trim() || isSaving}
          onClick={() => void submitCreate()}
          aria-label="Save"
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="rounded-xl"
          disabled={isSaving}
          onClick={cancelCreate}
          aria-label="Cancel"
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value || (allowNone ? NONE : "")}
        onValueChange={(next) => onChange(next === NONE ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger
          {...fieldProps(id, error)}
          className="h-9 w-full flex-1 rounded-xl"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowNone && (
            <SelectItem value={NONE}>
              <span className="text-muted-foreground">Not set</span>
            </SelectItem>
          )}
          {all.map((option) => (
            <SelectItem key={option.id} value={String(option.id)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className="shrink-0 rounded-xl"
        disabled={disabled}
        onClick={() => setIsCreating(true)}
        aria-label={createLabel}
        title={createLabel}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
