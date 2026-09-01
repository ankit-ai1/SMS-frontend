import type { ReactNode } from "react";

import { Eyebrow } from "@/components/site/site-ui";

/**
 * The banner every inner page opens with. Shorter than the home hero and
 * without a call to action, so the page's own content leads.
 */
export function PageHero({
  eyebrow,
  title,
  accent,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  /** Rendered in brand green, straight after the title. */
  accent?: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-black/5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(48rem_28rem_at_70%_-20%,var(--brand-100),transparent_62%),radial-gradient(36rem_22rem_at_-4%_0%,var(--gold-soft),transparent_58%)]"
      />

      <div className="mx-auto w-full max-w-[90rem] px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        <div className="max-w-3xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-balance sm:text-5xl">
            {title}
            {accent && <span className="text-brand-600"> {accent}</span>}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
          {children && <div className="mt-8">{children}</div>}
        </div>
      </div>
    </section>
  );
}
