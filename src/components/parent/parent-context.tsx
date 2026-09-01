"use client";

import * as React from "react";
import { Baby, RefreshCw, TriangleAlert } from "lucide-react";

import { SectionEmpty } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getParentDashboard,
  type ParentChild,
  type ParentDashboard,
} from "@/lib/api";

type ParentState =
  | { status: "loading" }
  | { status: "error"; message: string; reload: () => void }
  | {
      status: "ready";
      dashboard: ParentDashboard;
      children: ParentChild[];
      selectedChild: ParentChild | null;
      selectedChildId: string;
      setSelectedChildId: (id: string) => void;
      reload: () => void;
    };

const ParentContext = React.createContext<ParentState | null>(null);

export function useParentPortal() {
  const value = React.useContext(ParentContext);
  if (!value) {
    throw new Error("useParentPortal must be used inside ParentPortalProvider.");
  }
  return value;
}

function childName(child: ParentChild): string {
  return `${child.first_name ?? ""} ${child.last_name ?? ""}`.trim() || "Child";
}

function classLabel(child: ParentChild): string {
  return [child.class_name?.trim(), child.section_name?.trim()]
    .filter(Boolean)
    .join(" / ");
}

function ChildSelector({ state }: { state: Extract<ParentState, { status: "ready" }> }) {
  const selected = state.selectedChild;

  if (state.children.length === 0) {
    return null;
  }

  if (state.children.length === 1 && selected) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <Baby className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{childName(selected)}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {classLabel(selected) || "Class not assigned"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="mr-auto flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <Baby className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">Selected child</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              Switch between children linked to this parent account.
            </p>
          </div>
        </div>

        <Select
          value={state.selectedChildId}
          onValueChange={state.setSelectedChildId}
        >
          <SelectTrigger className="h-11 w-full rounded-xl sm:w-72">
            <SelectValue placeholder="Select child" />
          </SelectTrigger>
          <SelectContent>
            {state.children.map((child) => (
              <SelectItem key={String(child.id)} value={String(child.id)}>
                {childName(child)}
                {classLabel(child) ? ` - ${classLabel(child)}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

function ParentChrome({ state, children }: { state: ParentState; children: React.ReactNode }) {
  if (state.status === "loading") {
    return (
      <div className="space-y-6">
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-3 p-4">
            <Skeleton className="size-10 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-3 w-52 rounded-md" />
            </div>
          </CardContent>
        </Card>
        {children}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" />
          </span>
          <p className="mt-4 text-sm font-medium">
            We couldn&rsquo;t load your children
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {state.message}
          </p>
          <Button size="lg" onClick={state.reload} className="mt-5 rounded-xl">
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state.children.length === 0) {
    return (
      <Card className="shadow-card">
        <SectionEmpty
          icon={Baby}
          title="No children linked yet"
          description="Ask the school office to link your parent login to a student record."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ChildSelector state={state} />
      {children}
    </div>
  );
}

export function ParentPortalProvider({ children }: { children: React.ReactNode }) {
  const [dashboard, setDashboard] = React.useState<ParentDashboard | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = React.useState("");
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    getParentDashboard()
      .then((loaded) => {
        if (cancelled) return;
        const children = loaded.children ?? [];
        setDashboard({ ...loaded, children });
        setError(null);
        setSelectedChildId((current) =>
          current && children.some((child) => String(child.id) === current)
            ? current
            : String(children[0]?.id ?? "")
        );
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading your children."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const readyChildren = dashboard?.children ?? [];
  const selectedChild =
    readyChildren.find((child) => String(child.id) === selectedChildId) ??
    readyChildren[0] ??
    null;

  const reload = React.useCallback(() => {
    setError(null);
    setDashboard(null);
    setReloadKey((key) => key + 1);
  }, []);

  const state: ParentState = error
    ? { status: "error", message: error, reload }
    : dashboard
      ? {
          status: "ready",
          dashboard,
          children: readyChildren,
          selectedChild,
          selectedChildId: selectedChild ? String(selectedChild.id) : "",
          setSelectedChildId,
          reload,
        }
      : { status: "loading" };

  return (
    <ParentContext.Provider value={state}>
      <ParentChrome state={state}>{children}</ParentChrome>
    </ParentContext.Provider>
  );
}

export { childName, classLabel };
