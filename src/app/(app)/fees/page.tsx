"use client";

import * as React from "react";
import { CalendarRange, RefreshCw, Settings2, TriangleAlert, Wallet } from "lucide-react";

import { CategoriesPanel } from "@/components/fees/categories-panel";
import { CollectionsTab } from "@/components/fees/collections-tab";
import { DiscountsPanel } from "@/components/fees/discounts-panel";
import { StructuresPanel } from "@/components/fees/structures-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const TABS = [
  { value: "setup", label: "Fee Setup", icon: Settings2 },
  { value: "collections", label: "Collections", icon: Wallet },
];

type Context = {
  year: AcademicYear | null;
  classes: SchoolClass[];
  sections: Section[];
};

function ContextSkeleton() {
  return (
    <Card className="gap-0 py-0 shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b bg-muted/25 px-4 py-3.5">
        <Skeleton className="size-9 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-56 max-w-full rounded-md" />
        </div>
      </div>
      <div className="space-y-3 p-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </Card>
  );
}

export default function FeesPage() {
  const [context, setContext] = React.useState<Context | null>(null);
  const [contextError, setContextError] = React.useState<string | null>(null);
  const [contextKey, setContextKey] = React.useState(0);

  // The two setup lists other panels depend on are held here, so adding a
  // category is immediately selectable when building a structure.
  const [categories, setCategories] = React.useState<FeeCategory[] | null>(null);
  const [categoriesError, setCategoriesError] = React.useState<string | null>(
    null
  );
  const [discounts, setDiscounts] = React.useState<FeeDiscount[] | null>(null);
  const [discountsError, setDiscountsError] = React.useState<string | null>(
    null
  );
  const [setupKey, setSetupKey] = React.useState(0);

  const [sectionId, setSectionId] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    async function load(): Promise<Context> {
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
        setContext(loaded);
        setContextError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setContextError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading your fee setup."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [contextKey]);

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

  function reloadSetup() {
    setSetupKey((key) => key + 1);
  }

  const yearName =
    context?.year?.name?.trim() ||
    (context?.year ? `Year ${context.year.id}` : "");

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Fees
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set what each class is charged, then collect against it.
          </p>
        </div>

        {yearName && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
            <CalendarRange className="size-3.5" />
            {yearName}
          </span>
        )}
      </div>

      {contextError ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" />
            </span>
            <p className="mt-4 text-sm font-medium">
              We couldn&rsquo;t load your fee setup
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {contextError}
            </p>
            <Button
              size="lg"
              onClick={() => {
                setContextError(null);
                setContextKey((key) => key + 1);
              }}
              className="mt-5 rounded-xl shadow-brand transition-all hover:bg-brand-700 hover:shadow-lift"
            >
              <RefreshCw className="size-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : !context ? (
        <ContextSkeleton />
      ) : !context.year ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <CalendarRange className="size-6" />
            </span>
            <p className="mt-4 text-sm font-medium">No academic year set up</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Fee structures and allocations are tied to an academic year. Add
              one before setting up fees.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="setup" className="gap-5">
          {/* The list keeps its natural width; the wrapper scrolls when narrow. */}
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="w-max gap-0.5 rounded-xl p-1">
              {TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="gap-2 rounded-lg px-3.5 data-active:text-brand-700 dark:data-active:text-brand-300"
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="setup" className="space-y-6">
            <CategoriesPanel
              categories={categories}
              error={categoriesError}
              onRetry={reloadSetup}
              onChanged={reloadSetup}
            />

            <StructuresPanel
              categories={categories ?? []}
              classes={context.classes}
              academicYearId={context.year.id}
            />

            <DiscountsPanel
              discounts={discounts}
              error={discountsError}
              onRetry={reloadSetup}
              onChanged={reloadSetup}
            />
          </TabsContent>

          <TabsContent value="collections">
            <CollectionsTab
              sections={context.sections}
              sectionId={sectionId}
              onSectionChange={setSectionId}
              year={context.year}
              classes={context.classes}
              discounts={discounts ?? []}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
