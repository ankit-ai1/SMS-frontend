import {
  BadgeCheck,
  CalendarCheck,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  CreditCard,
  FileBadge,
  GraduationCap,
  HandCoins,
  LayoutDashboard,
  Library,
  Receipt,
  SlidersHorizontal,
  Settings,
  ShieldCheck,
  SquarePen,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/lib/api";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Routed but not built yet — the page renders a "coming soon" state. */
  comingSoon?: boolean;
};

/** The full back-office menu: admins, super admins, and every other staff role. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/staff", label: "Staff", icon: UsersRound },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/fees", label: "Fees", icon: Wallet },
  { href: "/exams", label: "Exams", icon: ShieldCheck },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/leave-approvals", label: "Leave Approvals", icon: BadgeCheck },
  { href: "/users", label: "Users", icon: Users },
  { href: "/setup", label: "Academic Setup", icon: SlidersHorizontal },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * A teacher's menu is deliberately short: only the work they own. The
 * directory, money, and configuration screens are admin territory and the
 * backend refuses them anyway, so routing to them would only produce 403s.
 */
export const TEACHER_NAV_ITEMS: NavItem[] = [
  { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/classes", label: "My Classes", icon: Library },
  { href: "/teacher/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/teacher/grades", label: "Grades", icon: SquarePen },
  { href: "/teacher/leave", label: "My Leave", icon: CalendarCheck },
];

/** A parent's menu is focused on their children's read-only school record. */
export const PARENT_NAV_ITEMS: NavItem[] = [
  { href: "/parent", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parent/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/parent/fees", label: "Fees", icon: CreditCard },
  { href: "/parent/reportcards", label: "Report Cards", icon: FileBadge },
  { href: "/parent/calendar", label: "Calendar", icon: CalendarDays },
];

/**
 * A principal oversees the whole school without changing any of it: every
 * screen behind this menu is a read-only view over the same records the admin
 * screens edit, and Leave Approvals is the one place a decision is taken.
 *
 * My Leave is there because a principal is an employee too — theirs goes up to
 * an admin, the same way a teacher's comes down to them.
 */
export const PRINCIPAL_NAV_ITEMS: NavItem[] = [
  { href: "/principal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/principal/students", label: "Students", icon: GraduationCap },
  { href: "/principal/staff", label: "Staff", icon: UsersRound },
  { href: "/principal/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/principal/fees", label: "Fees", icon: Wallet },
  { href: "/principal/exams", label: "Exams", icon: ShieldCheck },
  { href: "/principal/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/principal/leave", label: "Leave Approvals", icon: BadgeCheck },
  { href: "/principal/my-leave", label: "My Leave", icon: CalendarCheck },
];

/**
 * An accountant's menu is the money, and only the money. Attendance, exams and
 * the student record proper are someone else's job — the student names that do
 * appear come from fee rosters and the collection search, which is all they
 * need to take a payment. My Leave is here for the same reason it is on the
 * principal's menu: an accountant is an employee too.
 */
export const ACCOUNTANT_NAV_ITEMS: NavItem[] = [
  { href: "/accountant", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accountant/collect", label: "Collect Fee", icon: HandCoins },
  { href: "/accountant/fees", label: "Fees", icon: Wallet },
  { href: "/accountant/payments", label: "Payments", icon: Receipt },
  { href: "/accountant/reports", label: "Financial Reports", icon: ChartColumn },
  { href: "/accountant/my-leave", label: "My Leave", icon: CalendarCheck },
];

/**
 * A clerk keeps the register: admissions, the papers that come with them, and
 * the daily roll. Money, marks and configuration are all somebody else's, and
 * the backend refuses them anyway. My Leave is here because a clerk is an
 * employee too — theirs goes to the principal, like the rest of the staff.
 */
export const CLERK_NAV_ITEMS: NavItem[] = [
  { href: "/clerk", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clerk/students", label: "Students", icon: GraduationCap },
  { href: "/clerk/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/clerk/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/clerk/my-leave", label: "My Leave", icon: CalendarCheck },
];

/**
 * A student's menu is the parent menu with one subject: their own record,
 * read only. The wording is first-person throughout, because there is no child
 * to pick — it is always them.
 */
export const STUDENT_NAV_ITEMS: NavItem[] = [
  { href: "/student", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/attendance", label: "My Attendance", icon: ClipboardCheck },
  { href: "/student/fees", label: "My Fees", icon: CreditCard },
  { href: "/student/reportcards", label: "My Report Cards", icon: FileBadge },
  { href: "/student/calendar", label: "Calendar", icon: CalendarDays },
];

/** The menu a role sees. Staff keep the full back-office menu. */
export function navItemsFor(role: UserRole | null | undefined): NavItem[] {
  if (role === "parent") return PARENT_NAV_ITEMS;
  if (role === "student") return STUDENT_NAV_ITEMS;
  if (role === "principal") return PRINCIPAL_NAV_ITEMS;
  if (role === "accountant") return ACCOUNTANT_NAV_ITEMS;
  if (role === "clerk") return CLERK_NAV_ITEMS;
  return role === "teacher" ? TEACHER_NAV_ITEMS : NAV_ITEMS;
}

/** Where a role lands after signing in, and where a blocked route sends it. */
export function homePathFor(role: UserRole | null | undefined): string {
  if (role === "parent") return "/parent";
  if (role === "student") return "/student";
  if (role === "principal") return "/principal";
  if (role === "accountant") return "/accountant";
  if (role === "clerk") return "/clerk";
  return role === "teacher" ? "/teacher" : "/dashboard";
}

/** Longest matching prefix wins, so nested routes keep their parent highlighted. */
export function activeNavItem(
  pathname: string,
  items: NavItem[] = NAV_ITEMS
): NavItem | undefined {
  return items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/**
 * A client-side guard, not a security boundary — the backend still authorises
 * every request. It exists so a teacher who types `/fees` gets their own
 * dashboard instead of a screen full of 403s.
 *
 * Only the roles with a menu of their own are constrained. The rest share the
 * admin menu today, and narrowing them here would lock out screens they
 * legitimately use.
 */
export function isPathAllowed(
  role: UserRole | null | undefined,
  pathname: string
): boolean {
  const constrainedItems =
    role === "teacher"
      ? TEACHER_NAV_ITEMS
      : role === "parent"
        ? PARENT_NAV_ITEMS
        : role === "student"
          ? STUDENT_NAV_ITEMS
          : role === "principal"
          ? PRINCIPAL_NAV_ITEMS
          : role === "accountant"
            ? ACCOUNTANT_NAV_ITEMS
            : role === "clerk"
              ? CLERK_NAV_ITEMS
              : null;

  if (!constrainedItems) return true;
  return constrainedItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
}
