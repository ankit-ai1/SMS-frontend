import Link from "next/link";
import { Check, Crown, Gem, Send, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PLANS = [
  {
    name: "Basic",
    icon: Send,
    blurb: "Perfect for small schools",
    cap: "Up to 200 students",
    features: [
      "Student and staff records",
      "Attendance and fees",
      "Parent portal",
      "Email support",
    ],
    featured: false,
  },
  {
    name: "Standard",
    icon: Star,
    blurb: "Ideal for growing schools",
    cap: "Up to 500 students",
    features: [
      "Everything in Basic",
      "Exams and report cards",
      "Role-based staff logins",
      "Priority support",
    ],
    featured: false,
  },
  {
    name: "Plus",
    icon: Crown,
    blurb: "Advanced features for schools",
    cap: "Up to 1,000 students",
    features: [
      "Everything in Standard",
      "Advanced reports",
      "Leave approval workflow",
      "Document vault",
    ],
    featured: true,
  },
  {
    name: "Pro",
    icon: Gem,
    blurb: "Complete solution for large schools",
    cap: "Unlimited students",
    features: [
      "Everything in Plus",
      "Custom integrations",
      "Dedicated onboarding",
      "24/7 premium support",
    ],
    featured: false,
  },
] as const;

/**
 * The four tiers. Prices are deliberately not shown: schools are quoted on
 * roll strength and modules, so every card leads to a conversation rather than
 * a checkout.
 */
export function PricingTable() {
  return (
    <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {PLANS.map((plan) => {
        const Icon = plan.icon;

        return (
          <div
            key={plan.name}
            className={cn(
              "relative flex flex-col rounded-3xl border bg-card p-6 transition-all hover:-translate-y-1",
              plan.featured
                ? "border-brand-300 shadow-lift ring-1 ring-brand-200"
                : "border-black/5 shadow-card hover:shadow-lift"
            )}
          >
            {plan.featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-[0.625rem] font-black tracking-wide text-white uppercase shadow-brand">
                Most popular
              </span>
            )}

            <div className="text-center">
              <span
                className={cn(
                  "mx-auto flex size-12 items-center justify-center rounded-2xl",
                  plan.featured
                    ? "bg-brand-600 text-white shadow-brand"
                    : "bg-brand-50 text-brand-600 ring-1 ring-brand-100"
                )}
              >
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-black">{plan.name}</h3>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {plan.blurb}
              </p>
            </div>

            <p className="mt-5 rounded-2xl bg-muted/60 px-3 py-2.5 text-center text-sm font-bold">
              {plan.cap}
            </p>

            <ul className="mt-5 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <Check className="size-3" />
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <Button
              variant={plan.featured ? "default" : "outline"}
              size="lg"
              asChild
              className={cn(
                "mt-6 w-full rounded-2xl",
                plan.featured && "shadow-brand hover:bg-brand-700"
              )}
            >
              <Link href="/contact">Get Started</Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
