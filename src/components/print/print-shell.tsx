"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BadgeCheck,
  Cake,
  IdCard,
  Info,
  Printer,
  Ticket,
} from "lucide-react";

import type { SchoolProfile } from "@/components/print/use-school-profile";
import { SyneraxMark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                Print centre                                */
/* -------------------------------------------------------------------------- */

const PRINT_TABS = [
  { href: "/print/id-cards", label: "ID Cards", icon: IdCard },
  { href: "/print/admit-cards", label: "Admit Cards", icon: Ticket },
  { href: "/print/certificates", label: "Certificates", icon: BadgeCheck },
  { href: "/print/achievers", label: "Achiever's Awards", icon: Award },
  { href: "/print/birthdays", label: "Birthdays", icon: Cake },
] as const;

/** Moves between the things this screen can put on paper. */
function PrintTabs() {
  const pathname = usePathname() ?? "";

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <nav className="flex w-max gap-0.5 rounded-xl bg-muted p-1">
        {PRINT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
                isActive
                  ? "bg-card text-brand-700 shadow-soft dark:text-brand-300"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Header                                   */
/* -------------------------------------------------------------------------- */

/** The school's letterhead, repeated across every printed artefact. */
export function SchoolLetterhead({
  school,
  title,
  compact = false,
}: {
  school: SchoolProfile | null;
  /** e.g. "Admit Card", "Transfer Certificate". */
  title?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 border-b border-brand-700/25 pb-3",
        compact && "gap-3 pb-2"
      )}
    >
      <SyneraxMark className={compact ? "size-9" : "size-12"} />

      <div className="min-w-0 flex-1 text-center">
        <p
          className={cn(
            "truncate font-black tracking-tight text-brand-800",
            compact ? "text-sm" : "text-lg"
          )}
        >
          {school?.name?.trim() || "Your School Name"}
        </p>
        {!compact && (
          <>
            {school?.address?.trim() && (
              <p className="mt-0.5 text-[0.625rem] text-neutral-600">
                {school.address}
              </p>
            )}
            <p className="text-[0.625rem] text-neutral-600">
              {[school?.phone?.trim(), school?.email?.trim()]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
          </>
        )}
      </div>

      {/* Balances the mark on the left so the name stays optically centred. */}
      <span
        aria-hidden
        className={compact ? "size-9 shrink-0" : "size-12 shrink-0"}
      />

      {title && (
        <span className="sr-only">{title}</span>
      )}
    </div>
  );
}

/** The band that names what the sheet is — "ADMIT CARD", "BONAFIDE", etc. */
export function DocumentTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-center text-xs font-black tracking-[0.3em] text-brand-800 uppercase">
      {children}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Shell                                   */
/* -------------------------------------------------------------------------- */

/**
 * Wraps a print screen: the controls at the top (which never reach paper) and
 * the sheet itself inside `.print-area` (which is all that does).
 *
 * Printing is the browser's own dialog rather than a generated PDF — it needs
 * no library, every browser can already "Save as PDF", and the school gets the
 * paper-size and margin controls they are used to.
 */
export function PrintShell({
  title,
  description,
  controls,
  count,
  children,
}: {
  title: string;
  description: string;
  /** The pickers that choose what gets printed. */
  controls: ReactNode;
  /** How many artefacts are on the sheet; the Print button is off at zero. */
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>

        <Button
          size="lg"
          disabled={count === 0}
          onClick={() => window.print()}
          className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
        >
          <Printer className="size-4" />
          Print {count > 0 ? `(${count})` : ""}
        </Button>
      </div>

      <PrintTabs />

      {/* ----------------------------- Controls ----------------------------- */}
      {controls}

      {/* ------------------------------ Preview ----------------------------- */}
      {count > 0 && (
        <div className="flex gap-3 rounded-xl bg-brand-50 p-3.5 ring-1 ring-brand-100">
          <Info className="mt-0.5 size-4 shrink-0 text-brand-600" />
          <p className="text-xs leading-relaxed text-brand-800">
            What you see below is exactly what prints. In the print dialog choose
            <strong> A4</strong>, and turn on
            <strong> Background graphics</strong> so the colours come through.
            Pick <strong>Save as PDF</strong> as the destination to keep a copy.
          </p>
        </div>
      )}

      <div className="print-area">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Sheets                                   */
/* -------------------------------------------------------------------------- */

/**
 * A grid of small artefacts — ID cards — that flows across pages. On screen it
 * sits on a card; on paper it is bare.
 */
export function CardSheet({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 print:grid-cols-3 print:gap-3">
        {children}
      </div>
    </div>
  );
}

/** One full-width artefact — an admit card or a certificate — per block. */
export function PageSheet({
  children,
  breakAfter = true,
}: {
  children: ReactNode;
  /** False on the last sheet, so printing does not emit a blank page. */
  breakAfter?: boolean;
}) {
  return (
    <div
      className={cn(
        "print-avoid-break mb-6 rounded-3xl border border-black/5 bg-white p-8 shadow-card",
        "print:mb-0 print:rounded-none print:border-0 print:shadow-none",
        breakAfter && "print-page-break"
      )}
    >
      {children}
    </div>
  );
}

/** The shown-when-nothing-is-picked state, shared by every print screen. */
export function PrintEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed bg-card/60 px-6 py-16 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Printer className="size-5" />
      </span>
      <p className="mt-4 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
