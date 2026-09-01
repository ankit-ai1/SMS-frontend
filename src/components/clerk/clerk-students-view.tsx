"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  GraduationCap,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
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
  deleteStudent,
  listStudents,
  type Gender,
  type PageMeta,
  type Student,
} from "@/lib/api";
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

const COLUMNS = [
  { key: "admission", label: "Admission No", className: "w-[9rem]" },
  { key: "name", label: "Name", className: "" },
  { key: "gender", label: "Gender", className: "w-[7rem]" },
  { key: "dob", label: "Date of Birth", className: "w-[10rem]" },
  { key: "status", label: "Status", className: "w-[7rem]" },
  { key: "actions", label: "Actions", className: "w-[4.5rem]", hidden: true },
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
            <span className={column.hidden ? "sr-only" : undefined}>
              {column.label}
            </span>
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

function StudentRow({
  student,
  onEdit,
  onDelete,
}: {
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}) {
  const router = useRouter();
  const fullName = `${student.first_name} ${student.last_name}`.trim();
  const href = `/clerk/students/${student.id}`;

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
            <DropdownMenuItem onSelect={() => onEdit(student)}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onDelete(student)}
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
          : "No students yet — add your first student to get the roll started."}
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

export function ClerkStudentsView() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState<GenderFilter>("all");
  const [page, setPage] = React.useState(1);

  const [result, setResult] = React.useState<LoadResult | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | number | null>(null);
  const [deleting, setDeleting] = React.useState<Student | null>(null);
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

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  /**
   * A new student would be invisible behind an active search or a later page,
   * so drop back to an unfiltered first page — then the row is right there.
   */
  function handleCreated() {
    clearFilters();
    refresh();
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
      {/* ------------------------------ Header ------------------------------ */}
      <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden rounded-3xl border border-white/70 bg-card/64 px-5 py-5 shadow-card backdrop-blur-xl sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(24rem_14rem_at_0%_0%,var(--brand-100),transparent_70%)] opacity-70"
        />
        <div className="relative">
          <h2 className="text-2xl font-black sm:text-3xl">Students</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {meta && !error
              ? `${formatNumber(total)} ${
                  total === 1 ? "student" : "students"
                } on the roll.`
              : "Everyone enrolled at your school, in one place."}
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => setIsAddOpen(true)}
          className="relative rounded-2xl"
        >
          <Plus className="size-4" />
          Add Student
        </Button>
      </div>

      <StudentFormDialog
        mode="create"
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSaved={handleCreated}
      />

      <StudentFormDialog
        mode="edit"
        studentId={editingId}
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
        title="Remove this student?"
        description={
          <>
            {deleting ? deletingName : "This student"} will be taken off the
            roll. The record is kept on file, so this can be undone by your
            administrator.
          </>
        }
        confirmLabel="Remove student"
        pendingLabel="Removing"
        errorTitle="Could not remove the student"
        onConfirm={async () => {
          if (!deleting) return;
          await deleteStudent(deleting.id);
          toast.success("Student removed", {
            description: deletingName + " has been taken off the roll.",
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
              We couldn&rsquo;t load your students
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
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
                        <StudentRow
                          key={student.id}
                          student={student}
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
