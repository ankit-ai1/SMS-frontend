import type { UserRole } from "@/lib/api";

/** One accent per role, so seniority is readable down the table. */
export const ROLE_META: Record<UserRole, { label: string; chip: string }> = {
  super_admin: {
    label: "Super Admin",
    chip: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/20",
  },
  admin: {
    label: "Admin",
    chip: "bg-brand-50 text-brand-700 ring-brand-100",
  },
  principal: {
    label: "Principal",
    chip: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:ring-fuchsia-500/20",
  },
  teacher: {
    label: "Teacher",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20",
  },
  accountant: {
    label: "Accountant",
    chip: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/20",
  },
  clerk: {
    label: "Clerk",
    chip: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-400 dark:ring-sky-500/20",
  },
  parent: {
    label: "Parent",
    chip: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-400/15 dark:text-slate-300 dark:ring-slate-400/20",
  },
  student: {
    label: "Student",
    chip: "bg-muted text-muted-foreground ring-border",
  },
};

/** Roles that belong to a member of staff rather than a student or parent. */
const STAFF_ROLES: UserRole[] = [
  "principal",
  "teacher",
  "accountant",
  "clerk",
];

const STUDENT_ROLES: UserRole[] = ["parent", "student"];

/** Which directory a role's "link to a person" picker should search. */
export function linkKindFor(
  role: UserRole | "" | null
): "staff" | "student" | null {
  if (!role) return null;
  if (STAFF_ROLES.includes(role)) return "staff";
  if (STUDENT_ROLES.includes(role)) return "student";
  return null;
}

/**
 * A password strong enough to hand over once and then change. Uses the Web
 * Crypto RNG rather than Math.random — this is a real credential.
 */
export function generatePassword(length = 16): string {
  const alphabet =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*?";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);

  let password = "";
  for (const byte of bytes) {
    password += alphabet[byte % alphabet.length];
  }
  return password;
}
