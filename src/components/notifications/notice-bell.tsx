"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, BellOff, CheckCheck, Loader2 } from "lucide-react";

import {
  AUDIENCE_META,
  relativeTime,
  toAudience,
} from "@/components/notifications/notice-meta";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listNotices,
  markAllNoticesRead,
  markNoticeRead,
  type SchoolNotice,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const PREVIEW_LIMIT = 6;

/**
 * The inbox in the topbar. It lives in the shell rather than in any one role's
 * menu because every role has an inbox — a notice is the one screen that is
 * genuinely the same for a parent and a principal.
 *
 * Loads once on mount and again whenever the panel is opened, rather than
 * polling: a school notice is not worth a request every few seconds.
 */
export function NoticeBell() {
  const [notices, setNotices] = React.useState<SchoolNotice[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [isBusy, setIsBusy] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    listNotices()
      .then((loaded) => {
        if (!cancelled) setNotices(loaded);
      })
      .catch(() => {
        // An inbox that will not load must not break the shell around it.
        if (!cancelled) setNotices([]);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  const unread = (notices ?? []).filter((notice) => !notice.read_at);
  const preview = (notices ?? []).slice(0, PREVIEW_LIMIT);

  async function handleRead(notice: SchoolNotice) {
    if (notice.read_at) return;
    // Optimistic: the badge should drop the moment it is clicked.
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
      refresh();
    } catch {
      refresh();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) refresh();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-lg"
          className="relative rounded-2xl"
          aria-label={
            unread.length > 0
              ? `Notices — ${unread.length} unread`
              : "Notices"
          }
        >
          <Bell className="size-5" />
          {unread.length > 0 && (
            <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-bold text-white tabular-nums ring-2 ring-card">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-88 rounded-2xl border border-white/70 bg-popover/95 p-0 shadow-lift backdrop-blur-xl"
      >
        {/* ----------------------------- Header ----------------------------- */}
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="text-sm font-bold">
            Notices
            {unread.length > 0 && (
              <span className="ml-1.5 text-xs font-semibold text-muted-foreground">
                {unread.length} new
              </span>
            )}
          </p>

          {unread.length > 0 && (
            <button
              type="button"
              onClick={handleReadAll}
              disabled={isBusy}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
            >
              {isBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCheck className="size-3.5" />
              )}
              Mark all read
            </button>
          )}
        </div>

        {/* ------------------------------ List ------------------------------ */}
        <div className="max-h-80 overflow-y-auto">
          {notices === null ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-3 w-56 max-w-full rounded-md" />
                </div>
              ))}
            </div>
          ) : preview.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <BellOff className="size-4.5" />
              </span>
              <p className="mt-3 text-sm font-medium">Nothing new</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Notices from the school will show up here.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {preview.map((notice) => {
                const meta = AUDIENCE_META[toAudience(notice.audience)];
                const isUnread = !notice.read_at;

                return (
                  <li key={notice.id}>
                    <button
                      type="button"
                      onClick={() => void handleRead(notice)}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50",
                        isUnread && "bg-brand-50/40"
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          isUnread ? "bg-brand-500" : "bg-transparent"
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm",
                            isUnread ? "font-bold" : "font-medium"
                          )}
                        >
                          {notice.title}
                        </span>
                        {notice.body?.trim() && (
                          <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                            {notice.body}
                          </span>
                        )}
                        <span className="mt-1.5 flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[0.625rem] font-bold ring-1",
                              meta.chip
                            )}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[0.625rem] text-muted-foreground">
                            {relativeTime(notice.created_at)}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ----------------------------- Footer ----------------------------- */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="lg"
            asChild
            className="w-full rounded-xl font-bold"
            onClick={() => setOpen(false)}
          >
            <Link href="/notifications">View all notices</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
