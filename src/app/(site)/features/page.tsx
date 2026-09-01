import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  AppsSection,
  EcosystemSection,
  ModulesSection,
} from "@/components/site/home-sections";
import { PageHero } from "@/components/site/page-hero";
import { Section, SectionHeading } from "@/components/site/site-ui";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Features — Synerax Campus",
  description:
    "Admissions, attendance, fees, exams, calendar and leave — every module in Synerax Campus, and the role each one belongs to.",
};

/** The long-form module list, grouped the way a school's departments are. */
const GROUPS = [
  {
    title: "Students & Admissions",
    owner: "Clerk, Admin",
    items: [
      "Full student record with admission number, photo and category",
      "Guardians, with a parent login created straight from the record",
      "Document vault — upload, download and replace certificates",
      "Class and section enrolment, per academic year",
      "Search across the whole roll by name or admission number",
    ],
  },
  {
    title: "Attendance",
    owner: "Teacher, Clerk, Principal",
    items: [
      "Mark a whole section's register in one pass",
      "Present, absent, late, excused and half-day",
      "Monthly summary per student with a below-75% flag",
      "School-wide view for the principal, worst section first",
      "Parents and students see their own record only",
    ],
  },
  {
    title: "Fees",
    owner: "Accountant, Admin",
    items: [
      "Fee categories, per-class structures and discounts",
      "Allocate to one student or generate for a whole class",
      "Collect at the counter with an instant receipt",
      "Walk-in collection: find the student, take the payment",
      "Outstanding report per section, largest balance first",
    ],
  },
  {
    title: "Exams & Results",
    owner: "Teacher, Principal, Admin",
    items: [
      "Exam schedule per term with subjects and max marks",
      "Marks entry per subject, with pass-mark highlighting",
      "Grade scales — letter, CGPA or percentage",
      "Report card generation per student, per term",
      "Results visible to the parent and the student themselves",
    ],
  },
  {
    title: "Calendar & Communication",
    owner: "Everyone",
    items: [
      "School events and holidays for the academic year",
      "Agenda view of everything still ahead",
      "Notices that reach parents and students in their portal",
      "Working-day configuration per year",
    ],
  },
  {
    title: "Staff & Leave",
    owner: "Principal, Admin",
    items: [
      "Staff directory with departments and designations",
      "Leave types and per-year allowances",
      "Apply, withdraw and track your own leave",
      "Approval chain: staff to principal, principal to admin",
    ],
  },
] as const;

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="Everything a school runs on,"
        accent="in one system"
        description="Six modules, sixteen utilities and seven role-based portals. Switch on what your school needs and leave the rest out of the way."
      >
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild className="rounded-2xl shadow-brand">
            <Link href="/contact">
              Request a demo
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild className="rounded-2xl bg-card">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </PageHero>

      {/* ------------------------------- Groups ------------------------------- */}
      <Section>
        <SectionHeading
          eyebrow="Module by module"
          title="What each part of the school"
          accent="actually gets"
          description="Grouped by the desk that owns it, because that is how the access is granted too."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {GROUPS.map((group) => (
            <div
              key={group.title}
              className="rounded-3xl border border-black/5 bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-black">{group.title}</h3>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[0.625rem] font-bold tracking-wide text-brand-700 uppercase ring-1 ring-brand-100">
                  {group.owner}
                </span>
              </div>

              <ul className="mt-5 space-y-2.5">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <ModulesSection />
      <AppsSection />
      <EcosystemSection />
    </>
  );
}
