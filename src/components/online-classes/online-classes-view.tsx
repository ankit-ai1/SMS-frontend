"use client";

import * as React from "react";
import {
  CalendarClock,
  ExternalLink,
  Laptop,
  Loader2,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Field, SectionEmpty, SectionError, fieldProps } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { sectionLabel } from "@/components/shared/section-picker";
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
  canScheduleOnlineClass,
  canSeeFullOnlineSchedule,
  createOnlineClass,
  deleteOnlineClass,
  getCurrentAcademicYear,
  getUser,
  listMyOnlineClasses,
  listOnlineClasses,
  listSections,
  listSubjects,
  toUserRole,
  type OnlineClass,
  type Section,
  type Subject,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const ALL_SECTIONS = "all";

/** `<input type="datetime-local">` wants local wall-clock, not an ISO string. */
function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function timeOf(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Live from five minutes before it starts until it ends. */
function isLiveNow(entry: OnlineClass): boolean {
  const start = new Date(entry.scheduled_at).getTime();
  if (Number.isNaN(start)) return false;
  const end = start + (entry.duration_minutes ?? 45) * 60_000;
  const now = Date.now();
  return now >= start - 5 * 60_000 && now <= end;
}

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

type FormErrors = Partial<Record<"title" | "section" | "subject" | "url", string>>;

function ClassForm({
  sections,
  subjects,
  onCancel,
  onSaved,
}: {
  sections: Section[];
  subjects: Subject[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [sectionId, setSectionId] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [scheduledAt, setScheduledAt] = React.useState(() =>
    toLocalInput(new Date(Date.now() + 60 * 60_000))
  );
  const [duration, setDuration] = React.useState("45");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found: FormErrors = {};
    if (!title.trim()) found.title = "Give the class a title.";
    if (!sectionId) found.section = "Pick the section.";
    if (!subjectId) found.subject = "Pick the subject.";
    if (!url.trim()) {
      found.url = "Paste the meeting link.";
    } else if (!/^https?:\/\//i.test(url.trim())) {
      found.url = "The link should start with https://";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      await createOnlineClass({
        section_id: sectionId,
        subject_id: subjectId,
        title: title.trim(),
        meeting_url: url.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: duration ? Number(duration) : undefined,
      });
      toast.success("Class scheduled", {
        description: `${title.trim()} — the section can see it now.`,
      });
      onSaved();
    } catch (cause) {
      toast.error("Could not schedule the class", {
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
      <Field id="class_title" label="Title" error={errors.title}>
        <Input
          {...fieldProps("class_title", errors.title)}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setErrors((current) => ({ ...current, title: undefined }));
          }}
          placeholder="Quadratic equations — revision"
          disabled={isSubmitting}
          className="h-9 rounded-xl"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="class_section" label="Section" error={errors.section}>
          <Select
            value={sectionId}
            onValueChange={(value) => {
              setSectionId(value);
              setErrors((current) => ({ ...current, section: undefined }));
            }}
            disabled={isSubmitting || sections.length === 0}
          >
            <SelectTrigger
              {...fieldProps("class_section", errors.section)}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue
                placeholder={
                  sections.length === 0 ? "No sections set up" : "Select a section"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {sections.map((section) => (
                <SelectItem key={section.id} value={String(section.id)}>
                  {sectionLabel(section)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="class_subject" label="Subject" error={errors.subject}>
          <Select
            value={subjectId}
            onValueChange={(value) => {
              setSubjectId(value);
              setErrors((current) => ({ ...current, subject: undefined }));
            }}
            disabled={isSubmitting || subjects.length === 0}
          >
            <SelectTrigger
              {...fieldProps("class_subject", errors.subject)}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue
                placeholder={
                  subjects.length === 0 ? "No subjects set up" : "Select a subject"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={String(subject.id)}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        id="class_url"
        label="Meeting link"
        error={errors.url}
        hint={errors.url ? undefined : "Paste the Zoom, Meet or Teams link."}
      >
        <Input
          {...fieldProps("class_url", errors.url)}
          type="url"
          inputMode="url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setErrors((current) => ({ ...current, url: undefined }));
          }}
          placeholder="https://meet.google.com/abc-defg-hij"
          disabled={isSubmitting}
          className="h-9 rounded-xl"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="class_when" label="Starts at">
          <Input
            id="class_when"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field id="class_duration" label="Minutes">
          <Input
            id="class_duration"
            type="number"
            min={5}
            step={5}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            disabled={isSubmitting}
            className="h-9 rounded-xl"
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
              Scheduling
            </>
          ) : (
            <>
              <Plus className="size-4" />
              Schedule class
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Rows                                    */
/* -------------------------------------------------------------------------- */

function ClassRow({
  entry,
  canManage,
  onDelete,
}: {
  entry: OnlineClass;
  canManage: boolean;
  onDelete: () => void;
}) {
  const live = isLiveNow(entry);
  const placement =
    [entry.class_name?.trim(), entry.section_name?.trim()]
      .filter(Boolean)
      .join(" — ") || "";

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40",
        live && "bg-brand-50/50"
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-2xl ring-1",
          live
            ? "bg-brand-600 text-white ring-brand-600"
            : "bg-brand-50 text-brand-600 ring-brand-100"
        )}
      >
        <Video className="size-4.5" />
      </span>

      <div className="min-w-0 flex-1 basis-56">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{entry.title}</p>
          {live && (
            <span className="flex items-center gap-1.5 rounded-full bg-destructive px-2 py-0.5 text-[0.625rem] font-bold text-white">
              <span
                aria-hidden
                className="size-1.5 animate-pulse rounded-full bg-white"
              />
              Live
            </span>
          )}
        </div>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[
            entry.subject_name?.trim(),
            entry.teacher_name?.trim(),
            placement,
          ]
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>

        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {formatDate(entry.scheduled_at)} · {timeOf(entry.scheduled_at)}
          {entry.duration_minutes ? ` · ${entry.duration_minutes} min` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          asChild
          className={cn(
            "rounded-lg",
            live && "shadow-brand transition-all hover:bg-brand-700"
          )}
          variant={live ? "default" : "outline"}
        >
          <a href={entry.meeting_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5" />
            {live ? "Join now" : "Open link"}
          </a>
        </Button>

        {canManage && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            aria-label={`Cancel ${entry.title}`}
            className="rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function OnlineClassesView() {
  const [classes, setClasses] = React.useState<OnlineClass[] | null>(null);
  const [sections, setSections] = React.useState<Section[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [sectionFilter, setSectionFilter] = React.useState(ALL_SECTIONS);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<OnlineClass | null>(null);

  // localStorage only exists on the client, so gate on a mount signal that is
  // identical between the prerendered markup and the first client render.
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const role = isClient ? toUserRole(getUser()?.role) : null;
  const maySchedule = canScheduleOnlineClass(role);
  const seesEverything = canSeeFullOnlineSchedule(role);

  React.useEffect(() => {
    if (!isClient) return;
    let cancelled = false;

    // Parents and students are refused the full list by design — theirs is
    // `mine`, which is already narrowed to the sections they belong to.
    const request = seesEverything
      ? listOnlineClasses({
          section_id: sectionFilter === ALL_SECTIONS ? null : sectionFilter,
        })
      : listMyOnlineClasses();

    request
      .then((loaded) => {
        if (cancelled) return;
        setClasses(
          [...loaded].sort((a, b) =>
            a.scheduled_at.localeCompare(b.scheduled_at)
          )
        );
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading classes."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [isClient, seesEverything, sectionFilter, reloadKey]);

  // Only the composer and the filter need these, so a failure costs a dropdown.
  React.useEffect(() => {
    if (!seesEverything) return;
    let cancelled = false;

    async function load() {
      const year = await getCurrentAcademicYear();
      const [loadedSections, loadedSubjects] = await Promise.all([
        year ? listSections(year.id) : Promise.resolve([] as Section[]),
        listSubjects().catch(() => [] as Subject[]),
      ]);
      if (cancelled) return;
      setSections(loadedSections);
      setSubjects(loadedSubjects);
    }

    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [seesEverything]);

  const liveCount = (classes ?? []).filter(isLiveNow).length;

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Online Classes
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {seesEverything
              ? "Scheduled sessions and their meeting links."
              : "Your upcoming sessions — join straight from here."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {liveCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive ring-1 ring-destructive/20">
              <span
                aria-hidden
                className="size-1.5 animate-pulse rounded-full bg-destructive"
              />
              {liveCount} live now
            </span>
          )}

          {maySchedule && (
            <Button
              size="lg"
              onClick={() => setIsFormOpen(true)}
              className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
            >
              <Plus className="size-4" />
              Schedule Class
            </Button>
          )}
        </div>
      </div>

      <Panel
        title="Schedule"
        description="Soonest first. A class drops off the list an hour after it ends."
        icon={CalendarClock}
      >
        {seesEverything && (
          <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-end">
            <Field id="class_filter" label="Section">
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger
                  id="class_filter"
                  className="h-9 w-full rounded-xl sm:w-64"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SECTIONS}>All sections</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={String(section.id)}>
                      {sectionLabel(section)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}

        {error ? (
          <SectionError
            message={error}
            onRetry={() => {
              setError(null);
              setReloadKey((key) => key + 1);
            }}
          />
        ) : classes === null ? (
          <ul className="divide-y">
            {Array.from({ length: 3 }, (_, index) => (
              <li key={index} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="size-10 shrink-0 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 max-w-[55%] rounded-md" />
                  <Skeleton className="h-3 w-64 max-w-[75%] rounded-md" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : classes.length === 0 ? (
          <SectionEmpty
            icon={Laptop}
            title="Nothing scheduled"
            description={
              maySchedule
                ? "Schedule a session and the section sees it straight away."
                : "Online classes your teachers schedule will appear here."
            }
          >
            {maySchedule && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsFormOpen(true)}
                className="rounded-xl"
              >
                <Plus className="size-4" />
                Schedule Class
              </Button>
            )}
          </SectionEmpty>
        ) : (
          <ul className="divide-y">
            {classes.map((entry) => (
              <ClassRow
                key={entry.id}
                entry={entry}
                canManage={maySchedule}
                onDelete={() => setDeleting(entry)}
              />
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule an online class</DialogTitle>
            <DialogDescription>
              The section&rsquo;s students and their parents see it immediately.
            </DialogDescription>
          </DialogHeader>
          <ClassForm
            sections={sections}
            subjects={subjects}
            onCancel={() => setIsFormOpen(false)}
            onSaved={() => {
              setIsFormOpen(false);
              setReloadKey((key) => key + 1);
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Cancel this class?"
        description={
          <>
            {deleting ? `“${deleting.title}”` : "This class"} will be removed
            from the section&rsquo;s schedule. Anyone holding the link will no
            longer see it here.
          </>
        }
        confirmLabel="Cancel class"
        pendingLabel="Cancelling"
        errorTitle="Could not cancel the class"
        onConfirm={async () => {
          if (!deleting) return;
          await deleteOnlineClass(deleting.id);
          toast.success("Class cancelled");
          setDeleting(null);
          setReloadKey((key) => key + 1);
        }}
      />
    </div>
  );
}
