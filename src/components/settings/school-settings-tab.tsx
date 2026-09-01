"use client";

import * as React from "react";
import { Building2, CircleCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  KNOWN_SETTINGS,
  SETTING_DEFAULTS,
  asText,
  settingsToMap,
} from "@/components/settings/settings-utils";
import { Field, SectionError, fieldProps } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { updateSetting, type SettingEntry } from "@/lib/api";

type Values = Record<string, string>;

function valuesFrom(entries: SettingEntry[]): Values {
  const map = settingsToMap(entries);
  const values: Values = {};

  for (const setting of KNOWN_SETTINGS) {
    const stored = map.get(setting.key);
    values[setting.key] =
      stored === undefined
        ? (SETTING_DEFAULTS[setting.key] ?? "")
        : asText(stored);
  }
  return values;
}

function SchoolForm({
  entries,
  onSaved,
}: {
  entries: SettingEntry[];
  onSaved: () => void;
}) {
  // Remounted on every successful load, so the initialiser doubles as the reset.
  const initial = React.useMemo(() => valuesFrom(entries), [entries]);
  const [values, setValues] = React.useState<Values>(initial);
  const [errors, setErrors] = React.useState<Values>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const changed = KNOWN_SETTINGS.filter(
    (setting) => values[setting.key] !== initial[setting.key]
  );
  const isDirty = changed.length > 0;

  function set(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      current[key] ? { ...current, [key]: "" } : current
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !isDirty) return;

    const email = values.school_email?.trim();
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setErrors({ school_email: "Enter a valid email address." });
      return;
    }

    setIsSubmitting(true);
    try {
      // One PUT per key: the API has no bulk write, and a partial failure is
      // reported as such rather than silently swallowed.
      const results = await Promise.allSettled(
        changed.map((setting) =>
          updateSetting(setting.key, values[setting.key].trim())
        )
      );

      const failed = results.filter((entry) => entry.status === "rejected");
      if (failed.length === 0) {
        toast.success("Settings saved", {
          description: `${changed.length} ${
            changed.length === 1 ? "setting" : "settings"
          } updated.`,
        });
        onSaved();
        return;
      }

      const first = failed[0];
      toast.error(
        failed.length === results.length
          ? "Could not save the settings"
          : `Saved ${results.length - failed.length} of ${results.length}`,
        {
          description:
            first.status === "rejected" && first.reason instanceof Error
              ? first.reason.message
              : "Something went wrong. Please try again.",
        }
      );
      // Some may have landed, so reload either way.
      onSaved();
    } catch (error) {
      toast.error("Could not save the settings", {
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
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        {KNOWN_SETTINGS.map((setting) => (
          <Field
            key={setting.key}
            id={`setting_${setting.key}`}
            label={setting.label}
            hint={setting.hint}
            error={errors[setting.key] || undefined}
          >
            <Input
              {...fieldProps(
                `setting_${setting.key}`,
                errors[setting.key] || undefined
              )}
              value={values[setting.key] ?? ""}
              onChange={(event) => set(setting.key, event.target.value)}
              placeholder={setting.placeholder}
              autoComplete="off"
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/40 p-4">
        <p className="text-xs text-muted-foreground">
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
              <span className="size-1.5 rounded-full bg-current" />
              {changed.length} unsaved{" "}
              {changed.length === 1 ? "change" : "changes"}
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
              "Save Settings"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function SchoolSettingsTab({
  entries,
  isLoaded,
  error,
  savedAt,
  onRetry,
  onSaved,
}: {
  entries: SettingEntry[];
  isLoaded: boolean;
  error: string | null;
  savedAt: number | null;
  onRetry: () => void;
  onSaved: () => void;
}) {
  return (
    <Panel
      title="School details"
      description="Used across receipts, report cards and the app chrome."
      icon={Building2}
      action={
        savedAt !== null ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CircleCheck className="size-3.5" />
            Saved
          </span>
        ) : undefined
      }
    >
      {error ? (
        <SectionError message={error} onRetry={onRetry} />
      ) : !isLoaded ? (
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          {KNOWN_SETTINGS.map((setting) => (
            <div key={setting.key} className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <SchoolForm entries={entries} onSaved={onSaved} />
      )}
    </Panel>
  );
}
