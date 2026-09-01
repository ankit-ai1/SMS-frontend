"use client";

import * as React from "react";

import {
  getCurrentAcademicYear,
  listClasses,
  listSections,
  type AcademicYear,
  type SchoolClass,
  type Section,
} from "@/lib/api";

export type ClerkScope = {
  /** Null when no year is flagged current — sections hang off one. */
  year: AcademicYear | null;
  classes: SchoolClass[];
  sections: Section[];
};

/**
 * The office counterpart to `useTeacherScope`. A clerk works across the whole
 * school rather than their own classes, so the section list is the full one for
 * the current year — there is nothing to narrow it by.
 *
 * A school with no current year resolves to empty lists rather than an error,
 * so the screens can show the "no academic year" state instead of a failure.
 */
export function useClerkScope() {
  const [scope, setScope] = React.useState<ClerkScope | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    async function load(): Promise<ClerkScope> {
      const [year, classes] = await Promise.all([
        getCurrentAcademicYear(),
        listClasses(),
      ]);
      if (!year) return { year: null, classes, sections: [] };
      return { year, classes, sections: await listSections(year.id) };
    }

    load()
      .then((loaded) => {
        if (cancelled) return;
        setScope(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading your school."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = React.useCallback(() => {
    setError(null);
    setScope(null);
    setReloadKey((key) => key + 1);
  }, []);

  return { scope, error, reload };
}

/** The year chip every clerk screen carries in its header. */
export function yearLabel(year: AcademicYear | null | undefined): string {
  if (!year) return "";
  return year.name?.trim() || `Year ${year.id}`;
}
