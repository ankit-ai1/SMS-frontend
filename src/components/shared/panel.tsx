"use client";

import type * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The card every detail-page section sits in: an icon-led header bar with an
 * optional action, then a full-bleed body so list rows can carry dividers.
 */
export function Panel({
  title,
  description,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 py-0 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[linear-gradient(135deg,oklch(1_0_0_/_0.82),var(--muted))] px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-soft ring-1 ring-brand-100">
              <Icon className="size-4.5" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-bold">{title}</h3>
            {description && (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

/**
 * A label/value tile for the read-only detail grids. Tiles rather than bare
 * text: the field boundaries stay legible when values are short or missing.
 */
export function DetailItem({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value?: string | null;
  icon?: LucideIcon;
  className?: string;
}) {
  const isEmpty = !value;

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/70 bg-card/72 px-4 py-3.5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand-100 hover:bg-card hover:shadow-card",
        className
      )}
    >
      <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 truncate text-sm font-semibold",
          isEmpty && "text-muted-foreground/70 italic"
        )}
        title={value ?? undefined}
      >
        {value || "Not recorded"}
      </p>
    </div>
  );
}

/**
 * Edit/delete for a list row. Held back until hover on pointer devices — the
 * Linear/Notion pattern — but always visible on touch, where there is no hover.
 */
export function RowActions({
  label,
  onEdit,
  onDelete,
}: {
  /** Names the subject of the actions for screen readers, e.g. the row title. */
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100">
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-lg text-muted-foreground hover:text-foreground"
        aria-label={`Edit ${label}`}
        onClick={onEdit}
      >
        <Pencil className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Delete ${label}`}
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
