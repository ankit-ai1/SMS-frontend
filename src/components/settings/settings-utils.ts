import type { SettingEntry } from "@/lib/api";

/** The settings this app renders as friendly form fields. */
export const KNOWN_SETTINGS: {
  key: string;
  label: string;
  placeholder: string;
  hint?: string;
}[] = [
  { key: "school_name", label: "School Name", placeholder: "Sunrise Public School" },
  {
    key: "school_address",
    label: "Address",
    placeholder: "12 MG Road, Bengaluru 560001",
  },
  { key: "school_phone", label: "Phone", placeholder: "+91 80 1234 5678" },
  { key: "school_email", label: "Email", placeholder: "office@sunrise.edu" },
  {
    key: "academic_session_label",
    label: "Session Label",
    placeholder: "2026–27",
    hint: "Shown on receipts and report cards.",
  },
  { key: "currency", label: "Currency", placeholder: "INR" },
  {
    key: "receipt_prefix",
    label: "Receipt Prefix",
    placeholder: "SPS/2026/",
    hint: "Prefixed to every fee receipt number.",
  },
];

export const KNOWN_KEYS = KNOWN_SETTINGS.map((setting) => setting.key);

/** Blank values a school would reasonably start from. */
export const SETTING_DEFAULTS: Record<string, string> = {
  currency: "INR",
};

/**
 * A setting's value for a single-line text field. Strings pass through; other
 * JSON is shown as JSON so nothing is silently lost or mangled.
 */
export function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

/** Pretty JSON for the advanced editor's textarea. */
export function asJsonText(value: unknown): string {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return "null";
  }
}

/** A one-line preview of any value, for the advanced list. */
export function previewOf(value: unknown): string {
  if (typeof value === "string") return value || '""';
  const json = asJsonText(value).replace(/\s+/g, " ");
  return json.length > 90 ? `${json.slice(0, 90)}…` : json;
}

export type ParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

/** Validates the advanced editor's text before it is sent as JSON. */
export function parseJsonText(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Enter a JSON value." };

  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch (cause) {
    return {
      ok: false,
      error:
        cause instanceof Error
          ? `Not valid JSON — ${cause.message}`
          : "Not valid JSON.",
    };
  }
}

/** Keys must be safe to put in a URL path segment. */
export function validateKey(key: string): string | undefined {
  const trimmed = key.trim();
  if (!trimmed) return "Key is required.";
  if (!/^[a-z0-9][a-z0-9_.-]*$/i.test(trimmed)) {
    return "Use letters, numbers, dots, dashes and underscores only.";
  }
  return undefined;
}

export function settingsToMap(entries: SettingEntry[]): Map<string, unknown> {
  return new Map(entries.map((entry) => [entry.key, entry.value]));
}
