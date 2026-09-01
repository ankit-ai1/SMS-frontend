"use client";

import * as React from "react";
import { CircleCheck, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

import {
  DAY_CODES,
  DAY_LABELS,
  normaliseDay,
  toTimeInputValue,
} from "@/components/calendar/calendar-meta";
import { Field, SectionError, fieldProps } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCalendarConfig,
  updateCalendarConfig,
  type AcademicYear,
  type CalendarConfig,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type Values = {
  workingDays: string[];
  school_start_time: string;
  school_end_time: string;
  half_day_end_time: string;
  total_working_days: string;
};

/** `working_days` may be a list or a delimited string — read both. */
function parseWorkingDays(value: CalendarConfig["working_days"]): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,\s]+/)
      : [];

  const seen = new Set<string>();
  for (const entry of raw) {
    const code = normaliseDay(String(entry));
    if (code) seen.add(code);
  }
  return DAY_CODES.filter((code) => seen.has(code));
}

function valuesFrom(config: CalendarConfig | null): Values {
  return {
    workingDays: parseWorkingDays(config?.working_days),
    school_start_time: toTimeInputValue(config?.school_start_time),
    school_end_time: toTimeInputValue(config?.school_end_time),
    half_day_end_time: toTimeInputValue(config?.half_day_end_time),
    total_working_days:
      config?.total_working_days != null ? String(config.total_working_days) : "",
  };
}

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

function ConfigForm({
  yearId,
  config,
  onSaved,
}: {
  yearId: string | number;
  config: CalendarConfig | null;
  onSaved: (saved: CalendarConfig) => void;
}) {
  // Remounted on every successful load, so the initialiser doubles as the reset.
  const initial = React.useMemo(() => valuesFrom(config), [config]);
  const [values, setValues] = React.useState<Values>(initial);
  const [errors, setErrors] = React.useState<Partial<Record<string, string>>>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isDirty =
    values.school_start_time !== initial.school_start_time ||
    values.school_end_time !== initial.school_end_time ||
    values.half_day_end_time !== initial.half_day_end_time ||
    values.total_working_days !== initial.total_working_days ||
    values.workingDays.join(",") !== initial.workingDays.join(",");

  function toggleDay(code: string) {
    setValues((current) => ({
      ...current,
      workingDays: current.workingDays.includes(code)
        ? current.workingDays.filter((entry) => entry !== code)
        : DAY_CODES.filter(
            (entry) => entry === code || current.workingDays.includes(entry)
          ),
    }));
  }

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !isDirty) return;

    const found: Partial<Record<string, string>> = {};
    if (
      values.school_start_time &&
      values.school_end_time &&
      values.school_end_time <= values.school_start_time
    ) {
      found.school_end_time = "The school day must end after it starts.";
    }
    if (
      values.school_start_time &&
      values.half_day_end_time &&
      values.half_day_end_time <= values.school_start_time
    ) {
      found.half_day_end_time = "A half day must end after school starts.";
    }
    const total = Number(values.total_working_days);
    if (values.total_working_days.trim()) {
      if (!Number.isFinite(total) || total < 0 || total > 366) {
        found.total_working_days = "Enter a number between 0 and 366.";
      }
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    // Written back in the shape it arrived, since the backend's own format for
    // this field is not documented.
    const workingDays =
      typeof config?.working_days === "string"
        ? values.workingDays.join(",")
        : values.workingDays;

    const payload: CalendarConfig = {
      working_days: workingDays,
      school_start_time: values.school_start_time || null,
      school_end_time: values.school_end_time || null,
      half_day_end_time: values.half_day_end_time || null,
      total_working_days: values.total_working_days.trim() ? total : null,
    };

    setIsSubmitting(true);
    try {
      await updateCalendarConfig(yearId, payload);
      toast.success("Calendar settings saved", {
        description: `${values.workingDays.length} working ${
          values.workingDays.length === 1 ? "day" : "days"
        } a week.`,
      });
      onSaved(payload);
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
      <div className="space-y-5 p-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            Working days
          </Label>
          <div
            role="group"
            aria-label="Working days"
            className="flex flex-wrap gap-2"
          >
            {DAY_CODES.map((code) => {
              const isOn = values.workingDays.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={isOn}
                  disabled={isSubmitting}
                  onClick={() => toggleDay(code)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-medium transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
                    isOn
                      ? "border-transparent bg-brand-600 text-white shadow-sm"
                      : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {DAY_LABELS[code].slice(0, 3)}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {values.workingDays.length === 0
              ? "No working days selected."
              : values.workingDays
                  .map((code) => DAY_LABELS[code])
                  .join(", ")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field id="school_start_time" label="School starts">
            <Input
              {...fieldProps("school_start_time")}
              type="time"
              value={values.school_start_time}
              onChange={(e) => set("school_start_time", e.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>

          <Field
            id="school_end_time"
            label="School ends"
            error={errors.school_end_time}
          >
            <Input
              {...fieldProps("school_end_time", errors.school_end_time)}
              type="time"
              value={values.school_end_time}
              onChange={(e) => set("school_end_time", e.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>

          <Field
            id="half_day_end_time"
            label="Half day ends"
            error={errors.half_day_end_time}
          >
            <Input
              {...fieldProps("half_day_end_time", errors.half_day_end_time)}
              type="time"
              value={values.half_day_end_time}
              onChange={(e) => set("half_day_end_time", e.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>

          <Field
            id="total_working_days"
            label="Total working days"
            error={errors.total_working_days}
          >
            <Input
              {...fieldProps("total_working_days", errors.total_working_days)}
              type="number"
              min={0}
              max={366}
              step="1"
              inputMode="numeric"
              value={values.total_working_days}
              onChange={(e) => set("total_working_days", e.target.value)}
              placeholder="220"
              disabled={isSubmitting}
              className="h-9 rounded-xl tabular-nums"
            />
          </Field>
        </div>
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
              "Save Settings"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Tab                                     */
/* -------------------------------------------------------------------------- */

export function SettingsTab({ year }: { year: AcademicYear }) {
  const [config, setConfig] = React.useState<CalendarConfig | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    getCalendarConfig(year.id)
      .then((loaded) => {
        if (cancelled) return;
        // `data` is null until settings are saved — an empty form, not an error.
        setConfig(loaded ?? null);
        setIsLoaded(true);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading calendar settings."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [year.id, reloadKey]);

  // The confirmation fades on its own so it never becomes part of the furniture.
  React.useEffect(() => {
    if (savedAt === null) return;
    const timer = setTimeout(() => setSavedAt(null), 5000);
    return () => clearTimeout(timer);
  }, [savedAt]);

  return (
    <Panel
      title="Calendar settings"
      description="Working days and school hours for this academic year."
      icon={Settings2}
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
        <SectionError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      ) : !isLoaded ? (
        <div className="space-y-5 p-4">
          <Skeleton className="h-9 w-72 max-w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-1.5">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ConfigForm
          key={reloadKey}
          yearId={year.id}
          config={config}
          onSaved={(saved) => {
            // Show the saved values straight away, then quietly re-read the
            // server's copy — `isLoaded` stays true, so no skeleton flashes.
            setConfig(saved);
            setSavedAt(Date.now());
            setReloadKey((key) => key + 1);
          }}
        />
      )}
    </Panel>
  );
}
