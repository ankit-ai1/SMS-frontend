import {
  Building2,
  GraduationCap,
  User,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { NoticeAudience } from "@/lib/api";

/** How each audience is labelled and tinted wherever a notice is shown. */
export const AUDIENCE_META: Record<
  NoticeAudience,
  { label: string; chip: string; icon: LucideIcon }
> = {
  school: {
    label: "Whole school",
    chip: "bg-brand-50 text-brand-700 ring-brand-100",
    icon: Building2,
  },
  role: {
    label: "By role",
    chip: "bg-gold-soft text-gold ring-gold/20",
    icon: UsersRound,
  },
  section: {
    label: "One section",
    chip: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-400 dark:ring-sky-500/20",
    icon: GraduationCap,
  },
  user: {
    label: "One person",
    chip: "bg-muted text-muted-foreground ring-border",
    icon: User,
  },
};

/** Backend audience tokens are free text; narrow to one we know how to draw. */
export function toAudience(value: string | null | undefined): NoticeAudience {
  const key = (value ?? "").trim().toLowerCase();
  return key === "school" || key === "role" || key === "section" || key === "user"
    ? key
    : "school";
}

/** "5 minutes ago", "Yesterday" — the timestamp an inbox actually wants. */
export function relativeTime(value: string | null | undefined): string {
  if (!value) return "";
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return "";

  const seconds = Math.round((Date.now() - then.getTime()) / 1000);
  if (seconds < 60) return "Just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(then);
}
