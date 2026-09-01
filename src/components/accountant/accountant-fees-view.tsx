"use client";

import * as React from "react";
import { Settings2, Wallet } from "lucide-react";

import {
  LoadErrorCard,
  NoYearCard,
  PageHeader,
  ScopeSkeleton,
} from "@/components/accountant/accountant-chrome";
import {
  useFinanceScope,
  yearLabel,
} from "@/components/accountant/use-finance-scope";
import { CategoriesPanel } from "@/components/fees/categories-panel";
import { CollectionsTab } from "@/components/fees/collections-tab";
import { DiscountsPanel } from "@/components/fees/discounts-panel";
import { StructuresPanel } from "@/components/fees/structures-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "setup", label: "Fee Setup", icon: Settings2 },
  { value: "collections", label: "Collections", icon: Wallet },
];

/**
 * The accountant owns fees end to end, which is exactly what the admin fee
 * panels already do — so they are reused here rather than reimplemented. Only
 * the shell around them is new: this role reaches the same screens from its own
 * route and its own menu.
 */
export function AccountantFeesView() {
  const {
    scope,
    error,
    reload,
    categories,
    categoriesError,
    discounts,
    discountsError,
    reloadSetup,
  } = useFinanceScope();

  // Shared across both tabs: setting up a class then collecting from it keeps
  // the section you picked.
  const [sectionId, setSectionId] = React.useState("");

  if (error) {
    return (
      <LoadErrorCard
        title="We couldn't load your fee setup"
        message={error}
        onRetry={reload}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees"
        description="Set what each class is charged, then collect against it."
        year={yearLabel(scope?.year)}
      />

      {!scope ? (
        <ScopeSkeleton />
      ) : !scope.year ? (
        <NoYearCard description="Fee structures and allocations are tied to an academic year. Ask the office to set one as current." />
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
              classes={scope.classes}
              academicYearId={scope.year.id}
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
              sections={scope.sections}
              sectionId={sectionId}
              onSectionChange={setSectionId}
              year={scope.year}
              classes={scope.classes}
              discounts={discounts ?? []}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
