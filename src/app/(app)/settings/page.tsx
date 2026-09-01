"use client";

import * as React from "react";
import { Building2, SlidersHorizontal, UserRound } from "lucide-react";

import { AdvancedSettingsTab } from "@/components/settings/advanced-settings-tab";
import { ProfileTab } from "@/components/settings/profile-tab";
import { SchoolSettingsTab } from "@/components/settings/school-settings-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listSettings, type SettingEntry } from "@/lib/api";

const TABS = [
  { value: "school", label: "School", icon: Building2 },
  { value: "advanced", label: "Advanced", icon: SlidersHorizontal },
  { value: "profile", label: "Profile", icon: UserRound },
];

export default function SettingsPage() {
  const [entries, setEntries] = React.useState<SettingEntry[]>([]);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  // Both settings tabs read the same key/value store, so it is fetched once
  // here and a save on either tab refreshes both.
  React.useEffect(() => {
    let cancelled = false;

    listSettings()
      .then((loaded) => {
        if (cancelled) return;
        setEntries(loaded);
        setIsLoaded(true);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading settings."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // The confirmation fades on its own so it never becomes part of the furniture.
  React.useEffect(() => {
    if (savedAt === null) return;
    const timer = setTimeout(() => setSavedAt(null), 5000);
    return () => clearTimeout(timer);
  }, [savedAt]);

  function reload() {
    setError(null);
    setReloadKey((key) => key + 1);
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Settings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          School details, stored configuration, and your own account.
        </p>
      </div>

      <Tabs defaultValue="school" className="gap-5">
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

        <TabsContent value="school">
          <SchoolSettingsTab
            entries={entries}
            isLoaded={isLoaded}
            error={error}
            savedAt={savedAt}
            onRetry={reload}
            onSaved={() => {
              setSavedAt(Date.now());
              setReloadKey((key) => key + 1);
            }}
          />
        </TabsContent>

        <TabsContent value="advanced">
          <AdvancedSettingsTab
            entries={entries}
            isLoaded={isLoaded}
            error={error}
            onRetry={reload}
            onSaved={() => setReloadKey((key) => key + 1)}
          />
        </TabsContent>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
