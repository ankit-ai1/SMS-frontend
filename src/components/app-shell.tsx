"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, GraduationCap, LogOut, Menu, ShieldCheck } from "lucide-react";

import { NoticeBell } from "@/components/notifications/notice-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  activeNavItem,
  homePathFor,
  isPathAllowed,
  navItemsFor,
  type NavItem,
} from "@/lib/nav";
import {
  TENANT,
  fetchCurrentUser,
  getToken,
  getUser,
  logout,
  toUserRole,
} from "@/lib/api";
import { initialsFrom } from "@/lib/format";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                  Branding                                  */
/* -------------------------------------------------------------------------- */

function BrandLockup({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--brand-600),var(--brand-400))] text-white shadow-brand ring-1 ring-white/35 transition-transform group-hover:scale-105">
        <GraduationCap className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">
          Synerax Campus
        </span>
        <span className="block truncate text-xs text-muted-foreground capitalize">
          {TENANT}
        </span>
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Navigation                                  */
/* -------------------------------------------------------------------------- */

function NavLinks({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = activeNavItem(pathname ?? "", items);

  return (
    <nav className="flex flex-col gap-1.5">
      {items.map((item: NavItem) => {
        const Icon = item.icon;
        const isActive = active?.href === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
              isActive
                ? "bg-card text-brand-700 shadow-card ring-1 ring-brand-100"
                : "text-muted-foreground hover:bg-card/70 hover:text-foreground hover:shadow-soft"
            )}
          >
            {/* Rail marker — reads as a selected tab rather than just a tint. */}
            <span
              aria-hidden
              className={cn(
                "absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,var(--brand-500),var(--brand-700))] transition-opacity",
                isActive ? "opacity-100" : "opacity-0"
              )}
            />
            <Icon
              className={cn(
                "size-4 shrink-0 transition-colors",
                isActive
                  ? "text-brand-600"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span className="truncate">{item.label}</span>
            {item.comingSoon && (
              <span className="ml-auto rounded-full bg-sky-50 px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-sky-700 ring-1 ring-sky-100 uppercase">
                Soon
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function NavSkeleton() {
  return (
    <div className="flex flex-col gap-1.5" aria-hidden>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-11 rounded-2xl" />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Shell                                   */
/* -------------------------------------------------------------------------- */

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // localStorage only exists on the client, so gate on a mount signal that is
  // identical between the prerendered markup and the first client render.
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const token = isClient ? getToken() : null;

  const [user, setUserState] = React.useState(() =>
    isClient ? getUser() : null
  );
  const [isUserResolved, setIsUserResolved] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // The menu and the route guard both key off the role, so until it is known
  // the shell shows a placeholder rather than guessing at the admin menu.
  const role = toUserRole(user?.role);
  const isRolePending = Boolean(token) && !user && !isUserResolved;
  const navItems = navItemsFor(role);
  const homePath = homePathFor(role);

  React.useEffect(() => {
    if (isClient && !token) {
      router.replace("/login");
    }
  }, [isClient, token, router]);

  // Only reached when login did not return a user object.
  React.useEffect(() => {
    if (!token || user) return;
    let cancelled = false;

    fetchCurrentUser().then((fetched) => {
      if (cancelled) return;
      if (fetched) setUserState(fetched);
      setIsUserResolved(true);
    });

    return () => {
      cancelled = true;
    };
  }, [token, user]);

  // A UI guard only — the backend authorises every request regardless. It
  // keeps a teacher who types an admin URL on a screen that works for them.
  React.useEffect(() => {
    if (isRolePending || !pathname) return;
    if (!isPathAllowed(role, pathname)) router.replace(homePathFor(role));
  }, [isRolePending, pathname, role, router]);

  function handleSignOut() {
    logout();
    router.replace("/login");
  }

  if (!token) {
    return <div className="min-h-svh bg-muted/40" />;
  }

  const active = activeNavItem(pathname ?? "", navItems);
  const title = active?.label ?? "Dashboard";
  const displayName = user?.name?.trim() || user?.email || "Signed in";
  const roleLabel = user?.role?.trim();
  const initials = initialsFrom(user?.name, user?.email);

  return (
    <div className="min-h-svh bg-transparent">
      {/* ------------------------------ Sidebar ------------------------------ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/70 bg-card/78 shadow-[8px_0_30px_-26px_oklch(0.18_0.046_265.5_/_0.55)] backdrop-blur-2xl lg:flex">
        <div className="flex h-18 items-center px-5">
          <BrandLockup href={homePath} />
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto px-3 py-5">
          {isRolePending ? <NavSkeleton /> : <NavLinks items={navItems} />}
        </div>
        <div className="px-3 pb-4">
          <p className="rounded-2xl border border-white/70 bg-muted/45 px-3 py-3 text-xs leading-relaxed text-muted-foreground shadow-soft">
            Signed in as
            <span className="mt-0.5 block truncate font-medium text-foreground">
              {displayName}
            </span>
          </p>
        </div>
      </aside>

      {/* ------------------------------- Topbar ------------------------------ */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b border-white/70 bg-card/72 px-4 shadow-soft backdrop-blur-2xl sm:px-6">
          {/* Mobile nav */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="rounded-2xl lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SheetDescription className="sr-only">
                Move between sections of Synerax Campus.
              </SheetDescription>
              <div className="flex h-18 items-center px-5">
                <BrandLockup href={homePath} />
              </div>
              <Separator />
              <div className="px-3 py-4">
                {isRolePending ? (
                  <NavSkeleton />
                ) : (
                  <NavLinks
                    items={navItems}
                    onNavigate={() => setMobileOpen(false)}
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="truncate text-base font-bold sm:text-lg">
            {title}
          </h1>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <NoticeBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-2xl px-2.5 sm:px-3"
                  aria-label="Open account menu"
                >
                  <Avatar className="size-8 shadow-soft ring-1 ring-brand-100">
                    <AvatarFallback className="bg-brand-50 text-xs font-bold text-brand-700">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden min-w-0 text-left sm:block">
                    <span className="block max-w-[12rem] truncate text-sm leading-tight font-bold">
                      {displayName}
                    </span>
                    {roleLabel && (
                      <span className="block text-xs leading-tight text-muted-foreground capitalize">
                        {roleLabel.toLowerCase()}
                      </span>
                    )}
                  </span>
                  <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-72 rounded-2xl border border-white/70 bg-popover/95 p-2 shadow-lift backdrop-blur-xl"
              >
                <DropdownMenuLabel className="p-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 ring-1 ring-brand-100">
                      <AvatarFallback className="bg-brand-50 text-xs font-bold text-brand-700">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {displayName}
                      </p>
                      {roleLabel && (
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground capitalize">
                          <ShieldCheck className="size-3.5" />
                          {roleLabel.toLowerCase()}
                        </p>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={handleSignOut}
                  className="rounded-xl px-3 py-2 font-semibold"
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
