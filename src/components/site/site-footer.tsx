import Link from "next/link";
import { CalendarCheck, Mail, MapPin, Phone } from "lucide-react";

import { SyneraxMark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/features#modules", label: "Modules" },
      { href: "/features#apps", label: "Mobile Apps" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/about#story", label: "Our Story" },
      { href: "/about#values", label: "Values" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/contact", label: "Request a Demo" },
      { href: "/contact", label: "Support" },
      { href: "/login", label: "Sign In" },
      { href: "/pricing#faq", label: "FAQ" },
    ],
  },
];

const CONTACT = [
  { icon: Phone, label: "+91 98765 43210", href: "tel:+919876543210" },
  { icon: Mail, label: "hello@syneraxcampus.com", href: "mailto:hello@syneraxcampus.com" },
  { icon: MapPin, label: "Bengaluru, Karnataka, India", href: null },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-ink text-white/70">
      <div className="mx-auto w-full max-w-[90rem] px-5 py-14 sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,0.85fr)]">
          {/* ------------------------------ Brand ----------------------------- */}
          <div>
            <div className="flex items-center gap-3">
              <SyneraxMark className="size-11" />
              <span className="text-lg font-bold tracking-tight text-white">
                Synerax <span className="text-brand-400">Campus</span>
              </span>
            </div>

            <p className="mt-5 max-w-sm text-sm leading-relaxed">
              One system for admissions, attendance, fees, exams and
              communication — so your staff stop re-typing the same information
              into four different registers.
            </p>

            <Button
              size="lg"
              asChild
              className="mt-6 rounded-2xl bg-brand-600 text-white shadow-brand hover:bg-brand-500"
            >
              <Link href="/contact">
                <CalendarCheck className="size-4" />
                Schedule a Demo
              </Link>
            </Button>
          </div>

          {/* ------------------------------ Links ----------------------------- */}
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-bold tracking-[0.18em] text-white uppercase">
                {column.title}
              </h3>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ----------------------------- Contact ------------------------------ */}
        <div className="mt-10 grid gap-4 border-t border-white/10 pt-7 sm:grid-cols-3">
          {CONTACT.map(({ icon: Icon, label, href }) => {
            const body = (
              <span className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-400">
                  <Icon className="size-4" />
                </span>
                <span className="text-sm">{label}</span>
              </span>
            );

            return href ? (
              <Link
                key={label}
                href={href}
                className="transition-colors hover:text-white"
              >
                {body}
              </Link>
            ) : (
              <div key={label}>{body}</div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------- Bottom ------------------------------- */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[90rem] flex-wrap items-center justify-between gap-4 px-5 py-5 text-xs sm:px-8 lg:px-10">
          <p>© {year} Synerax Campus. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/contact" className="transition-colors hover:text-white">
              Terms of Service
            </Link>
            <Link href="/contact" className="transition-colors hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/contact" className="transition-colors hover:text-white">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
