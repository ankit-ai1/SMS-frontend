"use client";

import * as React from "react";
import {
  Award,
  ChevronDown,
  FileBadge,
  Loader2,
  MousePointerClick,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { percentTone, toMarks } from "@/components/exams/exam-meta";
import { Field, SectionEmpty, SectionError, fieldProps } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { SectionPicker } from "@/components/shared/section-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  generateReportCard,
  listReportCards,
  listSectionRoster,
  sameId,
  type ReportCard,
  type RosterEntry,
  type Section,
  type Term,
} from "@/lib/api";
import { formatDate, formatNumber, initialsFrom } from "@/lib/format";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                              Generate dialog                               */
/* -------------------------------------------------------------------------- */

type GenerateTarget = {
  enrollmentId: string | number;
  studentName: string;
};

function GenerateForm({
  target,
  terms,
  onCancel,
  onGenerated,
}: {
  target: GenerateTarget;
  terms: Term[];
  onCancel: () => void;
  onGenerated: () => void;
}) {
  const [termId, setTermId] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!termId) {
      setError("Select a term.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await generateReportCard({
        enrollment_id: target.enrollmentId,
        term_id: termId,
      });

      const percentage = toMarks(result?.percentage);
      toast.success("Report card generated", {
        description:
          percentage !== null
            ? `${target.studentName} scored ${percentage}%.`
            : `${target.studentName}'s report card is ready.`,
      });
      onGenerated();
    } catch (cause) {
      toast.error("Could not generate the report card", {
        description:
          cause instanceof Error
            ? cause.message
            : "Something went wrong. Please try again.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field
        id="report_term"
        label="Term"
        error={error}
        hint={
          terms.length === 0
            ? "No terms are set up for this academic year."
            : "Marks entered for this term are totalled into the report card."
        }
      >
        <Select
          value={termId}
          onValueChange={(value) => {
            setTermId(value);
            setError(undefined);
          }}
          disabled={isSubmitting || terms.length === 0}
        >
          <SelectTrigger
            {...fieldProps("report_term", error)}
            className="h-9 w-full rounded-xl"
          >
            <SelectValue placeholder="Select a term" />
          </SelectTrigger>
          <SelectContent>
            {terms.map((term) => (
              <SelectItem key={term.id} value={String(term.id)}>
                {term.name?.trim() || `Term ${term.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="rounded-xl"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || terms.length === 0}
          className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating
            </>
          ) : (
            "Generate"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Rows                                    */
/* -------------------------------------------------------------------------- */

function ReportCardRow({ card, terms }: { card: ReportCard; terms: Term[] }) {
  const percentage = toMarks(card.percentage);
  const total = toMarks(card.total_marks);
  const term = terms.find((entry) => sameId(entry.id, card.term_id));

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-3.5 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <FileBadge className="size-3.5" />
      </span>

      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-sm font-medium">
          {term?.name?.trim() || (card.term_id ? `Term ${card.term_id}` : "Term")}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {card.generated_at
            ? `Generated ${formatDate(card.generated_at)}`
            : "Generated"}
        </p>
      </div>

      <div className="flex shrink-0 gap-5 text-right">
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
            Total
          </p>
          <p className="mt-0.5 text-sm tabular-nums">
            {total !== null ? formatNumber(total) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
            Rank
          </p>
          <p className="mt-0.5 text-sm tabular-nums">
            {card.rank != null ? `#${card.rank}` : "—"}
          </p>
        </div>
      </div>

      {card.overall_grade && (
        <span className="inline-flex shrink-0 items-center rounded-lg bg-muted px-2 py-0.5 text-xs font-semibold">
          {card.overall_grade}
        </span>
      )}

      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-lg px-2 py-0.5 text-xs font-semibold ring-1 tabular-nums",
          percentTone(percentage)
        )}
      >
        {percentage !== null ? `${percentage}%` : "—"}
      </span>
    </li>
  );
}

function StudentCard({
  entry,
  terms,
  reloadToken,
  onGenerate,
}: {
  entry: RosterEntry;
  terms: Term[];
  /** Bumped after a generate, to re-open cards with the new one included. */
  reloadToken: number;
  onGenerate: (target: GenerateTarget) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [cards, setCards] = React.useState<ReportCard[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fullName = `${entry.first_name} ${entry.last_name}`.trim();

  // Report cards load per student, so they are fetched only once expanded.
  React.useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    listReportCards(entry.enrollment_id)
      .then((loaded) => {
        if (cancelled) return;
        setCards(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading report cards."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, entry.enrollment_id, reloadToken]);

  return (
    <li className="px-4 py-3 transition-colors hover:bg-muted/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 basis-56 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[0.7rem] font-semibold text-brand-700">
            {initialsFrom(fullName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {fullName || "—"}
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
              {entry.roll_number != null && String(entry.roll_number) !== ""
                ? `Roll ${entry.roll_number} · `
                : ""}
              {entry.admission_number || "—"}
            </span>
          </span>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onGenerate({
              enrollmentId: entry.enrollment_id,
              studentName: fullName,
            })
          }
          className="shrink-0 rounded-lg"
        >
          <Award className="size-3.5" />
          <span className="hidden sm:inline">Generate</span>
        </Button>
      </div>

      {isOpen && (
        <div className="mt-3 sm:pl-12">
          {error ? (
            <p className="text-xs font-medium text-destructive">{error}</p>
          ) : cards === null ? (
            <Skeleton className="h-14 w-full rounded-xl" />
          ) : cards.length === 0 ? (
            <p className="rounded-xl border border-dashed px-3.5 py-3 text-xs text-muted-foreground">
              No report cards yet. Generate one for a term to see it here.
            </p>
          ) : (
            <ul className="space-y-2">
              {cards.map((card) => (
                <ReportCardRow key={card.id} card={card} terms={terms} />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Tab                                     */
/* -------------------------------------------------------------------------- */

export function ReportCardsTab({
  sections,
  sectionId,
  onSectionChange,
  terms,
}: {
  sections: Section[];
  sectionId: string;
  onSectionChange: (value: string) => void;
  terms: Term[];
}) {
  const [roster, setRoster] = React.useState<RosterEntry[] | null>(null);
  const [loadedFor, setLoadedFor] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [cardsToken, setCardsToken] = React.useState(0);
  const [generating, setGenerating] = React.useState<GenerateTarget | null>(
    null
  );

  React.useEffect(() => {
    if (!sectionId) return;
    let cancelled = false;

    listSectionRoster(sectionId)
      .then((loaded) => {
        if (cancelled) return;
        setRoster(loaded);
        setLoadedFor(sectionId);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading the roster."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [sectionId, reloadKey]);

  const isStale = loadedFor !== sectionId;

  return (
    <>
      <Panel
        title="Report Cards"
        description="Totals, grades and rank for a term, per student."
        icon={FileBadge}
      >
        <div className="border-b p-4">
          <SectionPicker
            id="report_cards_section"
            sections={sections}
            value={sectionId}
            onChange={onSectionChange}
          />
        </div>

        {!sectionId ? (
          <SectionEmpty
            icon={MousePointerClick}
            title="Pick a section to start"
            description="Choose a section above to generate and review report cards for its students."
          />
        ) : error ? (
          <SectionError
            message={error}
            onRetry={() => {
              setError(null);
              setReloadKey((key) => key + 1);
            }}
          />
        ) : isStale || roster === null ? (
          <ul className="divide-y">
            {Array.from({ length: 5 }, (_, index) => (
              <li key={index} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 max-w-full rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
                <Skeleton className="h-7 w-24 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : roster.length === 0 ? (
          <SectionEmpty
            icon={UsersRound}
            title="No students in this section"
            description="Enroll students into this section before report cards can be generated."
          />
        ) : (
          <ul className="divide-y">
            {roster.map((entry) => (
              <StudentCard
                key={String(entry.enrollment_id)}
                entry={entry}
                terms={terms}
                reloadToken={cardsToken}
                onGenerate={setGenerating}
              />
            ))}
          </ul>
        )}
      </Panel>

      <Dialog
        open={generating != null}
        onOpenChange={(next) => {
          if (!next) setGenerating(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate report card</DialogTitle>
            <DialogDescription>
              {generating
                ? `Build a report card for ${generating.studentName} from the marks entered so far.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {/* Mounted only while open, so the initialisers double as the reset. */}
          {generating && (
            <GenerateForm
              target={generating}
              terms={terms}
              onCancel={() => setGenerating(null)}
              onGenerated={() => {
                setGenerating(null);
                setCardsToken((token) => token + 1);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
