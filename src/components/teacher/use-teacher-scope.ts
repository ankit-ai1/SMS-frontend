"use client";

import * as React from "react";

import {
  getCurrentAcademicYear,
  listMySections,
  type AcademicYear,
  type Section,
} from "@/lib/api";

export type TeacherScope = {
  /** Only for labelling and for scoping the exam list — never for the sections. */
  year: AcademicYear | null;
  /** Exactly the sections assigned to this teacher. */
  sections: Section[];
};

/**
 * Resolves which sections a teacher owns, from `/sections/mine` — the backend
 * scopes it to the bearer token, so the list is right whether or not they have
 * a class today. An empty list means genuinely unassigned, and the screens say
 * so rather than falling back to a wider list.
 *
 * The current academic year is fetched alongside for the year chip and for the
 * exam list on the grades screen. It never gates the sections: a teacher with
 * sections can work even if no year is flagged current.
 */
export function useTeacherScope() {
  const [scope, setScope] = React.useState<TeacherScope | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([
      listMySections(),
      // A missing current year costs a label, not the section list.
      getCurrentAcademicYear().catch(() => null),
    ])
      .then(([sections, year]) => {
        if (cancelled) return;
        setScope({ year, sections });
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading your classes."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = React.useCallback(() => {
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  return { scope, error, reload };
}
