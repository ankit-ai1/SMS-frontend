import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                   Layout                                   */
/* -------------------------------------------------------------------------- */

/**
 * The one measure every band on the site is set to — header, sections, footer
 * and the full-bleed colour bands all share it, so nothing drifts out of
 * alignment as you scroll. Wider than the app's `max-w-7xl`: a marketing page
 * is read at arm's length on a desktop, and 1280px left too much dead margin.
 */
export const CONTAINER = "mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-10";

export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-16 sm:py-22", className)}>
      <div className={CONTAINER}>{children}</div>
    </section>
  );
}

/** The small uppercase label that sits above a section title. */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-xs font-bold tracking-[0.2em] text-brand-600 uppercase",
        className
      )}
    >
      {children}
    </p>
  );
}

/**
 * A section title where the tail is tinted, matching the identity's
 * "Synerax Campus" lockup — dark word, brand word.
 */
export function SectionHeading({
  eyebrow,
  title,
  accent,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  /** Rendered in brand green, straight after the title. */
  accent?: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
        className
      )}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2
        className={cn(
          "text-3xl font-black tracking-tight text-balance sm:text-4xl",
          eyebrow && "mt-2.5"
        )}
      >
        {title}
        {accent && <span className="text-brand-600"> {accent}</span>}
      </h2>
      {description && (
        <p className="mt-3.5 text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

/** The rounded badge used above the hero headline. */
export function Pill({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-700">
      {Icon ? (
        <Icon className="size-3.5" />
      ) : (
        <span aria-hidden className="size-1.5 rounded-full bg-brand-500" />
      )}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Cards                                   */
/* -------------------------------------------------------------------------- */

/**
 * One of the six headline capability cards. The icon tile carries the colour;
 * the card itself stays white so a row of six reads as a set, not a rainbow.
 */
export function FeatureCard({
  icon: Icon,
  title,
  description,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Tailwind classes for the icon tile. */
  tone: string;
}) {
  return (
    <div className="group flex gap-3.5 rounded-2xl p-3.5 transition-colors hover:bg-brand-50/60">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
          tone
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-bold leading-tight">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

/** A single module tile in the "everything else" grid. */
export function ModuleTile({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-black/5 bg-card px-2.5 py-4 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <Icon className="size-4" />
      </span>
      <span className="text-[0.6875rem] font-bold leading-tight">{label}</span>
    </div>
  );
}

/** A number on the dark "why us" band. */
export function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-white/8 p-5 ring-1 ring-white/10 backdrop-blur-sm">
      <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-brand-300">
        <Icon className="size-4.5" />
      </span>
      <p className="mt-4 text-2xl font-black tabular-nums text-white sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-white/60">{label}</p>
    </div>
  );
}
