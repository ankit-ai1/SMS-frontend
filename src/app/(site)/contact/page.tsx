import type { Metadata } from "next";
import Link from "next/link";
import { Clock, LogIn, Mail, MapPin, Phone } from "lucide-react";

import { ContactForm } from "@/components/site/contact-form";
import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/site-ui";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact — Synerax Campus",
  description:
    "Book a demo, ask a question, or get support for Synerax Campus school management software.",
};

const CHANNELS = [
  {
    icon: Phone,
    title: "Call us",
    lines: ["+91 98765 43210", "+91 98765 43211"],
    href: "tel:+919876543210",
  },
  {
    icon: Mail,
    title: "Email us",
    lines: ["hello@syneraxcampus.com", "support@syneraxcampus.com"],
    href: "mailto:hello@syneraxcampus.com",
  },
  {
    icon: MapPin,
    title: "Visit us",
    lines: ["Synerax Technologies", "Bengaluru, Karnataka, India"],
    href: null,
  },
  {
    icon: Clock,
    title: "Office hours",
    lines: ["Mon – Sat, 9:30 am – 6:30 pm", "Support: 24/7 for Pro plans"],
    href: null,
  },
] as const;

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's talk about your"
        accent="school"
        description="Tell us your roll strength and what you use today. We will show you the setup your school would actually run on — no obligation, no sales script."
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:gap-14">
          <ContactForm />

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {CHANNELS.map((channel) => {
                const Icon = channel.icon;

                const body = (
                  <div className="h-full rounded-3xl border border-black/5 bg-card p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-4 text-sm font-black">{channel.title}</h3>
                    {channel.lines.map((line) => (
                      <p
                        key={line}
                        className="mt-1 text-xs leading-relaxed text-muted-foreground"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                );

                return channel.href ? (
                  <Link
                    key={channel.title}
                    href={channel.href}
                    className="rounded-3xl outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={channel.title}>{body}</div>
                );
              })}
            </div>

            {/* Existing customers land here looking for the app, not a demo. */}
            <div className="rounded-3xl border border-brand-200/70 bg-brand-50/60 p-6">
              <h3 className="text-base font-black">Already a customer?</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Sign in at your school&rsquo;s own address. If you have forgotten
                it, your school administrator can tell you.
              </p>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="mt-4 rounded-2xl bg-card"
              >
                <Link href="/login">
                  <LogIn className="size-4" />
                  Sign in
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
