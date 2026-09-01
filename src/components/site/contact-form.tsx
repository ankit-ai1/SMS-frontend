"use client";

import * as React from "react";
import { Info, Send } from "lucide-react";

import { Field, fieldProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * NOTE: there is no lead-capture endpoint in the API yet, so rather than invent
 * one this composes a pre-filled email and hands it to the visitor's mail app.
 * It works today and loses nothing.
 *
 * When `POST /api/v1/leads` (or a form service) exists, swap `handleSubmit` for
 * the call — the fields below are already the payload.
 */
const INBOX = "hello@syneraxcampus.com";

const SIZES = [
  "Under 200 students",
  "200 – 500 students",
  "500 – 1,000 students",
  "Over 1,000 students",
] as const;

type Values = {
  name: string;
  school: string;
  email: string;
  phone: string;
  size: string;
  message: string;
};

type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = {
  name: "",
  school: "",
  email: "",
  phone: "",
  size: "",
  message: "",
};

export function ContactForm() {
  const [values, setValues] = React.useState<Values>(EMPTY);
  const [errors, setErrors] = React.useState<Errors>({});
  const [isSent, setIsSent] = React.useState(false);

  function set<K extends keyof Values>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found: Errors = {};
    if (!values.name.trim()) found.name = "Please tell us your name.";
    if (!values.school.trim()) found.school = "Which school are you with?";
    if (!values.email.trim()) {
      found.email = "We need an address to reply to.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      found.email = "That does not look like an email address.";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    const body = [
      `Name: ${values.name.trim()}`,
      `School: ${values.school.trim()}`,
      `Email: ${values.email.trim()}`,
      values.phone.trim() ? `Phone: ${values.phone.trim()}` : null,
      values.size ? `Roll strength: ${values.size}` : null,
      "",
      values.message.trim() || "(no message)",
    ]
      .filter((line) => line !== null)
      .join("\n");

    const href = `mailto:${INBOX}?subject=${encodeURIComponent(
      `Demo request — ${values.school.trim()}`
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = href;
    setIsSent(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-3xl border border-black/5 bg-card p-6 shadow-card sm:p-8"
    >
      <h2 className="text-xl font-black">Request a demo</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Tell us about your school and we will show you the exact setup it would
        run on.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field id="contact_name" label="Your name" error={errors.name}>
          <Input
            {...fieldProps("contact_name", errors.name)}
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder="Asha Mehta"
            autoComplete="name"
            className="h-10 rounded-xl"
          />
        </Field>

        <Field id="contact_school" label="School name" error={errors.school}>
          <Input
            {...fieldProps("contact_school", errors.school)}
            value={values.school}
            onChange={(event) => set("school", event.target.value)}
            placeholder="Sunrise Public School"
            autoComplete="organization"
            className="h-10 rounded-xl"
          />
        </Field>

        <Field id="contact_email" label="Email address" error={errors.email}>
          <Input
            {...fieldProps("contact_email", errors.email)}
            type="email"
            inputMode="email"
            value={values.email}
            onChange={(event) => set("email", event.target.value)}
            placeholder="you@school.edu"
            autoComplete="email"
            className="h-10 rounded-xl"
          />
        </Field>

        <Field id="contact_phone" label="Phone (optional)">
          <Input
            {...fieldProps("contact_phone")}
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={(event) => set("phone", event.target.value)}
            placeholder="+91 98765 43210"
            autoComplete="tel"
            className="h-10 rounded-xl"
          />
        </Field>

        <div className="sm:col-span-2">
          <Field id="contact_size" label="Roll strength (optional)">
            <Select
              value={values.size}
              onValueChange={(value) => set("size", value)}
            >
              <SelectTrigger id="contact_size" className="h-10 w-full rounded-xl">
                <SelectValue placeholder="How many students?" />
              </SelectTrigger>
              <SelectContent>
                {SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field id="contact_message" label="Anything else? (optional)">
            <Textarea
              {...fieldProps("contact_message")}
              value={values.message}
              onChange={(event) => set("message", event.target.value)}
              placeholder="What are you using today, and what is not working about it?"
              rows={4}
              className="rounded-xl"
            />
          </Field>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="mt-6 h-12 w-full rounded-2xl shadow-brand transition-all hover:bg-brand-700"
      >
        <Send className="size-4" />
        Send request
      </Button>

      <div className="mt-4 flex gap-3 rounded-xl bg-muted/60 p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {isSent
            ? "Your mail app should have opened with the request ready to send. If it did not, write to us at " +
              INBOX +
              " directly."
            : "This opens your email app with the request filled in, so you can see exactly what is sent."}
        </p>
      </div>
    </form>
  );
}
