"use client";

import * as React from "react";

import {
  DocumentTitle,
  PageSheet,
  PrintEmpty,
  PrintShell,
  SchoolLetterhead,
} from "@/components/print/print-shell";
import {
  useSchoolProfile,
  type SchoolProfile,
} from "@/components/print/use-school-profile";
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
  listExamSubjects,
  listExams,
  listSectionRoster,
  listSections,
  listTerms,
  sameId,
  type Exam,
  type ExamSubject,
  type RosterEntry,
  type Section,
  type Term,
} from "@/lib/api";
import { formatDate, initialsFrom } from "@/lib/format";

/* -------------------------------------------------------------------------- */
/*                                    Card                                    */
/* -------------------------------------------------------------------------- */

function AdmitCard({
  entry,
  exam,
  term,
  subjects,
  section,
  school,
}: {
  entry: RosterEntry;
  exam: Exam;
  term: Term | undefined;
  subjects: ExamSubject[];
  section: Section | undefined;
  school: SchoolProfile | null;
}) {
  const fullName = `${entry.first_name} ${entry.last_name}`.trim();
  const placement =
    [section?.class_name?.trim(), section?.name?.trim()]
      .filter(Boolean)
      .join(" — ") || "—";
  const roll =
    entry.roll_number != null && String(entry.roll_number) !== ""
      ? String(entry.roll_number)
      : "—";

  return (
    <>
      <SchoolLetterhead school={school} />
      <DocumentTitle>Admit Card</DocumentTitle>

      {/* ------------------------------ Identity ----------------------------- */}
      <div className="mt-5 flex items-start gap-5">
        <span className="flex size-[22mm] shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-neutral-50 text-base font-black text-neutral-500">
          {initialsFrom(fullName)}
        </span>

        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-xs">
          {[
            ["Candidate", fullName || "—"],
            ["Admission No.", entry.admission_number || "—"],
            ["Class / Section", placement],
            ["Roll No.", roll],
            ["Examination", exam.name?.trim() || `Exam ${exam.id}`],
            ["Term", term?.name?.trim() || "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <dt className="w-[28mm] shrink-0 font-bold tracking-wide text-neutral-500 uppercase text-[0.5625rem] leading-5">
                {label}
              </dt>
              <dd className="min-w-0 flex-1 font-semibold text-neutral-900">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ----------------------------- Timetable ----------------------------- */}
      <table className="mt-5 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-brand-50">
            <th className="border border-neutral-300 px-2 py-1.5 text-left font-bold text-brand-800">
              Subject
            </th>
            <th className="w-[32mm] border border-neutral-300 px-2 py-1.5 text-left font-bold text-brand-800">
              Date
            </th>
            <th className="w-[20mm] border border-neutral-300 px-2 py-1.5 text-right font-bold text-brand-800">
              Max
            </th>
            <th className="w-[20mm] border border-neutral-300 px-2 py-1.5 text-right font-bold text-brand-800">
              Pass
            </th>
          </tr>
        </thead>
        <tbody>
          {subjects.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="border border-neutral-300 px-2 py-3 text-center text-neutral-500 italic"
              >
                No subjects scheduled for this exam yet.
              </td>
            </tr>
          ) : (
            subjects.map((subject) => (
              <tr key={subject.id}>
                <td className="border border-neutral-300 px-2 py-1.5 font-medium">
                  {subject.subject_name?.trim() || `Subject ${subject.subject_id}`}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 tabular-nums">
                  {subject.exam_date ? formatDate(subject.exam_date) : "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 text-right tabular-nums">
                  {subject.max_marks ?? "—"}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 text-right tabular-nums">
                  {subject.pass_marks ?? "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* --------------------------- Instructions ---------------------------- */}
      <div className="mt-5 rounded border border-neutral-300 bg-neutral-50 px-3 py-2">
        <p className="text-[0.5625rem] font-bold tracking-wide text-neutral-600 uppercase">
          Instructions
        </p>
        <ol className="mt-1 space-y-0.5 text-[0.625rem] leading-relaxed text-neutral-700">
          <li>1. Carry this admit card to every paper. It will be checked at the hall.</li>
          <li>2. Be seated fifteen minutes before the paper begins.</li>
          <li>3. Mobile phones and smart watches are not allowed in the hall.</li>
          <li>4. Bring your own pens, pencils and geometry set.</li>
        </ol>
      </div>

      {/* ----------------------------- Signatures ---------------------------- */}
      <div className="mt-10 flex justify-between gap-8 text-[0.625rem]">
        {["Candidate's Signature", "Class Teacher", "Principal"].map((label) => (
          <div key={label} className="flex-1 text-center">
            <div className="border-t border-neutral-400 pt-1 font-semibold text-neutral-600">
              {label}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function AdmitCardsView() {
  const school = useSchoolProfile();

  const [sections, setSections] = React.useState<Section[]>([]);
  const [exams, setExams] = React.useState<Exam[]>([]);
  const [terms, setTerms] = React.useState<Term[]>([]);

  const [examId, setExamId] = React.useState("");
  const [sectionId, setSectionId] = React.useState("");

  const [subjects, setSubjects] = React.useState<ExamSubject[] | null>(null);
  const [roster, setRoster] = React.useState<RosterEntry[] | null>(null);

  // Scope: the current year's sections, exams and terms.
  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      const year = await getCurrentAcademicYear();
      if (!year) return;
      const [loadedSections, loadedExams, loadedTerms] = await Promise.all([
        listSections(year.id),
        listExams({ academic_year_id: year.id }),
        listTerms(year.id).catch(() => [] as Term[]),
      ]);
      if (cancelled) return;
      setSections(loadedSections);
      setExams(loadedExams);
      setTerms(loadedTerms);
    }

    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!examId) return;
    let cancelled = false;

    listExamSubjects(examId)
      .then((loaded) => {
        if (!cancelled) setSubjects(loaded);
      })
      .catch(() => {
        if (!cancelled) setSubjects([]);
      });

    return () => {
      cancelled = true;
    };
  }, [examId]);

  React.useEffect(() => {
    if (!sectionId) return;
    let cancelled = false;

    listSectionRoster(sectionId)
      .then((loaded) => {
        if (!cancelled) setRoster(loaded);
      })
      .catch(() => {
        if (!cancelled) setRoster([]);
      });

    return () => {
      cancelled = true;
    };
  }, [sectionId]);

  const exam = exams.find((entry) => String(entry.id) === examId);
  const section = sections.find((entry) => String(entry.id) === sectionId);
  const term = terms.find((entry) => sameId(entry.id, exam?.term_id));

  const isReady = Boolean(examId && sectionId && exam);
  const isLoading = isReady && (roster === null || subjects === null);
  const cards = isReady && !isLoading ? (roster ?? []) : [];

  return (
    <PrintShell
      title="Admit Cards"
      description="One admit card per student, with the exam's own subject timetable printed on it."
      count={cards.length}
      controls={
        <Card className="flex flex-col gap-4 p-4 shadow-card sm:flex-row sm:items-end">
          <Field id="admit_exam" label="Examination">
            <Select
              value={examId}
              onValueChange={(value) => {
                setExamId(value);
                setSubjects(null);
              }}
              disabled={exams.length === 0}
            >
              <SelectTrigger id="admit_exam" className="h-9 w-full rounded-xl sm:w-64">
                <SelectValue
                  placeholder={
                    exams.length === 0 ? "No exams scheduled" : "Select an exam"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {exams.map((entry) => (
                  <SelectItem key={entry.id} value={String(entry.id)}>
                    {entry.name?.trim() || `Exam ${entry.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <SectionPicker
            id="admit_section"
            sections={sections}
            value={sectionId}
            onChange={(value) => {
              setSectionId(value);
              setRoster(null);
            }}
          />
        </Card>
      }
    >
      {!isReady ? (
        <PrintEmpty>
          Choose an exam and a section — every student in that section gets a
          card.
        </PrintEmpty>
      ) : isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-72 rounded-3xl" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <PrintEmpty>No students enrolled in this section yet.</PrintEmpty>
      ) : (
        cards.map((entry, index) => (
          <PageSheet
            key={String(entry.enrollment_id)}
            breakAfter={index < cards.length - 1}
          >
            <AdmitCard
              entry={entry}
              exam={exam as Exam}
              term={term}
              subjects={subjects ?? []}
              section={section}
              school={school}
            />
          </PageSheet>
        ))
      )}
    </PrintShell>
  );
}
