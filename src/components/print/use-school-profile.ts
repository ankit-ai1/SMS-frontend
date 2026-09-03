"use client";

import * as React from "react";

import { asText, settingsToMap } from "@/components/settings/settings-utils";
import { listSettings } from "@/lib/api";

/**
 * The school's own details, as they appear on anything it hands out. Read from
 * the settings a school already fills in on the Settings screen, so a printed
 * certificate carries the same name and address as its receipts.
 */
export type SchoolProfile = {
  name: string;
  address: string;
  phone: string;
  email: string;
  session: string;
};

const FALLBACK: SchoolProfile = {
  name: "",
  address: "",
  phone: "",
  email: "",
  session: "",
};

export function useSchoolProfile() {
  const [profile, setProfile] = React.useState<SchoolProfile | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    listSettings()
      .then((entries) => {
        if (cancelled) return;
        const map = settingsToMap(entries);
        setProfile({
          name: asText(map.get("school_name")),
          address: asText(map.get("school_address")),
          phone: asText(map.get("school_phone")),
          email: asText(map.get("school_email")),
          session: asText(map.get("academic_session_label")),
        });
      })
      .catch(() => {
        // A printout without the school's address is still useful; the header
        // just falls back to blanks rather than blocking the whole screen.
        if (!cancelled) setProfile(FALLBACK);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return profile;
}
