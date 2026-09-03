"use client";

import * as React from "react";
import { Award } from "lucide-react";

import {
  PageSheet,
  PrintEmpty,
  PrintShell,
  SchoolLetterhead,
} from "@/components/print/print-shell";
import {
  useSchoolProfile,
  type SchoolProfile,
} from "@/components/print/use-school-profile";
import { toMarks } from "@/components/exams/exam-meta";
import { Field } from "@/components/shared/form-field";
import { SectionPicker } from "@/components/shared/section-picker";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCurrentAcademicYear,
  listReportCards,
  listSectionRoster,
  listSections,
  listTerms,
  sameId,
  type ReportCard,
  type RosterEntry,
  type Section,
  type Term,
} from "@/lib/api";
import { formatDate } from "@/lib/format";

/** Report cards load one enrolment at a time, so a class is pooled. */
const CONCURRENCY = 6;

async function mapWithPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run())
  );
  return results;
}

type Achiever = {
  entry: RosterEntry;
  card: ReportCard;
  percentage: number | null;
  /** Position within the section, worked out here from the percentages. */
  position: number;
};

const ORDINALS = ["First", "Second", "Third"] as const;

function positionLabel(position: number): string {
  return ORDINALS[position - 1] ?? `${position}th`;
}

/* -------------------------------------------------------------------------- */
/*                                 Certificate                                */
/* -------------------------------------------------------------------------- */

function MeritCertificate({
  achiever,
  section,
  term,
  school,
}: {
  achiever: Achiever;
  section: Section | undefined;
  term: Term | undefined;
  school: SchoolProfile | null;
}) {
  const fullName =
    `${achiever.entry.first_name} ${achiever.entry.last_name}`.trim() || "—";
  const placement =
    [section?.class_name?.trim(), section?.name?.trim()]
      .filter(Boolean)
      .join(" — ") || "—";

  return (
    <div className="border-4 border-double border-gold/60 p-8">
      <SchoolLetterhead school={school} compact />

      <div className="mt-8 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-gold-soft text-gold ring-2 ring-gold/30">
          <Award className="size-8" />
        </span>

        <p className="mt-5 text-[0.6875rem] font-black tracking-[0.35em] text-gold uppercase">
          Certificate of Achievement
        </p>

        <p className="mt-8 text-xs text-neutral-600">
          This certificate is proudly presented to
        </p>

        <p className="mt-2 text-2xl font-black tracking-tight text-neutral-900">
          {fullName}
        </p>

        <p className="mx-auto mt-5 max-w-lg text-sm leading-[2] text-neutral-800">
          of Class <span className="font-bold">{placement}</span> in recognition
          of securing{" "}
          <span className="font-bold text-gold">
            {positionLabel(achiever.position)} Position
          </span>{" "}
          {term?.name?.trim() ? (
            <>
              in the <span className="font-bold">{term.name.trim()}</span>{" "}
              examinations
            </>
          ) : (
            "in the term examinations"
          )}
          {achiever.percentage !== null ? (
            <>
              {" "}
              with an aggregate of{" "}
              <span className="font-bold">{achiever.percentage}%</span>
            </>
          ) : null}
          {school?.session?.trim() ? (
            <>
              {" "}
              for the academic session{" "}
              <span className="font-bold">{school.session.trim()}</span>
            </>
          ) : null}
          .
        </p>

        <p className="mt-6 text-xs text-neutral-600 italic">
          We commend this achievement and wish continued success.
        </p>
      </div>

      <div className="mt-14 flex justify-between gap-8 text-[0.625rem]">
        {["Class Teacher", `Date: ${formatDate(new Date())}`, "Principal"].map(
          (label, index) => (
            <div key={label} className="flex-1 text-center">
              <div
                className={
                  index === 1
                    ? "pt-1 font-semibold text-neutral-600"
                    : "border-t border-neutral-400 pt-1 font-semibold text-neutral-600"
                }
              >
                {label}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function AchieversView() {
  const school = useSchoolProfile();

  const [sections, setSections] = React.useState<Section[]>([]);
  const [terms, setTerms] = React.useState<Term[]>([]);
  const [sectionId, setSectionId] = React.useState("");
  const [termId, setTermId] = React.useState("");
  const [topN, setTopN] = React.useState("3");

  const [achievers, setAchievers] = React.useState<Achiever[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      const year = await getCurrentAcademicYear();
      if (!year) return;
      const [loadedSections, loadedTerms] = await Promise.all([
        listSections(year.id),
        listTerms(year.id).catch(() => [] as Term[]),
      ]);
      if (cancelled) return;
      setSections(loadedSections);
      setTerms(loadedTerms);
    }

    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const requestKey = `${sectionId}|${termId}`;

  React.useEffect(() => {
    if (!sectionId || !termId) return;
    let cancelled = false;

    async function load(): Promise<Achiever[]> {
      const roster = await listSectionRoster(sectionId);

      const rows = await mapWithPool(roster, CONCURRENCY, async (entry) => {
        const cards = await listReportCards(entry.enrollment_id).catch(
          () => [] as ReportCard[]
        );
        const card = cards.find((one) => sameId(one.term_id, termId));
        return card ? { entry, card } : null;
      });

      // Position is worked out here rather than trusted from the card: a
      // section's ranking has to be consistent across the batch we print.
      return rows
        .filter((row): row is { entry: RosterEntry; card: ReportCard } =>
          Boolean(row)
        )
        .map((row) => ({
          ...row,
          percentage: toMarks(row.card.percentage),
        }))
        .sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1))
        .map((row, index) => ({ ...row, position: index + 1 }));
    }

    load()
      .then((loaded) => {
        if (cancelled) return;
        setAchievers(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while reading the results."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, sectionId, termId]);

  const section = sections.find((entry) => String(entry.id) === sectionId);
  const term = terms.find((entry) => String(entry.id) === termId);

  const isReady = Boolean(sectionId && termId);
  const limit = Number(topN) || 3;
  const winners = (achievers ?? []).slice(0, limit);

  return (
    <PrintShell
      title="Achiever's Awards"
      description="Merit certificates for the top scorers of a section, ranked from their published report cards."
      count={isReady && achievers ? winners.length : 0}
      controls={
        <Card className="flex flex-col gap-4 p-4 shadow-card sm:flex-row sm:items-end">
          <SectionPicker
            id="achiever_section"
            sections={sections}
            value={sectionId}
            onChange={(value) => {
              setSectionId(value);
              setAchievers(null);
            }}
          />

          <Field id="achiever_term" label="Term">
            <Select
              value={termId}
              onValueChange={(value) => {
                setTermId(value);
                setAchievers(null);
              }}
              disabled={terms.length === 0}
            >
              <SelectTrigger
                id="achiever_term"
                className="h-9 w-full rounded-xl sm:w-52"
              >
                <SelectValue
                  placeholder={terms.length === 0 ? "No terms set up" : "Select a term"}
                />
              </SelectTrigger>
              <SelectContent>
                {terms.map((entry) => (
                  <SelectItem key={entry.id} value={String(entry.id)}>
                    {entry.name?.trim() || `Term ${entry.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="achiever_top" label="How many">
            <Select value={topN} onValueChange={setTopN}>
              <SelectTrigger id="achiever_top" className="h-9 w-full rounded-xl sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["1", "3", "5", "10"].map((value) => (
                  <SelectItem key={value} value={value}>
                    Top {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Card>
      }
    >
      {!isReady ? (
        <PrintEmpty>
          Pick a section and a term — the top scorers are worked out from their
          published report cards.
        </PrintEmpty>
      ) : error ? (
        <PrintEmpty>{error}</PrintEmpty>
      ) : achievers === null ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-80 rounded-3xl" />
          ))}
        </div>
      ) : winners.length === 0 ? (
        <PrintEmpty>
          No report cards published for this section and term yet. Generate them
          on the Exams screen first.
        </PrintEmpty>
      ) : (
        winners.map((achiever, index) => (
          <PageSheet
            key={String(achiever.entry.enrollment_id)}
            breakAfter={index < winners.length - 1}
          >
            <MeritCertificate
              achiever={achiever}
              section={section}
              term={term}
              school={school}
            />
          </PageSheet>
        ))
      )}
    </PrintShell>
  );
}
