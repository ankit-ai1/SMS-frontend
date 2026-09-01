"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { EVENT_TYPE_META, toTimeInputValue } from "@/components/calendar/calendar-meta";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CALENDAR_EVENT_TYPES,
  createCalendarEvent,
  toCalendarEventType,
  updateCalendarEvent,
  type CalendarEvent,
  type CalendarEventType,
} from "@/lib/api";

type Values = {
  title: string;
  description: string;
  event_type: "" | CalendarEventType;
  start_date: string;
  end_date: string;
  is_all_day: boolean;
  start_time: string;
  end_time: string;
  location: string;
};

type Errors = Partial<Record<keyof Values, string>>;

function valuesFrom(event: CalendarEvent | null, defaultDate: string): Values {
  return {
    title: event?.title ?? "",
    description: event?.description ?? "",
    event_type: toCalendarEventType(event?.event_type) ?? "",
    start_date: event?.start_date?.slice(0, 10) ?? defaultDate,
    end_date: (event?.end_date || event?.start_date)?.slice(0, 10) ?? defaultDate,
    is_all_day: event?.is_all_day ?? true,
    start_time: toTimeInputValue(event?.start_time),
    end_time: toTimeInputValue(event?.end_time),
    location: event?.location ?? "",
  };
}

function EventForm({
  academicYearId,
  event,
  defaultDate,
  onCancel,
  onSaved,
}: {
  academicYearId: string | number;
  /** Null in create mode. */
  event: CalendarEvent | null;
  defaultDate: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  // Mounted fresh each time the dialog opens, so the initialiser is the reset.
  const [values, setValues] = React.useState<Values>(() =>
    valuesFrom(event, defaultDate)
  );
  const [errors, setErrors] = React.useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current
    );
  }

  async function handleSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (isSubmitting) return;

    const found: Errors = {};
    if (!values.title.trim()) found.title = "Title is required.";
    if (!values.event_type) found.event_type = "Select an event type.";
    if (!values.start_date) found.start_date = "Start date is required.";
    if (!values.end_date) {
      found.end_date = "End date is required.";
    } else if (values.start_date && values.end_date < values.start_date) {
      // ISO dates compare correctly as strings.
      found.end_date = "The end date cannot be before the start date.";
    }
    if (!values.is_all_day) {
      if (!values.start_time) found.start_time = "Start time is required.";
      if (!values.end_time) {
        found.end_time = "End time is required.";
      } else if (
        values.start_time &&
        values.start_date === values.end_date &&
        values.end_time <= values.start_time
      ) {
        found.end_time = "The end time must be after the start time.";
      }
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    const payload = {
      title: values.title.trim(),
      event_type: values.event_type as CalendarEventType,
      start_date: values.start_date,
      end_date: values.end_date,
      is_all_day: values.is_all_day,
      ...(values.description.trim()
        ? { description: values.description.trim() }
        : {}),
      ...(values.location.trim() ? { location: values.location.trim() } : {}),
      ...(!values.is_all_day
        ? { start_time: values.start_time, end_time: values.end_time }
        : {}),
    };

    setIsSubmitting(true);
    try {
      if (event) {
        await updateCalendarEvent(event.id, payload);
        toast.success("Event updated", {
          description: `${payload.title} has been saved.`,
        });
      } else {
        await createCalendarEvent({
          academic_year_id: academicYearId,
          ...payload,
        });
        toast.success("Event added", {
          description: `${payload.title} is now on the calendar.`,
        });
      }
      onSaved();
    } catch (error) {
      toast.error(
        event ? "Could not save the event" : "Could not add the event",
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
        <Field id="event_title" label="Title" error={errors.title}>
          <Input
            {...fieldProps("event_title", errors.title)}
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Annual Day Rehearsal"
            autoComplete="off"
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field id="event_type" label="Event Type" error={errors.event_type}>
          <Select
            value={values.event_type}
            onValueChange={(value) =>
              set("event_type", value as CalendarEventType)
            }
            disabled={isSubmitting}
          >
            <SelectTrigger
              {...fieldProps("event_type", errors.event_type)}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {CALENDAR_EVENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`size-2 rounded-full ${EVENT_TYPE_META[type].dot}`}
                    />
                    {EVENT_TYPE_META[type].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="event_start_date" label="Start Date" error={errors.start_date}>
            <Input
              {...fieldProps("event_start_date", errors.start_date)}
              type="date"
              value={values.start_date}
              onChange={(e) => {
                set("start_date", e.target.value);
                // A single-day event is the common case: keep the end in step
                // until the user deliberately moves it.
                if (values.end_date < e.target.value) {
                  set("end_date", e.target.value);
                }
              }}
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>

          <Field id="event_end_date" label="End Date" error={errors.end_date}>
            <Input
              {...fieldProps("event_end_date", errors.end_date)}
              type="date"
              min={values.start_date || undefined}
              value={values.end_date}
              onChange={(e) => set("end_date", e.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-xl"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/25 p-3.5">
          <div>
            <Label htmlFor="event_all_day" className="text-sm font-medium">
              All day
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Off: set the hours this event runs for.
            </p>
          </div>
          <Switch
            id="event_all_day"
            checked={values.is_all_day}
            onCheckedChange={(checked) => set("is_all_day", checked)}
            disabled={isSubmitting}
          />
        </div>

        {!values.is_all_day && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="event_start_time"
              label="Start Time"
              error={errors.start_time}
            >
              <Input
                {...fieldProps("event_start_time", errors.start_time)}
                type="time"
                value={values.start_time}
                onChange={(e) => set("start_time", e.target.value)}
                disabled={isSubmitting}
                className="h-9 rounded-xl"
              />
            </Field>

            <Field id="event_end_time" label="End Time" error={errors.end_time}>
              <Input
                {...fieldProps("event_end_time", errors.end_time)}
                type="time"
                value={values.end_time}
                onChange={(e) => set("end_time", e.target.value)}
                disabled={isSubmitting}
                className="h-9 rounded-xl"
              />
            </Field>
          </div>
        )}

        <Field id="event_location" label="Location (optional)">
          <Input
            {...fieldProps("event_location")}
            value={values.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="School auditorium"
            autoComplete="off"
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field id="event_description" label="Description (optional)">
          <Textarea
            id="event_description"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Anything staff or parents should know."
            disabled={isSubmitting}
            className="min-h-20 rounded-xl"
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
          ) : event ? (
            "Save Changes"
          ) : (
            "Add Event"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EventDialog({
  open,
  onOpenChange,
  academicYearId,
  event,
  defaultDate,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYearId: string | number;
  /** Null to create. */
  event: CalendarEvent | null;
  defaultDate: string;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "Add an event"}</DialogTitle>
          <DialogDescription>
            {event
              ? "Update what this event covers and when it runs."
              : "Put something on the school calendar."}
          </DialogDescription>
        </DialogHeader>

        {/* Mounted only while open, so the initialiser doubles as the reset. */}
        {open && (
          <EventForm
            academicYearId={academicYearId}
            event={event}
            defaultDate={defaultDate}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false);
              onSaved();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
