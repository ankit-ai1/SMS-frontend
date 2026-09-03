"use client";

import * as React from "react";
import { BellOff, CheckCheck, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AUDIENCE_META,
  relativeTime,
  toAudience,
} from "@/components/notifications/notice-meta";
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
import { Textarea } from "@/components/ui/textarea";
import {
  NOTICE_AUDIENCES,
  USER_ROLES,
  canSendNotices,
  deleteNotice,
  getCurrentAcademicYear,
  getUser,
  listNotices,
  listSections,
  markAllNoticesRead,
  markNoticeRead,
  sendNotice,
  toUserRole,
  type NoticeAudience,
  type SchoolNotice,
  type Section,
  type UserRole,
} from "@/lib/api";
import { formatDate, humanizeToken } from "@/lib/format";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                  Compose                                   */
/* -------------------------------------------------------------------------- */

type ComposeErrors = Partial<Record<"title" | "target", string>>;

function ComposeForm({
  sections,
  onCancel,
  onSent,
}: {
  sections: Section[];
  onCancel: () => void;
  onSent: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [audience, setAudience] = React.useState<NoticeAudience>("school");
  const [role, setRole] = React.useState<UserRole | "">("");
  const [sectionId, setSectionId] = React.useState("");
  const [errors, setErrors] = React.useState<ComposeErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found: ComposeErrors = {};
    if (!title.trim()) found.title = "A notice needs a title.";
    if (audience === "role" && !role) found.target = "Pick a role.";
    if (audience === "section" && !sectionId) found.target = "Pick a section.";
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      await sendNotice({
        title: title.trim(),
        body: body.trim() || undefined,
        audience,
        ...(audience === "role" ? { audience_role: role as UserRole } : {}),
        ...(audience === "section" ? { audience_section_id: sectionId } : {}),
      });
      toast.success("Notice sent", {
        description: `${title.trim()} is now in their inbox.`,
      });
      onSent();
    } catch (cause) {
      toast.error("Could not send the notice", {
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
      <Field id="notice_title" label="Title" error={errors.title}>
        <Input
          {...fieldProps("notice_title", errors.title)}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setErrors((current) => ({ ...current, title: undefined }));
          }}
          placeholder="Annual Day rehearsal moved to Friday"
          disabled={isSubmitting}
          className="h-9 rounded-xl"
        />
      </Field>

      <Field id="notice_body" label="Message (optional)">
        <Textarea
          id="notice_body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Anything else they need to know."
          rows={4}
          disabled={isSubmitting}
          className="rounded-xl"
        />
      </Field>

      <Field id="notice_audience" label="Send to">
        <Select
          value={audience}
          onValueChange={(value) => {
            setAudience(value as NoticeAudience);
            setErrors((current) => ({ ...current, target: undefined }));
          }}
          disabled={isSubmitting}
        >
          <SelectTrigger id="notice_audience" className="h-9 w-full rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* `user` is left out: picking one person belongs on that person's
                own screen, not in a broadcast composer. */}
            {NOTICE_AUDIENCES.filter((value) => value !== "user").map((value) => (
              <SelectItem key={value} value={value}>
                {AUDIENCE_META[value].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {audience === "role" && (
        <Field id="notice_role" label="Which role" error={errors.target}>
          <Select
            value={role}
            onValueChange={(value) => {
              setRole(value as UserRole);
              setErrors((current) => ({ ...current, target: undefined }));
            }}
            disabled={isSubmitting}
          >
            <SelectTrigger
              {...fieldProps("notice_role", errors.target)}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {USER_ROLES.map((value) => (
                <SelectItem key={value} value={value}>
                  {humanizeToken(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {audience === "section" && (
        <Field
          id="notice_section"
          label="Which section"
          error={errors.target}
          hint="Reaches its students, their parents, and the teachers who take it."
        >
          <Select
            value={sectionId}
            onValueChange={(value) => {
              setSectionId(value);
              setErrors((current) => ({ ...current, target: undefined }));
            }}
            disabled={isSubmitting || sections.length === 0}
          >
            <SelectTrigger
              {...fieldProps("notice_section", errors.target)}
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
      )}

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
              Sending
            </>
          ) : (
            <>
              <Send className="size-4" />
              Send notice
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

function NoticeRow({
  notice,
  canDelete,
  onRead,
  onDelete,
}: {
  notice: SchoolNotice;
  canDelete: boolean;
  onRead: () => void;
  onDelete: () => void;
}) {
  const meta = AUDIENCE_META[toAudience(notice.audience)];
  const Icon = meta.icon;
  const isUnread = !notice.read_at;

  return (
    <li
      className={cn(
        "group/row flex flex-wrap items-start gap-4 px-4 py-4 transition-colors hover:bg-muted/40",
        isUnread && "bg-brand-50/35"
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-2xl ring-1",
          meta.chip
        )}
      >
        <Icon className="size-4.5" />
      </span>

      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "truncate text-sm",
              isUnread ? "font-bold" : "font-semibold"
            )}
          >
            {notice.title}
          </p>
          {isUnread && (
            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[0.625rem] font-bold text-white">
              New
            </span>
          )}
        </div>

        {notice.body?.trim() && (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {notice.body}
          </p>
        )}

        <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.6875rem] text-muted-foreground">
          <span className={cn("rounded-md px-1.5 py-0.5 font-bold ring-1", meta.chip)}>
            {meta.label}
          </span>
          <span>{relativeTime(notice.created_at)}</span>
          <span className="hidden sm:inline">
            · {formatDate(notice.created_at)}
          </span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {isUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRead}
            className="rounded-lg"
          >
            <CheckCheck className="size-3.5" />
            <span className="hidden sm:inline">Mark read</span>
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            aria-label={`Withdraw ${notice.title}`}
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

export function NoticesView() {
  const [notices, setNotices] = React.useState<SchoolNotice[] | null>(null);
  const [sections, setSections] = React.useState<Section[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [isComposeOpen, setIsComposeOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<SchoolNotice | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);

  // localStorage only exists on the client, so gate on a mount signal that is
  // identical between the prerendered markup and the first client render —
  // the same trick the app shell uses to read the signed-in user.
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const maySend = canSendNotices(isClient ? toUserRole(getUser()?.role) : null);

  React.useEffect(() => {
    let cancelled = false;

    listNotices()
      .then((loaded) => {
        if (cancelled) return;
        setNotices(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading your notices."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Only the composer needs sections, so a failure here costs a dropdown.
  React.useEffect(() => {
    if (!maySend) return;
    let cancelled = false;

    getCurrentAcademicYear()
      .then((year) => (year ? listSections(year.id) : []))
      .then((loaded) => {
        if (!cancelled) setSections(loaded);
      })
      .catch(() => {
        if (!cancelled) setSections([]);
      });

    return () => {
      cancelled = true;
    };
  }, [maySend]);

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  const unread = (notices ?? []).filter((notice) => !notice.read_at);

  async function handleRead(notice: SchoolNotice) {
    setNotices((current) =>
      (current ?? []).map((entry) =>
        entry.id === notice.id
          ? { ...entry, read_at: new Date().toISOString() }
          : entry
      )
    );
    await markNoticeRead(notice.id).catch(() => refresh());
  }

  async function handleReadAll() {
    if (isBusy || unread.length === 0) return;
    setIsBusy(true);
    try {
      await markAllNoticesRead();
    } finally {
      setIsBusy(false);
      refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Notices
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {maySend
              ? "Everything sent to you, and anything you need to send out."
              : "Everything the school has sent you."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unread.length > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleReadAll}
              disabled={isBusy}
              className="rounded-xl"
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCheck className="size-4" />
              )}
              Mark all read
            </Button>
          )}

          {maySend && (
            <Button
              size="lg"
              onClick={() => setIsComposeOpen(true)}
              className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
            >
              <Plus className="size-4" />
              New Notice
            </Button>
          )}
        </div>
      </div>

      <Panel
        title="Inbox"
        description={
          unread.length > 0
            ? `${unread.length} unread — newest first.`
            : "Newest first."
        }
        icon={BellOff}
      >
        {error ? (
          <SectionError
            message={error}
            onRetry={() => {
              setError(null);
              refresh();
            }}
          />
        ) : notices === null ? (
          <ul className="divide-y">
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index} className="flex items-start gap-4 px-4 py-4">
                <Skeleton className="size-10 shrink-0 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 max-w-[60%] rounded-md" />
                  <Skeleton className="h-3 w-64 max-w-[80%] rounded-md" />
                </div>
              </li>
            ))}
          </ul>
        ) : notices.length === 0 ? (
          <SectionEmpty
            icon={BellOff}
            title="No notices yet"
            description={
              maySend
                ? "Anything you send out, and anything sent to you, shows up here."
                : "Notices from the school will show up here."
            }
          >
            {maySend && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsComposeOpen(true)}
                className="rounded-xl"
              >
                <Plus className="size-4" />
                New Notice
              </Button>
            )}
          </SectionEmpty>
        ) : (
          <ul className="divide-y">
            {notices.map((notice) => (
              <NoticeRow
                key={notice.id}
                notice={notice}
                canDelete={maySend}
                onRead={() => void handleRead(notice)}
                onDelete={() => setDeleting(notice)}
              />
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send a notice</DialogTitle>
            <DialogDescription>
              It lands in the inbox of everyone you choose, straight away.
            </DialogDescription>
          </DialogHeader>
          <ComposeForm
            sections={sections}
            onCancel={() => setIsComposeOpen(false)}
            onSent={() => {
              setIsComposeOpen(false);
              refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Withdraw this notice?"
        description={
          <>
            {deleting ? `“${deleting.title}”` : "This notice"} will be removed
            from everyone&rsquo;s inbox, including those who have already read
            it.
          </>
        }
        confirmLabel="Withdraw notice"
        pendingLabel="Withdrawing"
        errorTitle="Could not withdraw the notice"
        onConfirm={async () => {
          if (!deleting) return;
          await deleteNotice(deleting.id);
          toast.success("Notice withdrawn");
          setDeleting(null);
          refresh();
        }}
      />
    </div>
  );
}
