import type { Metadata } from "next";
import Link from "next/link";
import {
  Compass,
  Eye,
  HeartHandshake,
  Layers,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";

import { PageHero } from "@/components/site/page-hero";
import { Section, SectionHeading } from "@/components/site/site-ui";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About Us — Synerax Campus",
  description:
    "Why Synerax Campus exists, who builds it, and the principles the product is held to.",
};

const VALUES = [
  {
    icon: Eye,
    title: "Clarity over clutter",
    body: "A screen should answer one question well. If a teacher has to hunt for the thing they open twenty times a day, the screen is wrong — not the teacher.",
  },
  {
    icon: ShieldCheck,
    title: "Separation by default",
    body: "An accountant sees fees. A clerk sees admissions. A parent sees their own child. Access is decided by role, enforced on the server, and never left to a hidden menu.",
  },
  {
    icon: HeartHandshake,
    title: "Built with, not for",
    body: "Every screen started as somebody's paper register. We sat in school offices and watched the work before we drew a single interface.",
  },
  {
    icon: Layers,
    title: "One record, everywhere",
    body: "Admission, attendance, fee, exam and report card all read the same student record. Nobody re-types anything into a second register.",
  },
] as const;

const ROLES = [
  { name: "Admin", note: "The whole school, end to end" },
  { name: "Principal", note: "School-wide oversight, leave approvals" },
  { name: "Teacher", note: "Their classes, register and marks" },
  { name: "Accountant", note: "Fees, collection and reports" },
  { name: "Clerk", note: "Admissions, papers and the register" },
  { name: "Parent", note: "Their children's record" },
  { name: "Student", note: "Their own attendance, fees and results" },
] as const;

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="School software that respects"
        accent="how a school actually works"
        description="Synerax Campus started with a simple observation: most school software is one giant screen shown to everybody, and every user has to learn to ignore the parts that are not theirs. We built the opposite."
      />

      {/* ------------------------------- Story -------------------------------- */}
      <Section id="story">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Our story"
              title="It began in a school"
              accent="office"
            />
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                A clerk was copying the same twenty admission numbers into three
                different registers — one for attendance, one for the fee book,
                and one for the exam list. Nothing was wrong with her work. The
                system was making her do it three times.
              </p>
              <p>
                So we started at the other end: one student record, read by every
                module that needs it. Mark the register once and it feeds the
                monthly report, the parent portal and the term report card. Take
                a fee at the counter and the receipt, the ledger and the
                parent&rsquo;s app all update together.
              </p>
              <p>
                Then we split it by role, because a principal, an accountant and
                a parent are not looking for the same thing — and should not be
                able to reach the same thing either.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-black/5 bg-card p-7 shadow-card">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <Users className="size-5" />
            </span>
            <h3 className="mt-5 text-lg font-black">Seven roles, seven doors</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Each role signs in and lands on the screen built for it. No shared
              dashboard, no menu full of greyed-out items.
            </p>

            <ul className="mt-6 divide-y">
              {ROLES.map((role) => (
                <li
                  key={role.name}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3"
                >
                  <span className="text-sm font-bold">{role.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {role.note}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ------------------------------ Mission ------------------------------- */}
      <Section className="bg-brand-50/40">
        <div className="grid gap-6 lg:grid-cols-2">
          {[
            {
              icon: Target,
              title: "Our mission",
              body: "Give every school — not just the well-funded ones — software that makes the office faster on day one, without a month of training or a consultant on retainer.",
            },
            {
              icon: Compass,
              title: "Our vision",
              body: "A school day where nobody re-types anything, every parent can see where their child stands, and the principal has the answer before the question is asked.",
            },
          ].map((entry) => (
            <div
              key={entry.title}
              className="rounded-3xl border border-black/5 bg-card p-7 shadow-card"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-brand">
                <entry.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-black">{entry.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {entry.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ------------------------------- Values ------------------------------- */}
      <Section id="values">
        <SectionHeading
          eyebrow="What we hold to"
          title="Principles the product is"
          accent="held to"
          description="These are not posters on a wall — they are the reasons features get rejected."
        />

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {VALUES.map((value) => (
            <div
              key={value.title}
              className="rounded-3xl border border-black/5 bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                <value.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-black">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {value.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild className="rounded-2xl shadow-brand">
            <Link href="/contact">Talk to us</Link>
          </Button>
          <Button variant="outline" size="lg" asChild className="rounded-2xl">
            <Link href="/features">See what it does</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
