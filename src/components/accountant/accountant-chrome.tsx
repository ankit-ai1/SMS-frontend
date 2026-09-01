"use client";

import type * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarRange,
  RefreshCw,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                   Header                                   */
/* -------------------------------------------------------------------------- */

/**
 * The header every finance screen opens with. The year chip sits opposite the
 * title exactly as it does on the admin fees screen, so the two read as one
 * product.
 */
export function PageHeader({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  description,
  year,
  action,
}: {
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  title: string;
  description: string;
  /** Rendered as the brand chip when present. */
  year?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-brand-600 uppercase">
            {EyebrowIcon && <EyebrowIcon className="size-4" />}
            {eyebrow}
          </div>
        )}
        <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {year && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
            <CalendarRange className="size-3.5" />
            {year}
          </span>
        )}
        {action}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   States                                   */
/* -------------------------------------------------------------------------- */

/** The full-card failure state the admin screens use, for a whole page load. */
export function LoadErrorCard({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" />
        </span>
        <p className="mt-4 text-sm font-medium">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
        <Button
          size="lg"
          onClick={onRetry}
          className="mt-5 rounded-xl shadow-brand transition-all hover:bg-brand-700 hover:shadow-lift"
        >
          <RefreshCw className="size-4" />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

/** Structures, allocations and reports all hang off a year, so they share this. */
export function NoYearCard({ description }: { description: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <CalendarRange className="size-6" />
        </span>
        <p className="mt-4 text-sm font-medium">No academic year set up</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

/** The skeleton a whole finance screen shows while its scope resolves. */
export function ScopeSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="gap-0 py-0 shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b bg-muted/25 px-4 py-3.5">
        <Skeleton className="size-9 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-56 max-w-full rounded-md" />
        </div>
      </div>
      <RowsSkeleton rows={rows} />
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Stat cards                                 */
/* -------------------------------------------------------------------------- */

export type Stat = {
  key: string;
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  /** Tailwind classes for the card — keeps each figure visually distinct. */
  tone: string;
  href?: string;
};

export function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;

  const card = (
    <Card
      className={cn(
        "group min-h-36 border-0 p-0 shadow-card ring-1 transition-all",
        stat.href && "hover:-translate-y-0.5 hover:shadow-lift",
        stat.tone
      )}
    >
      <CardContent className="flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">{stat.label}</p>
            <p className="mt-1 text-xs font-semibold opacity-65">
              {stat.helper}
            </p>
          </div>
          {stat.href && (
            <ArrowUpRight className="size-4 opacity-45 transition-opacity group-hover:opacity-90" />
          )}
        </div>
        <div className="mt-8 flex items-end justify-between gap-3">
          <p className="min-w-0 truncate text-3xl font-black tabular-nums sm:text-4xl">
            {stat.value}
          </p>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/45">
            <Icon className="size-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return stat.href ? (
    <Link
      href={stat.href}
      className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      {card}
    </Link>
  ) : (
    card
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="min-h-36 border-0 shadow-card">
      <CardContent className="p-4">
        <div className="flex justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
          <Skeleton className="size-9 rounded-2xl" />
        </div>
        <Skeleton className="mt-10 h-9 w-28 rounded-md" />
      </CardContent>
    </Card>
  );
}

/** Placeholder rows for a list panel that is still loading. */
export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="divide-y">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="size-9 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-[55%] rounded-md" />
            <Skeleton className="h-3 w-56 max-w-[75%] rounded-md" />
          </div>
          <Skeleton className="h-6 w-20 rounded-lg" />
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Totals                                   */
/* -------------------------------------------------------------------------- */

/** The figure strip that sits under a panel header, above its rows. */
export function TotalsBar({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-6 border-b bg-muted/25 px-4 py-3.5">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
            {item.label}
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Pools per-student requests. Allocations and payments are only fetchable one
 * enrolment at a time, so a class means one request each — a small pool keeps
 * that from stampeding the browser's connection limit.
 */
export async function mapWithPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run())
  );
  return results;
}
