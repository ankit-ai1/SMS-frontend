"use client";

import * as React from "react";
import { Loader2, Search, X } from "lucide-react";

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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCurrentAcademicYear,
  getStudent,
  listEnrollments,
  listStudents,
  sameId,
  type Enrollment,
  type Student,
  type StudentDetail,
} from "@/lib/api";
import { formatDate, humanizeToken, initialsFrom } from "@/lib/format";

const SEARCH_DEBOUNCE_MS = 350;
const RESULT_LIMIT = 8;

/** The three certificates an Indian school issues most often. */
const KINDS = [
  {
    value: "bonafide",
    label: "Bonafide Certificate",
    title: "Bonafide Certificate",
  },
  {
    value: "character",
    label: "Character Certificate",
    title: "Character Certificate",
  },
  {
    value: "transfer",
    label: "Transfer Certificate",
    title: "Transfer Certificate",
  },
] as const;

type Kind = (typeof KINDS)[number]["value"];

function studentName(student: { first_name: string; last_name: string }): string {
  return `${student.first_name} ${student.last_name}`.trim() || "—";
}

/* -------------------------------------------------------------------------- */
/*                                    Body                                    */
/* -------------------------------------------------------------------------- */

function CertificateBody({
  kind,
  student,
  enrollment,
  school,
  reason,
}: {
  kind: Kind;
  student: StudentDetail;
  enrollment: Enrollment | null;
  school: SchoolProfile | null;
  reason: string;
}) {
  const name = studentName(student);
  const placement =
    [enrollment?.class_name?.trim(), enrollment?.section_name?.trim()]
      .filter(Boolean)
      .join(" — ") || "—";
  const schoolName = school?.name?.trim() || "this school";
  const session = school?.session?.trim();

  const strong = "font-bold text-neutral-900";

  if (kind === "bonafide") {
    return (
      <p className="text-sm leading-[2.1] text-neutral-800">
        This is to certify that <span className={strong}>{name}</span>, bearing
        Admission Number{" "}
        <span className={strong}>{student.admission_number || "—"}</span>, is a
        bonafide student of <span className={strong}>{schoolName}</span>. As per
        the records of this institution, the student is presently studying in
        Class <span className={strong}>{placement}</span>
        {session ? (
          <>
            {" "}
            for the academic session <span className={strong}>{session}</span>
          </>
        ) : null}
        . The date of birth recorded in our register is{" "}
        <span className={strong}>{formatDate(student.date_of_birth)}</span>.
        {reason.trim() ? (
          <>
            {" "}
            This certificate is issued on the request of the student for the
            purpose of <span className={strong}>{reason.trim()}</span>.
          </>
        ) : (
          " This certificate is issued on the request of the student."
        )}
      </p>
    );
  }

  if (kind === "character") {
    return (
      <p className="text-sm leading-[2.1] text-neutral-800">
        This is to certify that <span className={strong}>{name}</span>, bearing
        Admission Number{" "}
        <span className={strong}>{student.admission_number || "—"}</span>, was a
        student of <span className={strong}>{schoolName}</span> in Class{" "}
        <span className={strong}>{placement}</span>. During the period of study
        at this institution, the conduct and character of the student were found
        to be <span className={strong}>satisfactory</span>. The student did not
        come to the notice of the authorities for any act of indiscipline.
        {reason.trim() ? (
          <>
            {" "}
            This certificate is issued for the purpose of{" "}
            <span className={strong}>{reason.trim()}</span>.
          </>
        ) : null}{" "}
        We wish the student success in all future endeavours.
      </p>
    );
  }

  return (
    <p className="text-sm leading-[2.1] text-neutral-800">
      This is to certify that <span className={strong}>{name}</span>, bearing
      Admission Number{" "}
      <span className={strong}>{student.admission_number || "—"}</span>, whose
      date of birth as recorded in this institution is{" "}
      <span className={strong}>{formatDate(student.date_of_birth)}</span>, was a
      student of <span className={strong}>{schoolName}</span> and was last
      studying in Class <span className={strong}>{placement}</span>
      {student.admission_date ? (
        <>
          {" "}
          having been admitted on{" "}
          <span className={strong}>{formatDate(student.admission_date)}</span>
        </>
      ) : null}
      . The student has no dues outstanding against them, and their name has been
      struck off the rolls of this institution
      {reason.trim() ? (
        <>
          {" "}
          on account of <span className={strong}>{reason.trim()}</span>
        </>
      ) : null}
      . The conduct of the student was satisfactory.
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function CertificatesView() {
  const school = useSchoolProfile();

  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [results, setResults] = React.useState<Student[] | null>(null);

  const [picked, setPicked] = React.useState<Student | null>(null);
  const [detail, setDetail] = React.useState<StudentDetail | null>(null);
  const [enrollment, setEnrollment] = React.useState<Enrollment | null>(null);

  const [kind, setKind] = React.useState<Kind>("bonafide");
  const [reason, setReason] = React.useState("");
  const [serial, setSerial] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const term = debounced.trim();

  React.useEffect(() => {
    if (!term) return;
    let cancelled = false;

    listStudents({ page: 1, per_page: RESULT_LIMIT, search: term })
      .then((loaded) => {
        if (!cancelled) setResults(loaded.items);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      });

    return () => {
      cancelled = true;
    };
  }, [term]);

  // The full record and the current placement are both needed on the paper.
  React.useEffect(() => {
    if (!picked) return;
    let cancelled = false;
    const studentId = picked.id;

    async function load() {
      const [full, year] = await Promise.all([
        getStudent(studentId),
        getCurrentAcademicYear().catch(() => null),
      ]);
      if (cancelled) return;
      setDetail(full);

      if (!year) return;
      const rows = await listEnrollments({
        academic_year_id: year.id,
        student_id: studentId,
      }).catch(() => [] as Enrollment[]);
      if (cancelled) return;
      setEnrollment(
        rows.find((row) => sameId(row.student_id, studentId)) ?? null
      );
    }

    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [picked]);

  const kindMeta = KINDS.find((entry) => entry.value === kind);
  const isReady = Boolean(picked && detail);

  return (
    <PrintShell
      title="Certificates"
      description="Bonafide, character and transfer certificates on the school's letterhead."
      count={isReady ? 1 : 0}
      controls={
        <Card className="space-y-4 p-4 shadow-card">
          {/* ------------------------------ Student --------------------------- */}
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                if (picked) {
                  setPicked(null);
                  setDetail(null);
                  setEnrollment(null);
                }
              }}
              placeholder="Search the student by name or admission number"
              aria-label="Search students"
              className="h-10 rounded-2xl pr-9 pl-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setResults(null);
                  setPicked(null);
                  setDetail(null);
                  setEnrollment(null);
                }}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {picked ? (
            <div className="flex items-center gap-3 rounded-xl bg-brand-50 px-3.5 py-2.5 ring-1 ring-brand-100">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-[0.625rem] font-bold text-brand-700">
                {initialsFrom(studentName(picked))}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {studentName(picked)}
                </p>
                <p className="truncate text-xs text-muted-foreground tabular-nums">
                  {picked.admission_number || "—"}
                </p>
              </div>
              {!detail && (
                <Loader2 className="size-4 shrink-0 animate-spin text-brand-600" />
              )}
            </div>
          ) : term && results ? (
            results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No student matches that.
              </p>
            ) : (
              <ul className="divide-y overflow-hidden rounded-xl border">
                {results.map((student) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => setPicked(student)}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors outline-none hover:bg-brand-50/60 focus-visible:bg-brand-50/60"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[0.625rem] font-bold text-brand-700">
                        {initialsFrom(studentName(student))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {studentName(student)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground tabular-nums">
                          {student.admission_number || "—"}
                          {student.gender
                            ? ` · ${humanizeToken(student.gender)}`
                            : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {/* ------------------------------ Options --------------------------- */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Field id="cert_kind" label="Certificate">
              <Select value={kind} onValueChange={(value) => setKind(value as Kind)}>
                <SelectTrigger id="cert_kind" className="h-9 w-full rounded-xl sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              id="cert_reason"
              label={kind === "transfer" ? "Reason for leaving" : "Purpose"}
            >
              <Input
                id="cert_reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={
                  kind === "transfer"
                    ? "relocation of the family"
                    : "applying for a passport"
                }
                className="h-9 w-full rounded-xl sm:w-64"
              />
            </Field>

            <Field id="cert_serial" label="Serial No.">
              <Input
                id="cert_serial"
                value={serial}
                onChange={(event) => setSerial(event.target.value)}
                placeholder="TC/2026/014"
                className="h-9 w-full rounded-xl sm:w-40"
              />
            </Field>
          </div>
        </Card>
      }
    >
      {!isReady || !detail ? (
        <PrintEmpty>
          Search for a student and pick them — the certificate is written from
          their record.
        </PrintEmpty>
      ) : (
        <PageSheet breakAfter={false}>
          <div className="border-4 border-double border-brand-700/40 p-8">
            <SchoolLetterhead school={school} />
            <DocumentTitle>{kindMeta?.title}</DocumentTitle>

            <div className="mt-4 flex justify-between text-[0.625rem] text-neutral-500">
              <span>Serial No.: {serial.trim() || "—"}</span>
              <span>Date: {formatDate(new Date())}</span>
            </div>

            <div className="mt-6">
              <CertificateBody
                kind={kind}
                student={detail}
                enrollment={enrollment}
                school={school}
                reason={reason}
              />
            </div>

            <div className="mt-16 flex justify-between gap-8 text-[0.625rem]">
              {["Class Teacher", "Office Seal", "Principal"].map((label) => (
                <div key={label} className="flex-1 text-center">
                  <div className="border-t border-neutral-400 pt-1 font-semibold text-neutral-600">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PageSheet>
      )}
    </PrintShell>
  );
}
