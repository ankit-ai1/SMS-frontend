"use client";

import { Field } from "@/components/shared/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Section } from "@/lib/api";

/** "Class 5 — A", falling back to whatever the section carries. */
export function sectionLabel(section: Section): string {
  const name = section.name?.trim() || `Section ${section.id}`;
  const className = section.class_name?.trim();
  return className ? `${className} — ${name}` : name;
}

/** The section dropdown both attendance tabs share. */
export function SectionPicker({
  id,
  sections,
  value,
  onChange,
  disabled,
}: {
  id: string;
  sections: Section[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Field id={id} label="Section">
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || sections.length === 0}
      >
        <SelectTrigger id={id} className="h-9 w-full rounded-xl sm:w-64">
          <SelectValue
            placeholder={
              sections.length === 0 ? "No sections set up" : "Select a section"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {sections.map((section) => (
            <SelectItem key={section.id} value={String(section.id)}>
              {sectionLabel(section)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
