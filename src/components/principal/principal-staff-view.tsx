"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  SearchX,
  UsersRound,
  X,
} from "lucide-react";

import {
  LoadErrorCard,
  PageHeader,
  ViewOnlyChip,
} from "@/components/principal/principal-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
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

/** The admin table without its Actions column — a principal only reads it. */
const COLUMNS = [
  { key: "code", label: "Employee Code", className: "w-[10rem]" },
  { key: "name", label: "Name", className: "" },
  { key: "email", label: "Email", className: "w-[14rem]" },
  { key: "phone", label: "Phone", className: "w-[10rem]" },
  { key: "department", label: "Department", className: "w-[10rem]" },
  { key: "status", label: "Status", className: "w-[7rem]" },
];

function TableHead() {
  return (
    <thead>
      <tr className="border-b bg-[linear-gradient(180deg,var(--muted),oklch(1_0_0_/_0.38))]">
        {COLUMNS.map((column) => (
          <th
            key={column.key}
            scope="col"
            className={`px-5 py-3.5 text-left text-xs font-bold tracking-wide text-muted-foreground uppercase ${column.className}`}
          >
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-medium ring-1 ${
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/20"
          : "bg-muted text-muted-foreground ring-border"
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
}: {
  member: StaffMember;
  departmentName: string;
}) {
  const fullName = `${member.first_name} ${member.last_name}`.trim();

  return (
    <tr className="transition-colors hover:bg-brand-50/45">
      <td className="px-5 py-3">
        <span className="text-sm font-semibold tabular-nums">
          {member.employee_code || "—"}
        </span>
      </td>

      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-[0.7rem] font-bold text-brand-700 shadow-soft ring-1 ring-brand-100">
            {initialsFrom(fullName)}
          </span>
          <span className="truncate text-sm font-bold">{fullName || "—"}</span>
        </div>
      </td>

      <td className="px-5 py-3 text-sm text-muted-foreground">
        <span className="block truncate">{member.email || "—"}</span>
      </td>

      <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">
        {member.phone || "—"}
      </td>

      <td className="px-5 py-3 text-sm text-muted-foreground">
        <span className="block truncate">{departmentName || "—"}</span>
      </td>

      <td className="px-5 py-3">
        <StatusBadge isActive={member.is_active} />
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
          <Skeleton className="h-4 w-40 max-w-full rounded-md" />
        </div>
      </td>
      <td className="px-5 py-3">
        <Skeleton className="h-4 w-36 max-w-full rounded-md" />
      </td>
      <td className="px-5 py-3">
        <Skeleton className="h-4 w-24 rounded-md" />
      </td>
      <td className="px-5 py-3">
        <Skeleton className="h-4 w-24 rounded-md" />
      </td>
      <td className="px-5 py-3">
        <Skeleton className="h-5 w-16 rounded-lg" />
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
  const Icon = filtered ? SearchX : UsersRound;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-600 shadow-soft ring-1 ring-brand-100">
        <Icon className="size-7" />
      </span>
      <p className="mt-5 text-sm font-bold">
        {filtered ? "No staff match your filters" : "No staff yet"}
      </p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {filtered
          ? "Try a different name or employee code, or clear the filters to see everyone."
          : "Staff added by the school office will appear here."}
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
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function PrincipalStaffView() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState(ALL_DEPARTMENTS);
  const [page, setPage] = React.useState(1);

  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [result, setResult] = React.useState<LoadResult | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Typing is cheap; requests are not. Only the settled value drives the fetch.
  React.useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [search]);

  // Departments only label rows and feed the filter, so a failure is not fatal.
  React.useEffect(() => {
    let cancelled = false;

    listDepartments()
      .then((loaded) => {
        if (!cancelled) setDepartments(loaded);
      })
      .catch(() => {
        if (!cancelled) setDepartments([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const queryKey = [page, debouncedSearch.trim(), departmentId, reloadKey].join(
    " "
  );

  React.useEffect(() => {
    let cancelled = false;

    listStaff({
      page,
      per_page: PER_PAGE,
      search: debouncedSearch,
      department_id: departmentId === ALL_DEPARTMENTS ? "" : departmentId,
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
  }, [queryKey, page, debouncedSearch, departmentId]);

  const isLoading = result?.key !== queryKey;
  const staff = result?.staff ?? [];
  const meta = result?.meta ?? null;
  const error = result?.key === queryKey ? result.error : null;

  function departmentName(id: StaffMember["department_id"]): string {
    const match = departments.find((department) => sameId(department.id, id));
    return match?.name?.trim() ?? "";
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleDepartmentChange(value: string) {
    setDepartmentId(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setDepartmentId(ALL_DEPARTMENTS);
    setPage(1);
  }

  const isFiltered =
    debouncedSearch.trim() !== "" || departmentId !== ALL_DEPARTMENTS;
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
      <PageHeader
        title="Staff"
        description={
          meta && !error
            ? `${formatNumber(total)} ${
                total === 1 ? "person" : "people"
              } on the payroll, across every department.`
            : "Everyone employed at your school, in one place."
        }
        action={<ViewOnlyChip />}
      />

      {error ? (
        <LoadErrorCard
          title="We couldn't load your staff"
          message={error}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : (
        <Card className="gap-0 py-0 shadow-card">
          {/* ----------------------------- Toolbar ---------------------------- */}
          <div className="flex flex-col gap-3 border-b bg-card/45 p-4 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search by name, code or email"
                aria-label="Search staff"
                className="h-10 rounded-2xl pr-9 pl-9"
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

            <Select value={departmentId} onValueChange={handleDepartmentChange}>
              <SelectTrigger
                aria-label="Filter by department"
                className="h-10 w-full rounded-2xl sm:w-52"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={String(department.id)}>
                    {department.name?.trim() || `Department ${department.id}`}
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
                  className="rounded-xl px-2 py-1 font-bold transition-colors hover:bg-muted hover:text-foreground"
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
                className={`w-full min-w-[52rem] border-collapse text-left transition-opacity ${
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
                className="rounded-2xl"
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
                className="rounded-2xl"
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
