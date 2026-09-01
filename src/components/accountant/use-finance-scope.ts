"use client";

import * as React from "react";

import {
  getCurrentAcademicYear,
  listClasses,
  listFeeCategories,
  listFeeDiscounts,
  listSections,
  type AcademicYear,
  type FeeCategory,
  type FeeDiscount,
  type SchoolClass,
  type Section,
} from "@/lib/api";

export type FinanceScope = {
  /** Null when no year is flagged current — fee setup is tied to one. */
  year: AcademicYear | null;
  classes: SchoolClass[];
  sections: Section[];
};

/**
 * The finance counterpart to `useTeacherScope`. Everything an accountant works
 * on hangs off the current academic year: structures are priced per class per
 * year, and allocations are made against that year's enrolments.
 *
 * The two setup lists are held here rather than in each panel because they feed
 * one another — a category added on the Fees screen has to be selectable when
 * building a structure moments later, and a discount has to be offerable at the
 * point a fee is allocated.
 */
export function useFinanceScope() {
  const [scope, setScope] = React.useState<FinanceScope | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [scopeKey, setScopeKey] = React.useState(0);

  const [categories, setCategories] = React.useState<FeeCategory[] | null>(null);
  const [categoriesError, setCategoriesError] = React.useState<string | null>(
    null
  );
  const [discounts, setDiscounts] = React.useState<FeeDiscount[] | null>(null);
  const [discountsError, setDiscountsError] = React.useState<string | null>(
    null
  );
  const [setupKey, setSetupKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    async function load(): Promise<FinanceScope> {
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
            : "Something went wrong while loading your fee setup."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [scopeKey]);

  // Categories and discounts fail independently: a broken discount list must
  // not take the structures panel down with it.
  React.useEffect(() => {
    let cancelled = false;

    listFeeCategories()
      .then((loaded) => {
        if (cancelled) return;
        setCategories(loaded);
        setCategoriesError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setCategoriesError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading fee categories."
        );
      });

    listFeeDiscounts()
      .then((loaded) => {
        if (cancelled) return;
        setDiscounts(loaded);
        setDiscountsError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setDiscountsError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading discounts."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [setupKey]);

  const reload = React.useCallback(() => {
    setError(null);
    setScope(null);
    setScopeKey((key) => key + 1);
  }, []);

  /** Re-reads the two setup lists after a category or discount is changed. */
  const reloadSetup = React.useCallback(() => {
    setSetupKey((key) => key + 1);
  }, []);

  return {
    scope,
    error,
    reload,
    categories,
    categoriesError,
    discounts,
    discountsError,
    reloadSetup,
  };
}

/** The year chip every finance screen carries in its header. */
export function yearLabel(year: AcademicYear | null | undefined): string {
  if (!year) return "";
  return year.name?.trim() || `Year ${year.id}`;
}
