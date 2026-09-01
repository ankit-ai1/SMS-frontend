"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Loader2,
  Search,
  SearchX,
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
import { listStudents, type Gender, type PageMeta, type Student } from "@/lib/api";
import { formatDate, formatNumber, humanizeToken, initialsFrom } from "@/lib/format";

const PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 350;

type GenderFilter = "all" | Gender;

/** One page of students plus the query it answers — see `queryKey` below. */
type LoadResult = {
  key: string;
  students: Student[];
  meta: PageMeta | null;
  error: string | null;
};

/* -------------------------------------------------------------------------- */
/*                                Table pieces                                */
/* -------------------------------------------------------------------------- */

/**
 * The admin table without its Actions column: a principal opens a record but
 * never edits or removes one, so the column would only hold dead controls.
 */
const COLUMNS = [
  { key: "admission", label: "Admission No", className: "w-[9rem]" },
  { key: "name", label: "Name", className: "" },
  { key: "gender", label: "Gender", className: "w-[7rem]" },
  { key: "dob", label: "Date of Birth", className: "w-[10rem]" },
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

export function StudentStatusBadge({ isActive }: { isActive: boolean }) {
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

function StudentRow({ student }: { student: Student }) {
  const router = useRouter();
  const fullName = `${student.first_name} ${student.last_name}`.trim();
  const href = `/principal/students/${student.id}`;

  return (
    <tr
      onClick={() => router.push(href)}
      className="cursor-pointer transition-all hover:bg-brand-50/45"
    >
      <td className="px-5 py-3">
        <span className="text-sm font-semibold tabular-nums">
          {student.admission_number || "—"}
        </span>
      </td>

      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-[0.7rem] font-bold text-brand-700 shadow-soft ring-1 ring-brand-100">
            {initialsFrom(fullName)}
          </span>
          {/* A real link as well as the row click, so keyboard and screen
              readers get the same destination. */}
          <Link
            href={href}
            onClick={(event) => event.stopPropagation()}
            className="truncate rounded-md text-sm font-bold outline-none hover:text-brand-700 hover:underline focus-visible:ring-3 focus-visible:ring-ring/35"
          >
            {fullName || "—"}
          </Link>
        </div>
      </td>

      <td className="px-5 py-3 text-sm text-muted-foreground">
        {humanizeToken(student.gender) || "—"}
      </td>

      <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">
        {formatDate(student.date_of_birth)}
      </td>

      <td className="px-5 py-3">
        <StudentStatusBadge isActive={student.is_active} />
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
        <Skeleton className="h-4 w-14 rounded-md" />
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
  const Icon = filtered ? SearchX : GraduationCap;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-600 shadow-soft ring-1 ring-brand-100">
        <Icon className="size-7" />
      </span>
      <p className="mt-5 text-sm font-bold">
        {filtered ? "No students match your filters" : "No students yet"}
      </p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {filtered
          ? "Try a different name or admission number, or clear the filters to see everyone."
          : "Nobody is on the roll yet. Students added by the office will appear here."}
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

export function PrincipalStudentsView() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState<GenderFilter>("all");
  const [page, setPage] = React.useState(1);

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

  // Identifies the request the current filters ask for. Loading is then simply
  // "what we hold isn't what we asked for" — no loading flag to keep in sync.
  const queryKey = [page, debouncedSearch.trim(), genderFilter, reloadKey].join(
    " "
  );

  React.useEffect(() => {
    let cancelled = false;

    listStudents({
      page,
      per_page: PER_PAGE,
      search: debouncedSearch,
      gender: genderFilter === "all" ? "" : genderFilter,
    })
      .then((loaded) => {
        if (cancelled) return;
        setResult({
          key: queryKey,
          students: loaded.items,
          meta: loaded.meta,
          error: null,
        });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setResult({
          key: queryKey,
          students: [],
          meta: null,
          error:
            cause instanceof Error
              ? cause.message
              : "Something went wrong while loading students.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [queryKey, page, debouncedSearch, genderFilter]);

  const isLoading = result?.key !== queryKey;
  const students = result?.students ?? [];
  const meta = result?.meta ?? null;
  // A stale error belongs to filters the user has already moved on from.
  const error = result?.key === queryKey ? result.error : null;

  // Filters narrow the result set, so any change invalidates the page number.
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleGenderChange(value: GenderFilter) {
    setGenderFilter(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setGenderFilter("all");
    setPage(1);
  }

  const isFiltered = debouncedSearch.trim() !== "" || genderFilter !== "all";
  const showSkeleton = isLoading && students.length === 0;
  const isRefreshing = isLoading && students.length > 0;

  const total = meta?.total ?? 0;
  const totalPages = Math.max(1, meta?.total_pages ?? 1);
  const currentPage = meta?.page ?? page;
  const perPage = meta?.per_page || PER_PAGE;
  const firstOnPage = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const lastOnPage = Math.min(currentPage * perPage, total);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description={
          meta && !error
            ? `${formatNumber(total)} ${
                total === 1 ? "student" : "students"
              } on the roll, across every class.`
            : "Everyone enrolled at your school, in one place."
        }
        action={<ViewOnlyChip />}
      />

      {error ? (
        <LoadErrorCard
          title="We couldn't load your students"
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
                placeholder="Search by name or admission number"
                aria-label="Search students"
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

            <Select value={genderFilter} onValueChange={handleGenderChange}>
              <SelectTrigger
                aria-label="Filter by gender"
                className="h-10 w-full rounded-2xl sm:w-40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
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
          {!showSkeleton && students.length === 0 ? (
            <EmptyState filtered={isFiltered} onClearFilters={clearFilters} />
          ) : (
            <div className="overflow-x-auto">
              <table
                className={`w-full min-w-[44rem] border-collapse text-left transition-opacity ${
                  isRefreshing ? "opacity-60" : "opacity-100"
                }`}
              >
                <TableHead />
                <tbody className="divide-y">
                  {showSkeleton
                    ? Array.from({ length: 6 }, (_, index) => (
                        <SkeletonRow key={index} />
                      ))
                    : students.map((student) => (
                        <StudentRow key={student.id} student={student} />
                      ))}
                </tbody>
              </table>
            </div>
          )}

          {/* --------------------------- Pagination --------------------------- */}
          <CardFooter className="flex-wrap justify-between gap-3">
            <p className="text-xs text-muted-foreground tabular-nums">
              {showSkeleton
                ? "Loading students…"
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
