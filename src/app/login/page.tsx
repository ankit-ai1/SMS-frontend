"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TENANT, fetchCurrentUser, login, toUserRole } from "@/lib/api";
import { homePathFor } from "@/lib/nav";

const HIGHLIGHTS = [
  {
    icon: Users,
    title: "One roll for everyone",
    body: "Students, staff and guardians in a single, always-current directory.",
  },
  {
    icon: CalendarCheck,
    title: "Attendance that adds up",
    body: "Period-wise marking that rolls straight into term reports.",
  },
  {
    icon: BookOpen,
    title: "Exams to report cards",
    body: "Grades, remarks and results without a single spreadsheet.",
  },
];

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await login(email.trim(), password);

      // Landing depends on the role, so resolve it before navigating. Login
      // usually returns the user inline; `/auth/me` covers backends that don't,
      // and a null role simply falls back to the admin dashboard.
      const user = result.user ?? (await fetchCurrentUser());
      const role = toUserRole(user?.role);

      toast.success("Welcome back", {
        description: "Taking you to your dashboard…",
      });
      router.push(homePathFor(role));
    } catch (error) {
      toast.error("Could not sign you in", {
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-muted/40 px-4 py-8 sm:px-6 sm:py-12">
      {/* Ambient brand wash — keeps the page from reading as a flat grey box. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_15%_-10%,var(--brand-100),transparent_60%),radial-gradient(45rem_35rem_at_100%_110%,var(--brand-50),transparent_55%)]"
      />

      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-card shadow-lift ring-1 ring-foreground/10">
        <div className="grid lg:grid-cols-[1.05fr_1fr]">
          {/* ---------------------------- Branding ---------------------------- */}
          <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-700 p-10 text-white lg:flex xl:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(30rem_24rem_at_80%_0%,var(--brand-500),transparent_65%),radial-gradient(26rem_22rem_at_0%_100%,var(--brand-900),transparent_60%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:36px_36px]"
            />

            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                  <GraduationCap className="size-6" />
                </span>
                <div>
                  <p className="text-lg font-semibold tracking-tight">
                    Synerax Campus
                  </p>
                  <p className="text-xs text-white/70">School Management</p>
                </div>
              </div>

              <h1 className="mt-12 max-w-sm text-3xl leading-[1.15] font-semibold tracking-tight xl:text-[2.1rem]">
                Run the whole school from one calm dashboard.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
                Admissions, attendance, fees and results — joined up, so your
                staff stop re-typing the same information into four places.
              </p>
            </div>

            <ul className="relative mt-12 space-y-5">
              {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3.5">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/65">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>

          {/* ------------------------------ Form ------------------------------ */}
          <section className="flex flex-col justify-center p-7 sm:p-10 xl:p-12">
            {/* Compact brand lockup — stands in for the panel on small screens. */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand">
                <GraduationCap className="size-5" />
              </span>
              <div>
                <p className="text-base font-semibold tracking-tight">
                  Synerax Campus
                </p>
                <p className="text-xs text-muted-foreground">
                  School Management
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Welcome back. Enter your details to continue to{" "}
                <span className="font-medium text-foreground capitalize">
                  {TENANT}
                </span>
                .
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@school.edu"
                    required
                    disabled={isSubmitting}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl pl-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="rounded-sm text-xs font-medium text-brand-600 transition-colors outline-none hover:text-brand-700 focus-visible:ring-3 focus-visible:ring-ring/50"
                    onClick={() =>
                      toast.info("Ask your school administrator", {
                        description:
                          "Password resets are handled from the admin console.",
                      })
                    }
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    disabled={isSubmitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl pr-11 pl-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isSubmitting}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="group h-11 w-full rounded-xl text-sm shadow-brand transition-all hover:bg-brand-700 hover:shadow-lift disabled:shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
              Trouble signing in? Contact your school administrator for access.
            </p>

            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-muted-foreground transition-colors outline-none hover:text-brand-700 focus-visible:ring-3 focus-visible:ring-ring/35"
            >
              <ArrowLeft className="size-3.5" />
              Back to synerax.com
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
