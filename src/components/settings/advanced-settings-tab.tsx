"use client";

import * as React from "react";
import { Braces, Loader2, Pencil, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  KNOWN_KEYS,
  asJsonText,
  parseJsonText,
  previewOf,
  validateKey,
} from "@/components/settings/settings-utils";
import { Field, SectionEmpty, SectionError, fieldProps } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { updateSetting, type SettingEntry } from "@/lib/api";
import { formatDate } from "@/lib/format";

type EditTarget = { key: string; value: unknown; isNew: boolean };

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

function SettingForm({
  target,
  existingKeys,
  onCancel,
  onSaved,
}: {
  target: EditTarget;
  existingKeys: string[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [key, setKey] = React.useState(target.key);
  const [text, setText] = React.useState(() => asJsonText(target.value));
  const [errors, setErrors] = React.useState<{ key?: string; value?: string }>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found: typeof errors = {};
    const keyError = validateKey(key);
    if (keyError) {
      found.key = keyError;
    } else if (
      target.isNew &&
      existingKeys.some((entry) => entry === key.trim())
    ) {
      found.key = "That key already exists — edit it instead.";
    }

    const parsed = parseJsonText(text);
    if (!parsed.ok) found.value = parsed.error;

    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSetting(key.trim(), parsed.ok ? parsed.value : null);
      toast.success(target.isNew ? "Setting added" : "Setting saved", {
        description: key.trim(),
      });
      onSaved();
    } catch (error) {
      toast.error("Could not save the setting", {
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
        <Field
          id="setting_key"
          label="Key"
          error={errors.key}
          hint={target.isNew ? undefined : "Keys cannot be renamed."}
        >
          <Input
            {...fieldProps("setting_key", errors.key)}
            value={key}
            onChange={(event) => {
              setKey(event.target.value);
              setErrors((current) => ({ ...current, key: undefined }));
            }}
            placeholder="late_fee_per_day"
            autoComplete="off"
            disabled={isSubmitting || !target.isNew}
            className="h-9 rounded-xl font-mono text-xs"
          />
        </Field>

        <Field
          id="setting_value"
          label="Value (JSON)"
          error={errors.value}
          hint={'Strings need quotes: "Sunrise" — not Sunrise.'}
        >
          <Textarea
            id="setting_value"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setErrors((current) => ({ ...current, value: undefined }));
            }}
            spellCheck={false}
            aria-invalid={Boolean(errors.value)}
            disabled={isSubmitting}
            className="min-h-40 rounded-xl font-mono text-xs"
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
              Saving
            </>
          ) : target.isNew ? (
            "Add Setting"
          ) : (
            "Save Setting"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Tab                                     */
/* -------------------------------------------------------------------------- */

export function AdvancedSettingsTab({
  entries,
  isLoaded,
  error,
  onRetry,
  onSaved,
}: {
  entries: SettingEntry[];
  isLoaded: boolean;
  error: string | null;
  onRetry: () => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = React.useState<EditTarget | null>(null);

  const sorted = React.useMemo(
    () => [...entries].sort((a, b) => a.key.localeCompare(b.key)),
    [entries]
  );

  return (
    <>
      <Panel
        title="All settings"
        description="Every key stored for this school, edited as raw JSON."
        icon={SlidersHorizontal}
        action={
          <Button
            size="lg"
            onClick={() => setEditing({ key: "", value: "", isNew: true })}
            className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
          >
            <Plus className="size-4" />
            Add Setting
          </Button>
        }
      >
        {error ? (
          <SectionError message={error} onRetry={onRetry} />
        ) : !isLoaded ? (
          <ul className="divide-y">
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="size-9 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 max-w-full rounded-md" />
                  <Skeleton className="h-3 w-64 max-w-full rounded-md" />
                </div>
              </li>
            ))}
          </ul>
        ) : sorted.length === 0 ? (
          <SectionEmpty
            icon={Braces}
            title="No settings stored yet"
            description="Saving anything on the School tab creates its key here, or add one directly."
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => setEditing({ key: "", value: "", isNew: true })}
              className="rounded-xl"
            >
              <Plus className="size-4" />
              Add Setting
            </Button>
          </SectionEmpty>
        ) : (
          <ul className="divide-y">
            {sorted.map((entry) => (
              <li
                key={entry.key}
                className="group/row flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <Braces className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-mono text-sm font-medium">
                      {entry.key}
                    </p>
                    {KNOWN_KEYS.includes(entry.key) && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
                        On School tab
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    {previewOf(entry.value)}
                  </p>
                </div>

                {entry.updated_at && (
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatDate(entry.updated_at)}
                  </span>
                )}

                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 rounded-lg text-muted-foreground opacity-100 transition-opacity hover:text-foreground sm:opacity-0 sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100"
                  aria-label={`Edit ${entry.key}`}
                  onClick={() =>
                    setEditing({
                      key: entry.key,
                      value: entry.value,
                      isNew: false,
                    })
                  }
                >
                  <Pencil className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog
        open={editing != null}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.isNew ? "Add a setting" : "Edit setting"}
            </DialogTitle>
            <DialogDescription>
              Values are stored as JSON, so quotes matter.
            </DialogDescription>
          </DialogHeader>

          {/* Mounted only while open, so the initialisers double as the reset. */}
          {editing && (
            <SettingForm
              target={editing}
              existingKeys={entries.map((entry) => entry.key)}
              onCancel={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                onSaved();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
