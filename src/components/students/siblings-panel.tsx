"use client";

import * as React from "react";
import { BadgePercent, Users } from "lucide-react";

import { SectionEmpty, SectionError } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { listSiblings, type StudentSibling } from "@/lib/api";
import { initialsFrom } from "@/lib/format";

function siblingName(sibling: StudentSibling): string {
  return `${sibling.first_name} ${sibling.last_name}`.trim() || "—";
}

function placementOf(sibling: StudentSibling): string {
  return (
    [sibling.class_name?.trim(), sibling.section_name?.trim()]
      .filter(Boolean)
      .join(" — ") || "Not enrolled this year"
  );
}

/** Loads the siblings once per student and hands back the request's state. */
function useSiblings(studentId: string | number | null) {
  const [loaded, setLoaded] = React.useState<{
    studentId: string;
    siblings: StudentSibling[];
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const key = studentId == null ? "" : String(studentId);

  React.useEffect(() => {
    if (!key) return;
    let cancelled = false;

    listSiblings(key)
      .then((siblings) => {
        if (cancelled) return;
        setLoaded({ studentId: key, siblings });
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while looking for siblings."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [key, reloadKey]);

  return {
    siblings: loaded?.studentId === key ? loaded.siblings : null,
    error,
    retry: () => {
      setError(null);
      setReloadKey((current) => current + 1);
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                                    Rows                                    */
/* -------------------------------------------------------------------------- */

function SiblingRow({ sibling }: { sibling: StudentSibling }) {
  const name = siblingName(sibling);

  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-[0.7rem] font-bold text-brand-700 ring-1 ring-brand-100">
        {initialsFrom(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {placementOf(sibling)}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {sibling.admission_number || "—"}
      </span>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Panel                                   */
/* -------------------------------------------------------------------------- */

/** The full panel, for a student's own record. */
export function SiblingsPanel({ studentId }: { studentId: string | number }) {
  const { siblings, error, retry } = useSiblings(studentId);

  return (
    <Panel
      title="Siblings"
      description="Other students on the roll who share a guardian with this one."
      icon={Users}
      action={
        siblings && siblings.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-gold-soft px-2.5 py-1.5 text-xs font-medium text-gold ring-1 ring-gold/20">
            <BadgePercent className="size-3.5" />
            Sibling concession may apply
          </span>
        ) : undefined
      }
    >
      {error ? (
        <SectionError message={error} onRetry={retry} />
      ) : siblings === null ? (
        <ul className="divide-y">
          {Array.from({ length: 2 }, (_, index) => (
            <li key={index} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="size-9 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-3 w-28 rounded-md" />
              </div>
            </li>
          ))}
        </ul>
      ) : siblings.length === 0 ? (
        <SectionEmpty
          icon={Users}
          title="No siblings on the roll"
          description="Siblings are found from the guardians a student shares — a matching parent login, phone or email."
        />
      ) : (
        <ul className="divide-y">
          {siblings.map((sibling) => (
            <SiblingRow key={sibling.id} sibling={sibling} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * The one-line version, for the fee counter. It says nothing at all when there
 * are no siblings: an accountant taking a payment should only be interrupted
 * when there is actually a concession to think about.
 */
export function SiblingHint({ studentId }: { studentId: string | number }) {
  const { siblings } = useSiblings(studentId);

  if (!siblings || siblings.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-gold-soft px-4 py-3 ring-1 ring-gold/20">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/60 text-gold">
        <BadgePercent className="size-4" />
      </span>

      <p className="min-w-0 flex-1 text-xs leading-relaxed text-neutral-800">
        <span className="font-bold">
          {siblings.length} {siblings.length === 1 ? "sibling" : "siblings"} also
          on the roll
        </span>{" "}
        — check whether a sibling concession applies before collecting.
      </p>

      <p className="min-w-0 text-xs text-neutral-700">
        {siblings
          .map((sibling) => `${siblingName(sibling)} (${placementOf(sibling)})`)
          .join(",  ")}
      </p>
    </div>
  );
}
