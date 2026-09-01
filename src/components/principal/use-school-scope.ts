"use client";

import * as React from "react";

import {
  getCurrentAcademicYear,
  listClasses,
  listSections,
  listTerms,
  type AcademicYear,
  type SchoolClass,
  type Section,
  type Term,
} from "@/lib/api";

export type SchoolScope = {
  /** Null when no year is flagged current — the screens say so rather than guessing. */
  year: AcademicYear | null;
  /** Every section in the school. A principal has no class filter to apply. */
  sections: Section[];
  classes: SchoolClass[];
  terms: Term[];
};

/**
 * The whole-school counterpart to `useTeacherScope`. Where a teacher resolves
 * their own sections from `/sections/mine`, a principal reads the full list for
 * the current academic year: the role is school-wide, so there is nothing to
 * narrow it by.
 *
 * Sections and terms both hang off the current year, so a school with no
 * current year resolves to empty lists rather than an error — the screens then
 * show the "no academic year" state instead of a failure.
 */
export function useSchoolScope() {
  const [scope, setScope] = React.useState<SchoolScope | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    async function load(): Promise<SchoolScope> {
      const [year, classes] = await Promise.all([
        getCurrentAcademicYear(),
        listClasses(),
      ]);
      if (!year) return { year: null, classes, sections: [], terms: [] };

      const [sections, terms] = await Promise.all([
        listSections(year.id),
        listTerms(year.id),
      ]);
      return { year, classes, sections, terms };
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

/** The year chip every principal screen carries in its header. */
export function yearLabel(year: AcademicYear | null | undefined): string {
  if (!year) return "";
  return year.name?.trim() || `Year ${year.id}`;
}
