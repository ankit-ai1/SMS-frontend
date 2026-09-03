import Link from "next/link";
import {
  Award,
  BadgeCheck,
  BellRing,
  BookOpen,
  Bus,
  CalendarCheck,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  Cake,
  Download,
  FileBadge,
  FileText,
  GraduationCap,
  Headphones,
  IdCard,
  Laptop,
  MessageSquare,
  NotebookPen,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Users,
  UsersRound,
  Wallet,
  Armchair,
} from "lucide-react";

import { PricingTable } from "@/components/site/pricing-table";
import {
  FeatureCard,
  ModuleTile,
  Section,
  SectionHeading,
  StatTile,
} from "@/components/site/site-ui";
import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/*                               Core capability                              */
/* -------------------------------------------------------------------------- */

/** Copy is kept to two lines a card — six across, six ragged blocks reads as a
 *  mess, and the strip is a glance, not a read. */
const FEATURES = [
  {
    icon: UsersRound,
    title: "Student Management",
    description: "Admission to leaving, one record.",
    tone: "bg-brand-100 text-brand-700",
  },
  {
    icon: Wallet,
    title: "Fee Management",
    description: "Structures, collection, receipts.",
    tone: "bg-gold-soft text-gold",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance",
    description: "Mark in minutes, review by month.",
    tone: "bg-brand-50 text-brand-600",
  },
  {
    icon: NotebookPen,
    title: "Examinations",
    description: "Marks, results and report cards.",
    tone: "bg-brand-100 text-brand-800",
  },
  {
    icon: MessageSquare,
    title: "Communication",
    description: "Staff, parents and students in sync.",
    tone: "bg-gold-soft text-gold",
  },
  {
    icon: ChartColumn,
    title: "Reports & Analytics",
    description: "The numbers, ready to read.",
    tone: "bg-brand-50 text-brand-700",
  },
] as const;

export function FeatureStrip() {
  return (
    // Lifted into the hero's bottom padding, and raised above the hero's
    // background wash so the card edge stays crisp against it.
    <div className="relative z-10 mx-auto -mt-24 w-full max-w-[90rem] px-5 pb-6 sm:-mt-26 sm:px-8 sm:pb-8 lg:px-10">
      <div className="grid gap-1 rounded-[1.75rem] border border-black/5 bg-card/92 p-3 shadow-lift backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Modules                                  */
/* -------------------------------------------------------------------------- */

/**
 * Every one of these is a screen that exists and works. Nothing aspirational
 * belongs on this grid — a school that asks for a demo of a module named here
 * has to be shown it working.
 */
const MODULES = [
  { icon: ChartColumn, label: "Analysis Reports" },
  { icon: Users, label: "Sibling Fee" },
  { icon: IdCard, label: "Staff & Student ID" },
  { icon: FileBadge, label: "Report Cards" },
  { icon: Ticket, label: "Admit Cards" },
  { icon: BadgeCheck, label: "Certificates" },
  { icon: Award, label: "Achiever's Awards" },
  { icon: Cake, label: "Birthday Greetings" },
  { icon: Armchair, label: "Seating Plan" },
  { icon: FileText, label: "Document Vault" },
  { icon: ShieldCheck, label: "Gate Pass" },
  { icon: Bus, label: "Transport" },
  { icon: BellRing, label: "Notices" },
  { icon: Laptop, label: "Online Classes" },
  { icon: CalendarCheck, label: "Leave Approvals" },
  { icon: CalendarDays, label: "School Calendar" },
] as const;

export function ModulesSection() {
  return (
    <Section id="modules" className="bg-brand-50/50">
      {/* Title and its lede sit as a pair, not at opposite ends of the row. */}
      <div className="grid gap-x-10 gap-y-3 lg:grid-cols-[auto_minmax(0,28rem)] lg:items-end">
        <SectionHeading align="left" title="Modules &" accent="Utilities" />
        <p className="text-sm leading-relaxed text-muted-foreground lg:pb-1.5">
          Sixteen modules built around the way a school actually runs its day —
          switch on the ones you need, leave the rest out of the way.
        </p>
      </div>

      <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-8">
        {MODULES.map((module) => (
          <ModuleTile key={module.label} {...module} />
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Why choose us                               */
/* -------------------------------------------------------------------------- */

const STATS = [
  { icon: Award, value: "15+", label: "Years of experience" },
  { icon: GraduationCap, value: "1,500+", label: "Schools onboarded" },
  { icon: ShieldCheck, value: "99.9%", label: "Uptime & reliability" },
  { icon: Headphones, value: "24/7", label: "Dedicated support" },
] as const;

export function WhyChooseUs() {
  return (
    <section className="relative overflow-hidden bg-ink py-16 sm:py-22">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:44px_44px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(36rem_24rem_at_18%_-10%,var(--brand-900),transparent_60%)]"
      />

      <div className="relative mx-auto grid w-full max-w-[90rem] gap-10 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-10">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-brand-400 uppercase">
            Why choose us
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white text-balance sm:text-4xl">
            Trusted by schools.
            <br />
            <span className="text-brand-400">Proven by numbers.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
            Built with schools rather than for them — every screen came out of
            watching an office actually do the work.
          </p>

          <Button
            size="lg"
            asChild
            className="mt-7 rounded-2xl bg-brand-600 text-white shadow-brand hover:bg-brand-500"
          >
            <Link href="/about">Know More About Us</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STATS.map((stat) => (
            <StatTile key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Apps                                    */
/* -------------------------------------------------------------------------- */

const APPS = [
  {
    icon: GraduationCap,
    title: "Student & Parent",
    tone: "bg-brand-50 text-brand-600 ring-brand-100",
    points: [
      "Attendance and timetable",
      "Fee status and receipts",
      "Report cards and results",
      "School calendar",
    ],
  },
  {
    icon: BookOpen,
    title: "Staff Portal",
    tone: "bg-gold-soft text-gold ring-gold/20",
    points: [
      "Mark attendance",
      "Enter exam marks",
      "My classes at a glance",
      "Apply for leave",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Admin & Principal",
    tone: "bg-brand-100 text-brand-800 ring-brand-200",
    points: [
      "School-wide dashboard",
      "Fees and collection reports",
      "Leave approvals",
      "Complete control",
    ],
  },
] as const;

export function AppsSection() {
  return (
    <Section id="apps">
      <SectionHeading
        eyebrow="One system, every role"
        title="Everything at Your"
        accent="Fingertips"
        description="Six roles, six purpose-built portals. Nobody wades through screens that were not meant for them."
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {APPS.map((app) => {
          const Icon = app.icon;

          return (
            <div
              key={app.title}
              className="rounded-3xl border border-black/5 bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
            >
              <span
                className={`flex size-12 items-center justify-center rounded-2xl ring-1 ${app.tone}`}
              >
                <Icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-black">{app.title}</h3>

              <ul className="mt-4 space-y-2.5">
                {app.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
                    {point}
                  </li>
                ))}
              </ul>

              <Link
                href="/features"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 transition-colors hover:text-brand-700"
              >
                View details →
              </Link>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Pricing                                  */
/* -------------------------------------------------------------------------- */

export function PricingSection() {
  return (
    <Section id="pricing" className="bg-brand-50/50">
      <SectionHeading
        eyebrow="Choose your plan"
        title="Simple, Transparent"
        accent="Pricing"
        description="Pick the plan that matches your roll strength. Every plan includes free setup and staff training."
      />

      <PricingTable />

      <p className="mt-8 text-center text-xs font-bold tracking-wide text-muted-foreground uppercase">
        All plans include free setup &amp; training
      </p>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Testimonials                                */
/* -------------------------------------------------------------------------- */

const TESTIMONIALS = [
  {
    quote:
      "Fee collection used to take our office three days a month. It now takes an afternoon, and parents get their receipt before they leave the counter.",
    name: "Mrs. Mamta Dubey",
    role: "Principal",
    initials: "MD",
  },
  {
    quote:
      "The teachers picked it up in one session. Marking attendance went from a paper register and a spreadsheet to about four minutes a class.",
    name: "Ms. Ira Sharma",
    role: "Principal",
    initials: "IS",
  },
  {
    quote:
      "What sold us was the role separation. Our accountant sees fees, our clerk sees admissions, and nobody sees anything they should not.",
    name: "Dr. Vijaya Laxmi Sharma",
    role: "Managing Director",
    initials: "VS",
  },
] as const;

export function TestimonialsSection() {
  return (
    <Section>
      <SectionHeading
        eyebrow="What our clients say"
        title="Loved by Schools"
        accent="Across India"
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {TESTIMONIALS.map((entry) => (
          <figure
            key={entry.name}
            className="flex flex-col rounded-3xl border border-black/5 bg-card p-6 shadow-card"
          >
            <Quote className="size-7 text-brand-200" />

            <div className="mt-3 flex gap-0.5">
              {Array.from({ length: 5 }, (_, index) => (
                <Star key={index} className="size-3.5 fill-gold text-gold" />
              ))}
            </div>

            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground italic">
              “{entry.quote}”
            </blockquote>

            <figcaption className="mt-6 flex items-center gap-3 border-t pt-5">
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {entry.initials}
              </span>
              <span>
                <span className="block text-sm font-bold">{entry.name}</span>
                <span className="block text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase">
                  {entry.role}
                </span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Ecosystem                                 */
/* -------------------------------------------------------------------------- */

const DAY = [
  { icon: ClipboardCheck, label: "Morning Attendance", note: "Marked in seconds" },
  { icon: BookOpen, label: "Engaging Classes", note: "Timetable and lessons" },
  { icon: Wallet, label: "Fee Collection", note: "Receipt on the spot" },
  { icon: MessageSquare, label: "Parent Updates", note: "Notices and results" },
  { icon: ChartColumn, label: "Reports", note: "Decisions from data" },
] as const;

export function EcosystemSection() {
  return (
    <Section>
      <SectionHeading
        eyebrow="One day in a digital school"
        title="A Complete Ecosystem for"
        accent="Everyday Excellence"
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {DAY.map((step, index) => (
          <div key={step.label} className="relative">
            {/* Connector — only between cards, and only where they sit in a row. */}
            {index < DAY.length - 1 && (
              <span
                aria-hidden
                className="absolute top-9 -right-2 hidden h-px w-4 bg-brand-200 lg:block"
              />
            )}

            <div className="flex h-full flex-col items-center rounded-3xl border border-black/5 bg-card px-4 py-6 text-center shadow-soft transition-all hover:-translate-y-1 hover:shadow-card">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                <step.icon className="size-5" />
              </span>
              <p className="mt-4 text-sm font-bold">{step.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{step.note}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  CTA band                                  */
/* -------------------------------------------------------------------------- */

export function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(135deg,var(--brand-700),var(--brand-900))] py-16 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.09] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:40px_40px]"
      />

      {/* Two columns rather than `justify-between`: on a wide screen that would
          pin the buttons to the far edge, a whole screen away from the copy. */}
      <div className="relative mx-auto grid w-full max-w-[90rem] gap-8 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-14 lg:px-10">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-xs font-bold text-white ring-1 ring-white/20">
            <Sparkles className="size-3.5" />
            Free setup and training
          </span>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-white text-balance sm:text-4xl">
            Start your digital school journey today
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Tell us your roll strength and we will show you the exact setup your
            school would run on — no obligation, no sales script.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            asChild
            className="h-12 rounded-2xl bg-white px-6 text-brand-800 hover:bg-white/90"
          >
            <Link href="/contact">
              <CalendarCheck className="size-4" />
              Book a Free Demo
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            asChild
            className="h-12 rounded-2xl border-white/30 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/features">
              <Download className="size-4" />
              Explore Features
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

