import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Headphones, ShieldCheck, Wrench } from "lucide-react";

import { PageHero } from "@/components/site/page-hero";
import { PricingTable } from "@/components/site/pricing-table";
import { Section, SectionHeading } from "@/components/site/site-ui";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pricing — Synerax Campus",
  description:
    "Plans for schools of every size. Every plan includes free setup, data migration and staff training.",
};

const INCLUDED = [
  {
    icon: Wrench,
    title: "Free setup",
    body: "We configure your classes, sections, fee heads and academic year before you sign in.",
  },
  {
    icon: GraduationCap,
    title: "Staff training",
    body: "One session per role — teachers, office and accounts — so nobody is left guessing.",
  },
  {
    icon: ShieldCheck,
    title: "Data migration",
    body: "Bring your existing student roll across from a spreadsheet or your old system.",
  },
  {
    icon: Headphones,
    title: "Support included",
    body: "Every plan has support. Higher plans get priority queues and a named contact.",
  },
] as const;

const FAQ = [
  {
    q: "How is the plan decided?",
    a: "By roll strength — the number of students actively enrolled. Staff accounts are never charged separately, so you can give every teacher, clerk and accountant their own login.",
  },
  {
    q: "What if we grow past our plan mid-year?",
    a: "You move up whenever it suits you and pay the difference for the remainder of the year. Nothing stops working the day you cross the line.",
  },
  {
    q: "Is our data separate from other schools?",
    a: "Yes. Each school runs on its own tenant with its own data. A user signed into one school cannot reach another school's records, and that boundary is enforced on the server, not in the interface.",
  },
  {
    q: "Can parents and students get their own logins?",
    a: "Yes, and they are included. Parents see their own children; students see only themselves. Neither can reach anything else.",
  },
  {
    q: "What happens to our data if we leave?",
    a: "It is yours. We export your students, staff, attendance, fee and exam records in a standard format and hand them over.",
  },
] as const;

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Simple plans, priced on"
        accent="roll strength"
        description="No per-user pricing and no charge for staff logins. Pick the tier that matches your student count — setup, migration and training are included in every one."
      />

      <Section>
        <PricingTable />

        <p className="mt-8 text-center text-xs font-bold tracking-wide text-muted-foreground uppercase">
          All plans include free setup, migration &amp; training
        </p>
      </Section>

      {/* ------------------------------ Included ------------------------------ */}
      <Section className="bg-brand-50/40">
        <SectionHeading
          eyebrow="In every plan"
          title="What you get before you"
          accent="even sign in"
        />

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {INCLUDED.map((entry) => (
            <div
              key={entry.title}
              className="rounded-3xl border border-black/5 bg-card p-6 shadow-card"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                <entry.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-sm font-black">{entry.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {entry.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* --------------------------------- FAQ -------------------------------- */}
      <Section id="faq">
        <SectionHeading
          eyebrow="Questions"
          title="Answers before you"
          accent="ask"
        />

        <div className="mx-auto mt-10 max-w-3xl space-y-4">
          {FAQ.map((entry) => (
            <details
              key={entry.q}
              className="group rounded-2xl border border-black/5 bg-card px-5 py-4 shadow-soft transition-shadow open:shadow-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold">
                {entry.q}
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {entry.a}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            Still not sure which plan fits?
          </p>
          <Button size="lg" asChild className="mt-4 rounded-2xl shadow-brand">
            <Link href="/contact">Ask us — we will tell you straight</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
