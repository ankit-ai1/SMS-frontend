"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Trash2,
  TriangleAlert,
  UsersRound,
  X,
} from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StaffFormDialog } from "@/components/staff/staff-form-dialog";
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
  deleteStaff,
  listDepartments,
  listStaff,
  sameId,
  type Department,
  type PageMeta,
  type StaffMember,
} from "@/lib/api";
import { formatNumber, initialsFrom } from "@/lib/format";

const PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 350;

/** Radix rejects an empty item value, so "no filter" needs a sentinel. */
const ALL_DEPARTMENTS = "all";

/** One page of staff plus the query it answers — see `queryKey` below. */
type LoadResult = {
  key: string;
  staff: StaffMember[];
  meta: PageMeta | null;
  error: string | null;
};

/* -------------------------------------------------------------------------- */
/*                                Table pieces                                */
/* -------------------------------------------------------------------------- */

const COLUMNS = [
  { key: "code", label: "Employee Code", className: "w-[10rem]" },
  { key: "name", label: "Name", className: "" },
  { key: "email", label: "Email", className: "w-[14rem]" },
  { key: "phone", label: "Phone", className: "w-[10rem]" },
  { key: "department", label: "Department", className: "w-[10rem]" },
  { key: "status", label: "Status", className: "w-[7rem]" },
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

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
          : "bg-muted text-muted-foreground"
      }`}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-muted-foreground/50"
        }`}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function StaffRow({
  member,
  departmentName,
  onEdit,
  onDelete,
}: {
  member: StaffMember;
  departmentName: string;
  onEdit: (member: StaffMember) => void;
  onDelete: (member: StaffMember) => void;
}) {
  const router = useRouter();
  const fullName = `${member.first_name} ${member.last_name}`.trim();
  const href = `/staff/${member.id}`;

  return (
    <tr
      onClick={() => router.push(href)}
      className="cursor-pointer transition-colors hover:bg-muted/50"
    >
      <td className="px-5 py-3">
        <span className="text-sm font-medium tabular-nums">
          {member.employee_code || "—"}
        </span>
      </td>

      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[0.7rem] font-semibold text-brand-700">
            {initialsFrom(fullName)}
          </span>
          {/* A real link as well as the row click, so keyboard and screen
              readers get the same destination. */}
          <Link
            href={href}
            onClick={(event) => event.stopPropagation()}
            className="truncate rounded-md text-sm font-medium outline-none hover:text-brand-700 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {fullName || "—"}
          </Link>
        </div>
      </td>

      <td className="px-5 py-3">
        <span className="block truncate text-sm text-muted-foreground">
          {member.email || "—"}
        </span>
      </td>

      <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">
        {member.phone || "—"}
      </td>

      <td className="px-5 py-3">
        <span className="block truncate text-sm text-muted-foreground">
          {departmentName}
        </span>
      </td>

      <td className="px-5 py-3">
        <StatusBadge isActive={member.is_active} />
      </td>

      <td className="px-5 py-3" onClick={(event) => event.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
              aria-label={`Actions for ${fullName}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => router.push(href)}>
              <Eye className="size-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(member)}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onDelete(member)}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
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
        <Skeleton className="h-4 w-24 rounded-md" />
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <Skeleton className="h-4 w-36 max-w-full rounded-md" />
        </div>
      </td>
      <td className="px-5 py-3">
        <Skeleton className="h-4 w-40 max-w-full rounded-md" />
      </td>
      <td className="px-5 py-3">
        <Skeleton className="h-4 w-24 rounded-md" />
      </td>
      <td className="px-5 py-3">
        <Skeleton className="h-4 w-20 rounded-md" />
      </td>
      <td className="px-5 py-3">
        <Skeleton className="h-5 w-16 rounded-lg" />
      </td>
      <td className="px-5 py-3">
        <Skeleton className="size-7 rounded-lg" />
      </td>
    </tr>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Empty states                                */
/* -------------------------------------------------------------------------- */

function EmptyState({
  filtered,
  onClearFilters,
}: {
  filtered: boolean;
  onClearFilters: () => void;
}) {
  const Icon = filtered ? SearchX : UsersRound;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon className="size-7" />
      </span>
      <p className="mt-5 text-sm font-medium">
        {filtered ? "No staff match your filters" : "No staff yet"}
      </p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {filtered
          ? "Try a different name or employee code, or clear the filters to see everyone."
          : "No staff yet — add your first staff member to get the roster started."}
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

export default function StaffPage() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [departmentFilter, setDepartmentFilter] =
    React.useState<string>(ALL_DEPARTMENTS);
  const [page, setPage] = React.useState(1);

  const [result, setResult] = React.useState<LoadResult | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [departments, setDepartments] = React.useState<Department[]>([]);

  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | number | null>(null);
  const [deleting, setDeleting] = React.useState<StaffMember | null>(null);
  const deletingName = deleting
    ? `${deleting.first_name} ${deleting.last_name}`.trim()
    : "";

  // Typing is cheap; requests are not. Only the settled value drives the fetch.
  React.useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [search]);

  // Departments feed both the filter and the Department column, and change
  // rarely — one fetch, kept for the life of the page.
  React.useEffect(() => {
    let cancelled = false;

    listDepartments()
      .then((loaded) => {
        if (!cancelled) setDepartments(loaded);
      })
      .catch(() => {
        // Non-fatal: the filter hides itself and the column falls back to "—".
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Identifies the request the current filters ask for. Loading is then simply
  // "what we hold isn't what we asked for" — no loading flag to keep in sync.
  const queryKey = [
    page,
    debouncedSearch.trim(),
    departmentFilter,
    reloadKey,
  ].join(" ");

  React.useEffect(() => {
    let cancelled = false;

    listStaff({
      page,
      per_page: PER_PAGE,
      search: debouncedSearch,
      department_id: departmentFilter === ALL_DEPARTMENTS ? "" : departmentFilter,
    })
      .then((loaded) => {
        if (cancelled) return;
        setResult({
          key: queryKey,
          staff: loaded.items,
          meta: loaded.meta,
          error: null,
        });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setResult({
          key: queryKey,
          staff: [],
          meta: null,
          error:
            cause instanceof Error
              ? cause.message
              : "Something went wrong while loading staff.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [queryKey, page, debouncedSearch, departmentFilter]);

  const isLoading = result?.key !== queryKey;
  const staff = result?.staff ?? [];
  const meta = result?.meta ?? null;
  // A stale error belongs to filters the user has already moved on from.
  const error = result?.key === queryKey ? result.error : null;

  function departmentName(id: string | number | null | undefined): string {
    if (id == null) return "—";
    const match = departments.find((department) => sameId(department.id, id));
    return match?.name ?? "—";
  }

  // Filters narrow the result set, so any change invalidates the page number.
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleDepartmentChange(value: string) {
    setDepartmentFilter(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setDepartmentFilter(ALL_DEPARTMENTS);
    setPage(1);
  }

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  /**
   * A new staff member would be invisible behind an active search or a later
   * page, so drop back to an unfiltered first page — then the row is right there.
   */
  function handleCreated() {
    clearFilters();
    refresh();
  }

  const isFiltered =
    debouncedSearch.trim() !== "" || departmentFilter !== ALL_DEPARTMENTS;
  const showSkeleton = isLoading && staff.length === 0;
  const isRefreshing = isLoading && staff.length > 0;

  const total = meta?.total ?? 0;
  const totalPages = Math.max(1, meta?.total_pages ?? 1);
  const currentPage = meta?.page ?? page;
  const perPage = meta?.per_page || PER_PAGE;
  const firstOnPage = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const lastOnPage = Math.min(currentPage * perPage, total);

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Staff
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta && !error
              ? `${formatNumber(total)} ${
                  total === 1 ? "person" : "people"
                } on the roster.`
              : "Teachers and support staff at your school, in one place."}
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => setIsAddOpen(true)}
          className="rounded-xl shadow-brand transition-all hover:bg-brand-700 hover:shadow-lift"
        >
          <Plus className="size-4" />
          Add Staff
        </Button>
      </div>

      <StaffFormDialog
        mode="create"
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSaved={handleCreated}
      />

      <StaffFormDialog
        mode="edit"
        staffId={editingId}
        open={editingId != null}
        onOpenChange={(next) => {
          if (!next) setEditingId(null);
        }}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        title="Remove this staff member?"
        description={
          <>
            {deleting ? deletingName : "This person"} will be taken off the
            roster. The record is kept on file, so this can be undone by your
            administrator.
          </>
        }
        confirmLabel="Remove staff member"
        pendingLabel="Removing"
        errorTitle="Could not remove the staff member"
        onConfirm={async () => {
          if (!deleting) return;
          await deleteStaff(deleting.id);
          toast.success("Staff member removed", {
            description: deletingName + " has been taken off the roster.",
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
              We couldn&rsquo;t load your staff
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
                placeholder="Search by name, code or email"
                aria-label="Search staff"
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
              value={departmentFilter}
              onValueChange={handleDepartmentChange}
              disabled={departments.length === 0}
            >
              <SelectTrigger
                aria-label="Filter by department"
                className="h-9 w-full rounded-xl sm:w-48"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={String(department.id)}>
                    {department.name}
                  </SelectItem>
                ))}
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
          {!showSkeleton && staff.length === 0 ? (
            <EmptyState filtered={isFiltered} onClearFilters={clearFilters} />
          ) : (
            <div className="overflow-x-auto">
              <table
                className={`w-full min-w-[58rem] border-collapse text-left transition-opacity ${
                  isRefreshing ? "opacity-60" : "opacity-100"
                }`}
              >
                <TableHead />
                <tbody className="divide-y">
                  {showSkeleton
                    ? Array.from({ length: 6 }, (_, index) => (
                        <SkeletonRow key={index} />
                      ))
                    : staff.map((member) => (
                        <StaffRow
                          key={member.id}
                          member={member}
                          departmentName={departmentName(member.department_id)}
                          onEdit={(target) => setEditingId(target.id)}
                          onDelete={setDeleting}
                        />
                      ))}
                </tbody>
              </table>
            </div>
          )}

          {/* --------------------------- Pagination --------------------------- */}
          <CardFooter className="flex-wrap justify-between gap-3">
            <p className="text-xs text-muted-foreground tabular-nums">
              {showSkeleton
                ? "Loading staff…"
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
