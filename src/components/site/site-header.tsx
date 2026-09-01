"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, LogIn, Menu, X } from "lucide-react";

import { SyneraxLockup } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  // The bar starts flush with the hero and gains its edge once the page moves,
  // so the top of the site reads as one surface.
  React.useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        isScrolled
          ? "border-b border-black/5 bg-card/85 shadow-soft backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="relative mx-auto flex h-18 w-full max-w-[90rem] items-center gap-4 px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
        >
          <SyneraxLockup compact />
        </Link>

        {/* ------------------------------ Desktop ----------------------------- */}
        {/* Centred on the header itself, not on the gap between the logo and the
            buttons — those two differ in width, so laying it out in flow would
            leave the links visibly off-centre. */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
                isActive(link.href)
                  ? "text-brand-700"
                  : "text-muted-foreground hover:bg-brand-50/70 hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            asChild
            className="hidden rounded-2xl bg-card sm:inline-flex"
          >
            <Link href="/login">
              <LogIn className="size-4" />
              Sign In
            </Link>
          </Button>

          <Button size="lg" asChild className="rounded-2xl shadow-brand">
            <Link href="/contact">
              <span className="hidden sm:inline">Request Demo</span>
              <span className="sm:hidden">Demo</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>

          {/* ------------------------------ Mobile ---------------------------- */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="rounded-2xl lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Move between sections of the Synerax Campus site.
              </SheetDescription>

              <div className="flex h-18 items-center justify-between px-5">
                <SyneraxLockup compact />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-lg"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>

              <nav className="flex flex-col gap-1 border-t px-3 py-4">
                {LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
                      isActive(link.href)
                        ? "bg-brand-50 text-brand-700"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}

                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="mt-3 rounded-2xl"
                  onClick={() => setOpen(false)}
                >
                  <Link href="/login">
                    <LogIn className="size-4" />
                    Sign In
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
