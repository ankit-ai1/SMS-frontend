"use client";

import * as React from "react";
import { Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { listStaff, listStudents } from "@/lib/api";
import { initialsFrom } from "@/lib/format";

const SEARCH_DEBOUNCE_MS = 350;
const MAX_RESULTS = 6;

export type LinkedEntity = {
  id: string | number;
  type: "student" | "staff";
  label: string;
  subtitle: string;
};

/**
 * Searches the student or staff directory and returns the picked person as
 * `linked_entity_id` + `linked_entity_type`. Optional throughout — a user
 * account works perfectly well without one.
 */
export function EntityPicker({
  kind,
  value,
  onChange,
  disabled,
}: {
  kind: "student" | "staff";
  value: LinkedEntity | null;
  onChange: (entity: LinkedEntity | null) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [results, setResults] = React.useState<LinkedEntity[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Typing is cheap; requests are not. Only the settled value drives the fetch.
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const query = debounced.trim();

  React.useEffect(() => {
    if (query.length < 2) return;
    let cancelled = false;

    const request =
      kind === "staff"
        ? listStaff({ search: query, per_page: MAX_RESULTS }).then((page) =>
            page.items.map<LinkedEntity>((member) => ({
              id: member.id,
              type: "staff",
              label: `${member.first_name} ${member.last_name}`.trim(),
              subtitle: member.employee_code || member.email || "",
            }))
          )
        : listStudents({ search: query, per_page: MAX_RESULTS }).then((page) =>
            page.items.map<LinkedEntity>((student) => ({
              id: student.id,
              type: "student",
              label: `${student.first_name} ${student.last_name}`.trim(),
              subtitle: student.admission_number || "",
            }))
          );

    request
      .then((loaded) => {
        if (cancelled) return;
        setResults(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setResults([]);
        setError(
          cause instanceof Error ? cause.message : "Could not search just now."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [query, kind]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-muted/25 px-3 py-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[0.7rem] font-semibold text-brand-700">
          {initialsFrom(value.label)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{value.label}</p>
          <p className="truncate text-xs text-muted-foreground">
            {value.subtitle || (value.type === "staff" ? "Staff" : "Student")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          aria-label="Unlink this person"
          className="flex size-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  const isSearching = query.length >= 2 && results === null;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            kind === "staff"
              ? "Search staff by name or code"
              : "Search students by name or admission number"
          }
          autoComplete="off"
          disabled={disabled}
          className="h-9 rounded-xl pr-9 pl-9"
        />
        {isSearching && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : query.length > 0 && query.length < 2 ? (
        <p className="text-xs text-muted-foreground">
          Type at least two characters to search.
        </p>
      ) : results && results.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nobody matched &ldquo;{query}&rdquo;.
        </p>
      ) : results && results.length > 0 ? (
        <ul className="max-h-52 space-y-1 overflow-y-auto rounded-xl border p-1">
          {results.map((entity) => (
            <li key={`${entity.type}-${entity.id}`}>
              <button
                type="button"
                onClick={() => onChange(entity)}
                disabled={disabled}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-muted disabled:pointer-events-none"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[0.65rem] font-semibold text-brand-700">
                  {initialsFrom(entity.label)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{entity.label}</span>
                  {entity.subtitle && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {entity.subtitle}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
