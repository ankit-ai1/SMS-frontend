"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserRoundCheck,
  Users as UsersIcon,
  X,
} from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  ResetPasswordDialog,
  type ResetTarget,
} from "@/components/users/reset-password-dialog";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { ROLE_META } from "@/components/users/user-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  USER_ROLES,
  deleteUser,
  fetchCurrentUser,
  getUser,
  listUsers,
  toUserRole,
  toUserStatus,
  updateUserStatus,
  type ManagedUser,
  type PageMeta,
  type UserRole,
  type UserStatus,
} from "@/lib/api";
import { formatDate, formatNumber, humanizeToken, initialsFrom } from "@/lib/format";
import { cn } from "@/lib/utils";

const PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 350;

/** Radix rejects an empty item value, so "no filter" needs a sentinel. */
const ALL = "all";

/** One page of users plus the query it answers — see `queryKey` below. */
type LoadResult = {
  key: string;
  users: ManagedUser[];
  meta: PageMeta | null;
  error: string | null;
};

/* -------------------------------------------------------------------------- */
/*                                Table pieces                                */
/* -------------------------------------------------------------------------- */

const COLUMNS = [
  { key: "name", label: "Name", className: "" },
  { key: "email", label: "Email", className: "w-[15rem]" },
  { key: "role", label: "Role", className: "w-[9rem]" },
  { key: "status", label: "Status", className: "w-[8rem]" },
  { key: "created", label: "Created", className: "w-[9rem]" },
  { key: "actions", label: "Actions", className: "w-[4.5rem]", hidden: true },
];

function TableHead() {
  return (
    <thead>
      <tr className="border-b bg-muted/40">
        {COLUMNS.map((column) => (
          <th
            key={column.key}
            scope="col"
            className={`px-5 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase ${column.className}`}
          >
            <span className={column.hidden ? "sr-only" : undefined}>
              {column.label}
            </span>
          </th>
        ))}
      </tr>
    </thead>
  );
}

function RoleBadge({ role }: { role: string }) {
  const known = toUserRole(role);
  const meta = known ? ROLE_META[known] : null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ring-1",
        meta?.chip ?? "bg-muted text-muted-foreground ring-border"
      )}
    >
      {meta?.label ?? humanizeToken(role) ?? "Unknown"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = toUserStatus(status) !== "disabled";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-medium",
        isActive
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
          : "bg-muted text-muted-foreground"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          isActive ? "bg-emerald-500" : "bg-muted-foreground/50"
        )}
      />
      {isActive ? "Active" : "Disabled"}
    </span>
  );
}

function UserRow({
  user,
  isSelf,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete,
}: {
  user: ManagedUser;
  isSelf: boolean;
  onEdit: (user: ManagedUser) => void;
  onResetPassword: (user: ManagedUser) => void;
  onToggleStatus: (user: ManagedUser) => void;
  onDelete: (user: ManagedUser) => void;
}) {
  const isActive = toUserStatus(user.status) !== "disabled";

  return (
    <tr className="transition-colors hover:bg-muted/50">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[0.7rem] font-semibold text-brand-700">
            {initialsFrom(user.full_name, user.email)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {user.full_name || "—"}
            </p>
            {isSelf && (
              <p className="mt-0.5 text-xs text-muted-foreground">You</p>
            )}
          </div>
        </div>
      </td>

      <td className="px-5 py-3">
        <span className="block truncate text-sm text-muted-foreground">
          {user.email || "—"}
        </span>
      </td>

      <td className="px-5 py-3">
        <RoleBadge role={user.role} />
      </td>

      <td className="px-5 py-3">
        <StatusBadge status={user.status} />
      </td>

      <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">
        {user.created_at ? formatDate(user.created_at) : "—"}
      </td>

      <td className="px-5 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
              aria-label={`Actions for ${user.full_name || user.email}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => onEdit(user)}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onResetPassword(user)}>
              <KeyRound className="size-4" />
              Reset password
            </DropdownMenuItem>

            {/* You cannot lock yourself out of the system. */}
            {!isSelf && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onToggleStatus(user)}>
                  {isActive ? (
                    <>
                      <CircleSlash className="size-4" />
                      Disable
                    </>
                  ) : (
                    <>
                      <UserRoundCheck className="size-4" />
                      Enable
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => onDelete(user)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <Skeleton className="h-4 w-36 max-w-full rounded-md" />
        </div>
      </td>
      <td className="px-5 py-3">
        <Skeleton className="h-4 w-44 max-w-full rounded-md" />
      </td>
      <td className="px-5 py-3">
        <Skeleton className="h-5 w-20 rounded-lg" />
      </td>
      <td className="px-5 py-3">
        <Skeleton className="h-5 w-16 rounded-lg" />
      </td>
      <td className="px-5 py-3">
        <Skeleton className="h-4 w-24 rounded-md" />
      </td>
      <td className="px-5 py-3">
        <Skeleton className="size-7 rounded-lg" />
      </td>
    </tr>
  );
}

function EmptyState({
  filtered,
  onClearFilters,
}: {
  filtered: boolean;
  onClearFilters: () => void;
}) {
  const Icon = filtered ? SearchX : UsersIcon;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon className="size-7" />
      </span>
      <p className="mt-5 text-sm font-medium">
        {filtered ? "No users match your filters" : "No users yet"}
      </p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {filtered
          ? "Try a different name or email, or clear the filters to see everyone."
          : "No users yet — add the first sign-in for your school."}
      </p>
      {filtered && (
        <Button
          variant="outline"
          size="lg"
          onClick={onClearFilters}
          className="mt-5 rounded-xl"
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export default function UsersPage() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>(ALL);
  const [statusFilter, setStatusFilter] = React.useState<string>(ALL);
  const [page, setPage] = React.useState(1);

  const [result, setResult] = React.useState<LoadResult | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | number | null>(null);
  const [resetting, setResetting] = React.useState<ResetTarget | null>(null);
  const [toggling, setToggling] = React.useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = React.useState<ManagedUser | null>(null);

  // Identifies the signed-in account, so its own row can't be locked out.
  const [self, setSelf] = React.useState(() => getUser());

  React.useEffect(() => {
    if (self?.id != null) return;
    let cancelled = false;

    fetchCurrentUser().then((fetched) => {
      if (!cancelled && fetched) setSelf(fetched);
    });

    return () => {
      cancelled = true;
    };
  }, [self]);

  // Typing is cheap; requests are not. Only the settled value drives the fetch.
  React.useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [search]);

  // Identifies the request the current filters ask for. Loading is then simply
  // "what we hold isn't what we asked for" — no loading flag to keep in sync.
  const queryKey = [
    page,
    debouncedSearch.trim(),
    roleFilter,
    statusFilter,
    reloadKey,
  ].join(" ");

  React.useEffect(() => {
    let cancelled = false;

    listUsers({
      page,
      per_page: PER_PAGE,
      search: debouncedSearch,
      role: roleFilter === ALL ? "" : (roleFilter as UserRole),
      status: statusFilter === ALL ? "" : (statusFilter as UserStatus),
    })
      .then((loaded) => {
        if (cancelled) return;
        setResult({
          key: queryKey,
          users: loaded.items,
          meta: loaded.meta,
          error: null,
        });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setResult({
          key: queryKey,
          users: [],
          meta: null,
          error:
            cause instanceof Error
              ? cause.message
              : "Something went wrong while loading users.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [queryKey, page, debouncedSearch, roleFilter, statusFilter]);

  const isLoading = result?.key !== queryKey;
  const users = result?.users ?? [];
  const meta = result?.meta ?? null;
  // A stale error belongs to filters the user has already moved on from.
  const error = result?.key === queryKey ? result.error : null;

  /** Matches on id, falling back to email when the token carried no id. */
  function isSelf(user: ManagedUser): boolean {
    if (self?.id != null) return String(self.id) === String(user.id);
    if (self?.email) return self.email.toLowerCase() === user.email?.toLowerCase();
    return false;
  }

  // Filters narrow the result set, so any change invalidates the page number.
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setRoleFilter(ALL);
    setStatusFilter(ALL);
    setPage(1);
  }

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  const isFiltered =
    debouncedSearch.trim() !== "" || roleFilter !== ALL || statusFilter !== ALL;
  const showSkeleton = isLoading && users.length === 0;
  const isRefreshing = isLoading && users.length > 0;

  const total = meta?.total ?? 0;
  const totalPages = Math.max(1, meta?.total_pages ?? 1);
  const currentPage = meta?.page ?? page;
  const perPage = meta?.per_page || PER_PAGE;
  const firstOnPage = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const lastOnPage = Math.min(currentPage * perPage, total);

  const togglingActive =
    toggling !== null && toUserStatus(toggling.status) !== "disabled";
  const togglingName = toggling?.full_name || toggling?.email || "This user";
  const deletingName = deleting?.full_name || deleting?.email || "This user";

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Users
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta && !error
              ? `${formatNumber(total)} ${
                  total === 1 ? "account" : "accounts"
                } can sign in.`
              : "Who can sign in to Synerax Campus, and what they can reach."}
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => setIsAddOpen(true)}
          className="rounded-xl shadow-brand transition-all hover:bg-brand-700 hover:shadow-lift"
        >
          <Plus className="size-4" />
          Add User
        </Button>
      </div>

      <UserFormDialog
        mode="create"
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSaved={() => {
          clearFilters();
          refresh();
        }}
      />

      <UserFormDialog
        mode="edit"
        userId={editingId}
        open={editingId != null}
        onOpenChange={(next) => {
          if (!next) setEditingId(null);
        }}
        onSaved={refresh}
      />

      <ResetPasswordDialog
        target={resetting}
        onOpenChange={(next) => {
          if (!next) setResetting(null);
        }}
      />

      <ConfirmDialog
        open={toggling != null}
        onOpenChange={(next) => {
          if (!next) setToggling(null);
        }}
        title={togglingActive ? "Disable this account?" : "Enable this account?"}
        description={
          togglingActive ? (
            <>
              {togglingName} will not be able to sign in until the account is
              enabled again.
            </>
          ) : (
            <>{togglingName} will be able to sign in again straight away.</>
          )
        }
        confirmLabel={togglingActive ? "Disable account" : "Enable account"}
        pendingLabel={togglingActive ? "Disabling" : "Enabling"}
        errorTitle="Could not change the account status"
        onConfirm={async () => {
          if (!toggling) return;
          const next: UserStatus = togglingActive ? "disabled" : "active";
          await updateUserStatus(toggling.id, next);
          toast.success(
            next === "disabled" ? "Account disabled" : "Account enabled",
            { description: `${togglingName} is now ${next}.` }
          );
          setToggling(null);
          refresh();
        }}
      />

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        title="Delete this user?"
        description={
          <>
            {deletingName} will be disabled and can no longer sign in. The
            record is kept on file for audit.
          </>
        }
        confirmLabel="Delete user"
        pendingLabel="Deleting"
        errorTitle="Could not delete the user"
        onConfirm={async () => {
          if (!deleting) return;
          await deleteUser(deleting.id);
          toast.success("User deleted", {
            description: `${deletingName} can no longer sign in.`,
          });
          setDeleting(null);
          refresh();
        }}
      />

      {error ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" />
            </span>
            <p className="mt-4 text-sm font-medium">
              We couldn&rsquo;t load your users
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {error}
            </p>
            <Button
              size="lg"
              onClick={refresh}
              className="mt-5 rounded-xl shadow-brand transition-all hover:bg-brand-700 hover:shadow-lift"
            >
              <RefreshCw className="size-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 py-0 shadow-card">
          {/* ----------------------------- Toolbar ---------------------------- */}
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search by name or email"
                aria-label="Search users"
                className="h-9 rounded-xl pr-9 pl-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Filter by role"
                className="h-9 w-full rounded-xl sm:w-40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All roles</SelectItem>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_META[role].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Filter by status"
                className="h-9 w-full rounded-xl sm:w-36"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              {isRefreshing && <Loader2 className="size-3.5 animate-spin" />}
              {isFiltered && !isLoading && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg px-2 py-1 font-medium transition-colors hover:bg-muted hover:text-foreground"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* ------------------------------ Table ----------------------------- */}
          {!showSkeleton && users.length === 0 ? (
            <EmptyState filtered={isFiltered} onClearFilters={clearFilters} />
          ) : (
            <div className="overflow-x-auto">
              <table
                className={cn(
                  "w-full min-w-[56rem] border-collapse text-left transition-opacity",
                  isRefreshing ? "opacity-60" : "opacity-100"
                )}
              >
                <TableHead />
                <tbody className="divide-y">
                  {showSkeleton
                    ? Array.from({ length: 6 }, (_, index) => (
                        <SkeletonRow key={index} />
                      ))
                    : users.map((user) => (
                        <UserRow
                          key={user.id}
                          user={user}
                          isSelf={isSelf(user)}
                          onEdit={(target) => setEditingId(target.id)}
                          onResetPassword={(target) =>
                            setResetting({
                              id: target.id,
                              name: target.full_name || target.email,
                            })
                          }
                          onToggleStatus={setToggling}
                          onDelete={setDeleting}
                        />
                      ))}
                </tbody>
              </table>
            </div>
          )}

          {/* --------------------------- Pagination --------------------------- */}
          <CardFooter className="flex-wrap justify-between gap-3">
            <p className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
              <ShieldCheck className="size-3.5" />
              {showSkeleton
                ? "Loading users…"
                : total === 0
                  ? "No results"
                  : `Showing ${formatNumber(firstOnPage)}–${formatNumber(
                      lastOnPage
                    )} of ${formatNumber(total)}`}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="lg"
                className="rounded-xl"
                disabled={isLoading || currentPage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="size-4" />
                Prev
              </Button>

              <span className="px-1 text-xs font-medium text-muted-foreground tabular-nums">
                Page {formatNumber(currentPage)} of {formatNumber(totalPages)}
              </span>

              <Button
                variant="outline"
                size="lg"
                className="rounded-xl"
                disabled={isLoading || currentPage >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
