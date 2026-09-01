import Link from "next/link";
import { ArrowRight, Sparkles, Star } from "lucide-react";

import { Pill } from "@/components/site/site-ui";
import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/*                               Dashboard mock                               */
/* -------------------------------------------------------------------------- */

/**
 * A drawn impression of the product, not a screenshot: it stays sharp on every
 * display, themes with the brand, and never goes stale when the real UI moves
 * on. Purely decorative, so it is hidden from assistive tech.
 */
function DashboardMock() {
  const attendance = [
    { label: "Class 8 — A", value: 96 },
    { label: "Class 7 — B", value: 91 },
    { label: "Class 6 — A", value: 84 },
    { label: "Class 5 — C", value: 72 },
  ];

  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-3xl border border-black/5 bg-card shadow-lift"
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
        <span className="size-2.5 rounded-full bg-destructive/50" />
        <span className="size-2.5 rounded-full bg-gold/50" />
        <span className="size-2.5 rounded-full bg-brand-500/50" />
        <span className="ml-3 flex-1 truncate rounded-lg bg-card px-3 py-1 text-[0.625rem] font-medium text-muted-foreground">
          sunrise.syneraxcampus.com/dashboard
        </span>
      </div>

      <div className="space-y-4 bg-[linear-gradient(180deg,var(--brand-50),transparent_40%)] p-4 sm:p-5">
        {/* Stat row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Students", value: "1,240", tone: "bg-brand-100 text-brand-800" },
            { label: "Staff", value: "86", tone: "bg-gold-soft text-gold" },
            { label: "Collected", value: "₹4.5L", tone: "bg-brand-50 text-brand-700" },
            { label: "Pending", value: "₹1.2L", tone: "bg-muted text-foreground" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl px-3 py-3 ${stat.tone}`}
            >
              <p className="text-[0.5625rem] font-bold tracking-wide uppercase opacity-70">
                {stat.label}
              </p>
              <p className="mt-1 text-base font-black tabular-nums sm:text-lg">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr]">
          {/* Attendance bars */}
          <div className="rounded-2xl border border-black/5 bg-card p-4 shadow-soft">
            <p className="text-[0.6875rem] font-bold">Attendance this month</p>
            <div className="mt-3.5 space-y-3">
              {attendance.map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-[0.625rem] font-semibold text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className={`block h-full rounded-full ${
                        row.value >= 90
                          ? "bg-brand-500"
                          : row.value >= 80
                            ? "bg-gold"
                            : "bg-destructive/70"
                      }`}
                      style={{ width: `${row.value}%` }}
                    />
                  </span>
                  <span className="w-7 shrink-0 text-right text-[0.625rem] font-bold tabular-nums">
                    {row.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Collection donut */}
          <div className="rounded-2xl border border-black/5 bg-card p-4 shadow-soft">
            <p className="text-[0.6875rem] font-bold">Fee collection</p>
            <div className="mt-3 grid place-items-center">
              <div className="grid size-24 place-items-center rounded-full bg-[conic-gradient(var(--brand-500)_0_79%,var(--muted)_79%_100%)] p-2.5">
                <div className="grid size-full place-items-center rounded-full bg-card">
                  <div className="text-center">
                    <p className="text-lg font-black tabular-nums">79%</p>
                    <p className="text-[0.5rem] font-bold text-muted-foreground">
                      collected
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Hero                                    */
/* -------------------------------------------------------------------------- */

export function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient brand wash behind the fold. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_36rem_at_78%_-16%,var(--brand-100),transparent_62%),radial-gradient(44rem_28rem_at_-6%_10%,var(--gold-soft),transparent_58%)]"
      />

      {/* The deep bottom padding is deliberate: the feature strip below lifts
          itself into it, so the overlap lands on empty space rather than on the
          social-proof row. */}
      <div className="mx-auto w-full max-w-[90rem] px-5 pt-10 pb-32 sm:px-8 sm:pt-14 sm:pb-36 lg:px-10 lg:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          {/* ------------------------------ Copy ------------------------------ */}
          <div>
            <Pill icon={Sparkles}>All-in-One School ERP</Pill>

            <h1 className="mt-6 text-4xl leading-[1.08] font-black tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">
              School Management{" "}
              <span className="text-brand-600">Software &amp; ERP</span> built
              for Indian schools
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Admissions, attendance, fees, exams and parent communication in one
              place. Every role — principal, teacher, accountant, clerk, parent
              and student — gets exactly the screen they need, and nothing they
              don&rsquo;t.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                asChild
                className="group h-12 rounded-2xl px-6 shadow-brand transition-all hover:bg-brand-700 hover:shadow-lift"
              >
                <Link href="/contact">
                  Request Demo
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-12 rounded-2xl bg-card px-6"
              >
                <Link href="/features">Explore Features</Link>
              </Button>
            </div>

            {/* Social proof */}
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <div className="flex -space-x-2.5">
                {["SR", "GP", "MV", "AK"].map((initials, index) => (
                  <span
                    key={initials}
                    className={`flex size-9 items-center justify-center rounded-full text-[0.625rem] font-bold text-white ring-2 ring-background ${
                      ["bg-brand-600", "bg-brand-500", "bg-gold", "bg-ink"][index]
                    }`}
                  >
                    {initials}
                  </span>
                ))}
              </div>
              <div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      className="size-3.5 fill-gold text-gold"
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs font-bold text-muted-foreground">
                  Trusted by schools across India
                </p>
              </div>
            </div>
          </div>

          {/* ------------------------------ Visual ---------------------------- */}
          <div className="relative">
            <DashboardMock />

            {/* Floating proof chip, the way product sites frame a screenshot. */}
            <div className="absolute -bottom-5 -left-3 hidden rounded-2xl border border-black/5 bg-card px-4 py-3 shadow-lift sm:block">
              <p className="text-[0.625rem] font-bold tracking-wide text-muted-foreground uppercase">
                Register marked
              </p>
              <p className="mt-0.5 text-sm font-black">
                1,240 students{" "}
                <span className="font-bold text-brand-600">in 4 minutes</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
