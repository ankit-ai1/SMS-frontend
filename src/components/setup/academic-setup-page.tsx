"use client";

import * as React from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  GraduationCap,
  Layers3,
  Loader2,
  Plus,
  School,
  ShieldCheck,
  Tags,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Field, SectionEmpty, SectionError, fieldProps } from "@/components/shared/form-field";
import { Panel, RowActions } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createAcademicYear,
  createClass,
  createDepartment,
  createDesignation,
  createExamType,
  createSection,
  createSubject,
  createTerm,
  deleteAcademicYear,
  deleteClass,
  deleteDepartment,
  deleteDesignation,
  deleteExamType,
  deleteSection,
  deleteSubject,
  deleteTerm,
  isConflictError,
  listAcademicYears,
  listClasses,
  listDepartments,
  listDesignations,
  listExamTypes,
  listSections,
  listSubjects,
  listTerms,
  setCurrentAcademicYear,
  updateAcademicYear,
  updateClass,
  updateDepartment,
  updateDesignation,
  updateExamType,
  updateSection,
  updateSubject,
  updateTerm,
  type AcademicYear,
  type Department,
  type Designation,
  type ExamType,
  type SchoolClass,
  type Section,
  type Subject,
  type Term,
} from "@/lib/api";

const TABS = [
  { value: "departments", label: "Departments", icon: UsersRound },
  { value: "designations", label: "Designations", icon: Tags },
  { value: "subjects", label: "Subjects", icon: BookOpen },
  { value: "classes", label: "Classes", icon: School },
  { value: "sections", label: "Sections", icon: Layers3 },
  { value: "years", label: "Years & Terms", icon: CalendarDays },
  { value: "exam-types", label: "Exam Types", icon: ShieldCheck },
];

type ResourceKey =
  | "departments"
  | "designations"
  | "subjects"
  | "classes"
  | "sections"
  | "years"
  | "terms"
  | "examTypes";
type ErrorMap = Partial<Record<ResourceKey, string>>;

type FormShellProps = {
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

function FormShell({ open, title, description, onOpenChange, children }: FormShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton({ pending, label, pendingLabel = "Saving" }: { pending: boolean; label: string; pendingLabel?: string }) {
  return (
    <Button type="submit" size="lg" disabled={pending} className="rounded-xl shadow-brand transition-all hover:bg-brand-700">
      {pending ? <><Loader2 className="size-4 animate-spin" />{pendingLabel}</> : <><Check className="size-4" />{label}</>}
    </Button>
  );
}

function ResourcePanel<T extends { id: string | number }>({
  title,
  description,
  icon: Icon,
  items,
  error,
  onRetry,
  onAdd,
  addLabel,
  emptyTitle,
  emptyDescription,
  renderRow,
}: {
  title: string;
  description: string;
  icon: typeof UsersRound;
  items: T[] | null;
  error?: string;
  onRetry: () => void;
  onAdd: () => void;
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  renderRow: (item: T) => React.ReactNode;
}) {
  return (
    <Panel
      title={title}
      description={description}
      icon={Icon}
      action={<Button size="lg" onClick={onAdd} className="rounded-xl shadow-brand transition-all hover:bg-brand-700"><Plus className="size-4" />{addLabel}</Button>}
    >
      {error ? <SectionError message={error} onRetry={onRetry} /> : items === null ? (
        <ul className="divide-y">{Array.from({ length: 4 }, (_, index) => <li key={index} className="flex items-center gap-4 px-4 py-4"><Skeleton className="size-9 rounded-xl" /><Skeleton className="h-4 w-48 max-w-[55%] rounded-md" /><Skeleton className="ml-auto h-4 w-16 rounded-md" /></li>)}</ul>
      ) : items.length === 0 ? (
        <SectionEmpty icon={Icon} title={emptyTitle} description={emptyDescription}><Button variant="outline" size="lg" onClick={onAdd} className="rounded-xl"><Plus className="size-4" />{addLabel}</Button></SectionEmpty>
      ) : <ul className="divide-y">{items.map(renderRow)}</ul>}
    </Panel>
  );
}

function Row({ icon: Icon, title, meta, action }: { icon: typeof UsersRound; title: string; meta?: string; action?: React.ReactNode }) {
  return <li className="group/row flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{title}</p>{meta && <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>}</div>{action}</li>;
}

function NameForm({ fieldLabel, initialValue, submitLabel, onSubmit, onCancel }: { fieldLabel: string; initialValue?: string; submitLabel: string; onSubmit: (value: string) => Promise<void>; onCancel: () => void }) {
  const [value, setValue] = React.useState(initialValue ?? "");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) { setError(`${fieldLabel} is required.`); return; }
    setPending(true);
    try { await onSubmit(value.trim()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this item."); setPending(false); }
  }
  return <form onSubmit={submit} noValidate className="space-y-5"><Field id="setup_name" label={fieldLabel} error={error}><Input {...fieldProps("setup_name", error)} value={value} onChange={(event) => { setValue(event.target.value); setError(""); }} disabled={pending} autoComplete="off" className="h-10 rounded-xl" /></Field><DialogFooter><Button type="button" variant="outline" size="lg" className="rounded-xl" onClick={onCancel} disabled={pending}>Cancel</Button><SubmitButton pending={pending} label={submitLabel} /></DialogFooter></form>;
}

function SubjectForm({ item, onSubmit, onCancel }: { item?: Subject; onSubmit: (name: string, code?: string) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = React.useState(item?.name ?? "");
  const [code, setCode] = React.useState(item?.code ?? "");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!name.trim()) { setError("Subject name is required."); return; } setPending(true); try { await onSubmit(name.trim(), code.trim() || undefined); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this subject."); setPending(false); } }
  return <form onSubmit={submit} noValidate className="space-y-4"><Field id="subject_name" label="Subject name" error={error}><Input {...fieldProps("subject_name", error)} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} disabled={pending} className="h-10 rounded-xl" /></Field><Field id="subject_code" label="Code" hint="Optional short code, such as MAT-01."><Input {...fieldProps("subject_code")} value={code} onChange={(event) => setCode(event.target.value)} disabled={pending} className="h-10 rounded-xl" /></Field><DialogFooter><Button type="button" variant="outline" size="lg" className="rounded-xl" onClick={onCancel} disabled={pending}>Cancel</Button><SubmitButton pending={pending} label={item ? "Save Changes" : "Add Subject"} /></DialogFooter></form>;
}

function ClassForm({ item, onSubmit, onCancel }: { item?: SchoolClass; onSubmit: (name: string, numericOrder: number) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = React.useState(item?.name ?? "");
  const [order, setOrder] = React.useState(item?.numeric_order?.toString() ?? "");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const numericOrder = Number(order); if (!name.trim()) { setError("Class name is required."); return; } if (!Number.isInteger(numericOrder) || numericOrder < 0) { setError("Numeric order must be a whole number."); return; } setPending(true); try { await onSubmit(name.trim(), numericOrder); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this class."); setPending(false); } }
  return <form onSubmit={submit} noValidate className="space-y-4"><Field id="class_name" label="Class name" error={error}><Input {...fieldProps("class_name", error)} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} disabled={pending} className="h-10 rounded-xl" /></Field><Field id="class_order" label="Numeric order" hint="Used to sort classes in the school flow."><Input {...fieldProps("class_order", error)} type="number" min="0" step="1" value={order} onChange={(event) => { setOrder(event.target.value); setError(""); }} disabled={pending} className="h-10 rounded-xl" /></Field><DialogFooter><Button type="button" variant="outline" size="lg" className="rounded-xl" onClick={onCancel} disabled={pending}>Cancel</Button><SubmitButton pending={pending} label={item ? "Save Changes" : "Add Class"} /></DialogFooter></form>;
}

function SectionForm({ item, classes, years, currentYearId, onSubmit, onCancel }: { item?: Section; classes: SchoolClass[]; years: AcademicYear[]; currentYearId?: string; onSubmit: (classId: string, yearId: string, name: string, capacity?: number) => Promise<void>; onCancel: () => void }) {
  const [classId, setClassId] = React.useState(item?.class_id?.toString() ?? "");
  const [yearId, setYearId] = React.useState(item?.academic_year_id?.toString() ?? currentYearId ?? "");
  const [name, setName] = React.useState(item?.name ?? "");
  const [capacity, setCapacity] = React.useState(item?.capacity?.toString() ?? "");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const parsedCapacity = capacity ? Number(capacity) : undefined; if (!item && !classId) { setError("Select a class."); return; } if (!item && !yearId) { setError("Select an academic year."); return; } if (!name.trim()) { setError("Section name is required."); return; } if (parsedCapacity !== undefined && (!Number.isInteger(parsedCapacity) || parsedCapacity < 1)) { setError("Capacity must be a positive whole number."); return; } setPending(true); try { await onSubmit(classId, yearId, name.trim(), parsedCapacity); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this section."); setPending(false); } }
  return <form onSubmit={submit} noValidate className="space-y-4">{!item && <><Field id="section_class" label="Class" error={error}><Select value={classId} onValueChange={(value) => { setClassId(value); setError(""); }} disabled={pending}><SelectTrigger {...fieldProps("section_class", error)} className="h-10 w-full rounded-xl"><SelectValue placeholder="Select class" /></SelectTrigger><SelectContent>{classes.map((schoolClass) => <SelectItem key={schoolClass.id} value={String(schoolClass.id)}>{schoolClass.name}</SelectItem>)}</SelectContent></Select></Field><Field id="section_year" label="Academic year"><Select value={yearId} onValueChange={setYearId} disabled={pending}><SelectTrigger {...fieldProps("section_year")} className="h-10 w-full rounded-xl"><SelectValue placeholder="Select year" /></SelectTrigger><SelectContent>{years.map((year) => <SelectItem key={year.id} value={String(year.id)}>{year.name || `Year ${year.id}`}{year.is_current ? " (Current)" : ""}</SelectItem>)}</SelectContent></Select></Field></>}<Field id="section_name" label="Section name" error={error}><Input {...fieldProps("section_name", error)} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} disabled={pending} className="h-10 rounded-xl" placeholder="A" /></Field><Field id="section_capacity" label="Capacity" hint="Optional maximum student count."><Input {...fieldProps("section_capacity")} type="number" min="1" step="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} disabled={pending} className="h-10 rounded-xl" /></Field><DialogFooter><Button type="button" variant="outline" size="lg" className="rounded-xl" onClick={onCancel} disabled={pending}>Cancel</Button><SubmitButton pending={pending} label={item ? "Save Changes" : "Add Section"} /></DialogFooter></form>;
}

function DateFields({ prefix, initial, onSubmit, onCancel, submitLabel }: { prefix: string; initial?: { name?: string | null; start_date?: string | null; end_date?: string | null }; onSubmit: (name: string, startDate: string, endDate: string) => Promise<void>; onCancel: () => void; submitLabel: string }) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [startDate, setStartDate] = React.useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = React.useState(initial?.end_date ?? "");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!name.trim() || !startDate || !endDate) { setError("Name, start date, and end date are required."); return; } if (endDate < startDate) { setError("End date must be after the start date."); return; } setPending(true); try { await onSubmit(name.trim(), startDate, endDate); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this item."); setPending(false); } }
  return <form onSubmit={submit} noValidate className="space-y-4"><Field id={`${prefix}_name`} label="Name" error={error}><Input {...fieldProps(`${prefix}_name`, error)} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} disabled={pending} className="h-10 rounded-xl" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field id={`${prefix}_start`} label="Start date"><Input {...fieldProps(`${prefix}_start`)} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} disabled={pending} className="h-10 rounded-xl" /></Field><Field id={`${prefix}_end`} label="End date"><Input {...fieldProps(`${prefix}_end`)} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} disabled={pending} className="h-10 rounded-xl" /></Field></div><DialogFooter><Button type="button" variant="outline" size="lg" className="rounded-xl" onClick={onCancel} disabled={pending}>Cancel</Button><SubmitButton pending={pending} label={submitLabel} /></DialogFooter></form>;
}

function currentYear(years: AcademicYear[]) { return years.find((year) => year.is_current) ?? years[0]; }

/**
 * One confirm dialog serves all eight sections, so the row that opened it
 * carries its own delete call rather than the page keeping a kind -> handler map.
 */
type DeleteTarget = { noun: string; label: string; remove: () => Promise<unknown> };

export default function AcademicSetupPage() {
  const [departments, setDepartments] = React.useState<Department[] | null>(null);
  const [designations, setDesignations] = React.useState<Designation[] | null>(null);
  const [subjects, setSubjects] = React.useState<Subject[] | null>(null);
  const [classes, setClasses] = React.useState<SchoolClass[] | null>(null);
  const [sections, setSections] = React.useState<Section[] | null>(null);
  const [years, setYears] = React.useState<AcademicYear[] | null>(null);
  const [terms, setTerms] = React.useState<Term[] | null>(null);
  const [examTypes, setExamTypes] = React.useState<ExamType[] | null>(null);
  const [errors, setErrors] = React.useState<ErrorMap>({});
  const [reloadKey, setReloadKey] = React.useState(0);
  const [selectedSectionYear, setSelectedSectionYear] = React.useState("");
  const [selectedTermsYear, setSelectedTermsYear] = React.useState("");
  const [dialog, setDialog] = React.useState<string | null>(null);
  const [editingDepartment, setEditingDepartment] = React.useState<Department>();
  const [editingDesignation, setEditingDesignation] = React.useState<Designation>();
  const [editingSubject, setEditingSubject] = React.useState<Subject>();
  const [editingClass, setEditingClass] = React.useState<SchoolClass>();
  const [editingSection, setEditingSection] = React.useState<Section>();
  const [editingYear, setEditingYear] = React.useState<AcademicYear>();
  const [editingTerm, setEditingTerm] = React.useState<Term>();
  const [editingExamType, setEditingExamType] = React.useState<ExamType>();
  const [yearToMakeCurrent, setYearToMakeCurrent] = React.useState<AcademicYear | null>(null);
  const [deleting, setDeleting] = React.useState<DeleteTarget | null>(null);

  function reload() { setReloadKey((key) => key + 1); }
  function saved(message: string) { toast.success(message); setDialog(null); reload(); }

  React.useEffect(() => {
    let cancelled = false;
    const load = <T,>(key: ResourceKey, request: Promise<T>, setter: (value: T) => void) => request.then((value) => { if (cancelled) return; setter(value); setErrors((current) => { const next = { ...current }; delete next[key]; return next; }); }).catch((cause: unknown) => { if (!cancelled) setErrors((current) => ({ ...current, [key]: cause instanceof Error ? cause.message : "Something went wrong while loading this section." })); });
    load("departments", listDepartments(), setDepartments); load("designations", listDesignations(), setDesignations); load("subjects", listSubjects(), setSubjects); load("classes", listClasses(), setClasses); load("years", listAcademicYears(), (loaded) => { setYears(loaded); const year = currentYear(loaded); if (year) { setSelectedSectionYear(String(year.id)); setSelectedTermsYear(String(year.id)); } }); load("examTypes", listExamTypes(), setExamTypes);
    return () => { cancelled = true; };
  }, [reloadKey]);

  React.useEffect(() => {
    if (!selectedSectionYear) return;
    let cancelled = false;
    listSections(selectedSectionYear).then((loaded) => { if (cancelled) return; setSections(loaded); setErrors((current) => { const next = { ...current }; delete next.sections; return next; }); }).catch((cause: unknown) => { if (!cancelled) setErrors((current) => ({ ...current, sections: cause instanceof Error ? cause.message : "Could not load sections." })); });
    return () => { cancelled = true; };
  }, [selectedSectionYear, reloadKey]);

  React.useEffect(() => {
    if (!selectedTermsYear) return;
    let cancelled = false;
    listTerms(selectedTermsYear).then((loaded) => { if (cancelled) return; setTerms(loaded); setErrors((current) => { const next = { ...current }; delete next.terms; return next; }); }).catch((cause: unknown) => { if (!cancelled) setErrors((current) => ({ ...current, terms: cause instanceof Error ? cause.message : "Could not load terms." })); });
    return () => { cancelled = true; };
  }, [selectedTermsYear, reloadKey]);

  /** Clears whatever was last edited so the dialog opens as a blank add form. */
  function openAdd(next: string) { setEditingDepartment(undefined); setEditingDesignation(undefined); setEditingSubject(undefined); setEditingClass(undefined); setEditingSection(undefined); setEditingYear(undefined); setEditingTerm(undefined); setEditingExamType(undefined); setDialog(next); }

  /**
   * A 409 means the record is still referenced somewhere. The backend names the
   * holder, so its message is kept and only given a next step to act on.
   */
  async function runDelete(target: DeleteTarget) {
    try {
      await target.remove();
    } catch (cause) {
      if (isConflictError(cause)) throw new Error(`${cause.message} Reassign or remove those records first, then delete this ${target.noun}.`);
      throw cause;
    }
    toast.success(`${target.label} deleted`);
    setDeleting(null);
    reload();
  }

  const yearList = years ?? [];
  const activeSectionYear = yearList.find((year) => String(year.id) === selectedSectionYear);
  const activeTermsYear = yearList.find((year) => String(year.id) === selectedTermsYear);
  const sectionClasses = classes ?? [];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-brand-600 uppercase"><GraduationCap className="size-4" />Academic control center</div><h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Academic Setup</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Keep the school&apos;s academic master data accurate and ready for daily operations.</p></div><div className="rounded-2xl border border-brand-100 bg-brand-50/75 px-4 py-3 text-right shadow-soft"><p className="text-[0.6875rem] font-bold tracking-wide text-brand-700 uppercase">Managed here</p><p className="mt-1 text-sm font-semibold text-brand-900">{[departments, designations, subjects, classes, sections, years, examTypes].filter(Boolean).length}/7 data groups online</p></div></div>
    <Tabs defaultValue="departments" className="gap-5">
      <div className="-mx-1 overflow-x-auto px-1 pb-1"><TabsList className="w-max gap-0.5 rounded-xl p-1">{TABS.map(({ value, label, icon: Icon }) => <TabsTrigger key={value} value={value} className="gap-2 rounded-lg px-3.5 data-active:text-brand-700 dark:data-active:text-brand-300"><Icon className="size-4" /><span>{label}</span></TabsTrigger>)}</TabsList></div>
      <TabsContent value="departments"><ResourcePanel title="Departments" description="Organise staff and school operations by department." icon={UsersRound} items={departments} error={errors.departments} onRetry={reload} onAdd={() => openAdd("department")} addLabel="Add Department" emptyTitle="No departments yet" emptyDescription="Add the departments your staff belongs to." renderRow={(item) => <Row key={item.id} icon={UsersRound} title={item.name} action={<RowActions label={item.name} onEdit={() => { setEditingDepartment(item); setDialog("department"); }} onDelete={() => setDeleting({ noun: "department", label: item.name, remove: () => deleteDepartment(item.id) })} />} />} /></TabsContent>
      <TabsContent value="designations"><ResourcePanel title="Designations" description="Maintain the role titles used across your staff directory." icon={Tags} items={designations} error={errors.designations} onRetry={reload} onAdd={() => openAdd("designation")} addLabel="Add Designation" emptyTitle="No designations yet" emptyDescription="Add role titles such as Principal or Teacher." renderRow={(item) => <Row key={item.id} icon={Tags} title={item.title} action={<RowActions label={item.title} onEdit={() => { setEditingDesignation(item); setDialog("designation"); }} onDelete={() => setDeleting({ noun: "designation", label: item.title, remove: () => deleteDesignation(item.id) })} />} />} /></TabsContent>
      <TabsContent value="subjects"><ResourcePanel title="Subjects" description="Define the subjects available in exams and academic records." icon={BookOpen} items={subjects} error={errors.subjects} onRetry={reload} onAdd={() => openAdd("subject")} addLabel="Add Subject" emptyTitle="No subjects yet" emptyDescription="Add the subjects taught at your school." renderRow={(item) => <Row key={item.id} icon={BookOpen} title={item.name} meta={item.code ? `Code: ${item.code}` : undefined} action={<RowActions label={item.name} onEdit={() => { setEditingSubject(item); setDialog("subject"); }} onDelete={() => setDeleting({ noun: "subject", label: item.name, remove: () => deleteSubject(item.id) })} />} />} /></TabsContent>
      <TabsContent value="classes"><ResourcePanel title="Classes" description="Set the class names and their display order." icon={School} items={classes} error={errors.classes} onRetry={reload} onAdd={() => openAdd("class")} addLabel="Add Class" emptyTitle="No classes yet" emptyDescription="Add classes before creating sections." renderRow={(item) => <Row key={item.id} icon={School} title={item.name} meta={item.numeric_order != null ? `Order ${item.numeric_order}` : undefined} action={<RowActions label={item.name} onEdit={() => { setEditingClass(item); setDialog("class"); }} onDelete={() => setDeleting({ noun: "class", label: item.name, remove: () => deleteClass(item.id) })} />} />} /></TabsContent>
      <TabsContent value="sections"><div className="space-y-4"><Card className="shadow-soft"><CardContent className="flex flex-wrap items-center gap-3 p-4"><div className="mr-auto"><p className="text-sm font-semibold">Sections by academic year</p><p className="mt-0.5 text-xs text-muted-foreground">The current year is selected automatically.</p></div><Select value={selectedSectionYear} onValueChange={setSelectedSectionYear}><SelectTrigger className="h-10 w-full rounded-xl sm:w-56"><SelectValue placeholder="Select academic year" /></SelectTrigger><SelectContent>{yearList.map((year) => <SelectItem key={year.id} value={String(year.id)}>{year.name || `Year ${year.id}`}{year.is_current ? " (Current)" : ""}</SelectItem>)}</SelectContent></Select></CardContent></Card><ResourcePanel title={`Sections${activeSectionYear?.name ? ` · ${activeSectionYear.name}` : ""}`} description="Connect a class and academic year to its sections." icon={Layers3} items={sections} error={errors.sections} onRetry={reload} onAdd={() => openAdd("section")} addLabel="Add Section" emptyTitle="No sections for this year" emptyDescription="Add sections such as A, B, or Blue House to get started." renderRow={(item) => <Row key={item.id} icon={Layers3} title={item.name} meta={`${item.class_name || "Class"}${item.capacity ? ` · Capacity ${item.capacity}` : ""}`} action={<RowActions label={item.name} onEdit={() => { setEditingSection(item); setDialog("section"); }} onDelete={() => setDeleting({ noun: "section", label: item.name, remove: () => deleteSection(item.id) })} />} />} /></div></TabsContent>
      <TabsContent value="years"><div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"><ResourcePanel title="Academic Years" description="Set the school calendar and choose the active year." icon={CalendarDays} items={years} error={errors.years} onRetry={reload} onAdd={() => openAdd("year")} addLabel="Add Year" emptyTitle="No academic years yet" emptyDescription="Create a year before adding sections and terms." renderRow={(item) => <Row key={item.id} icon={CalendarDays} title={item.name || `Year ${item.id}`} meta={`${item.start_date || "Start date not set"} to ${item.end_date || "End date not set"}`} action={<div className="flex items-center gap-1">{item.is_current ? <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">Current</span> : <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setYearToMakeCurrent(item)}>Set current</Button>}<RowActions label={item.name || `Year ${item.id}`} onEdit={() => { setEditingYear(item); setDialog("year"); }} onDelete={() => setDeleting({ noun: "academic year", label: item.name || `Year ${item.id}`, remove: () => deleteAcademicYear(item.id) })} /></div>} />} /><ResourcePanel title={`Terms${activeTermsYear?.name ? ` · ${activeTermsYear.name}` : ""}`} description="Break the active academic year into teaching terms." icon={CalendarDays} items={terms} error={errors.terms} onRetry={reload} onAdd={() => openAdd("term")} addLabel="Add Term" emptyTitle="No terms yet" emptyDescription="Add terms such as Term 1 or Spring to this year." renderRow={(item) => <Row key={item.id} icon={CalendarDays} title={item.name || "Unnamed term"} meta={`${item.start_date || "Start date not set"} to ${item.end_date || "End date not set"}`} action={<RowActions label={item.name || "this term"} onEdit={() => { setEditingTerm(item); setDialog("term"); }} onDelete={() => setDeleting({ noun: "term", label: item.name || "Term", remove: () => deleteTerm(selectedTermsYear, item.id) })} />} />} /></div><Card className="mt-5 shadow-soft"><CardContent className="flex flex-wrap items-center gap-3 p-4"><div className="mr-auto"><p className="text-sm font-semibold">Terms for year</p><p className="mt-0.5 text-xs text-muted-foreground">Switch the year to review or add its terms.</p></div><Select value={selectedTermsYear} onValueChange={setSelectedTermsYear}><SelectTrigger className="h-10 w-full rounded-xl sm:w-56"><SelectValue placeholder="Select academic year" /></SelectTrigger><SelectContent>{yearList.map((year) => <SelectItem key={year.id} value={String(year.id)}>{year.name || `Year ${year.id}`}</SelectItem>)}</SelectContent></Select></CardContent></Card></TabsContent>
      <TabsContent value="exam-types"><ResourcePanel title="Exam Types" description="Keep assessment types consistent across the exam workflow." icon={ShieldCheck} items={examTypes} error={errors.examTypes} onRetry={reload} onAdd={() => openAdd("examType")} addLabel="Add Exam Type" emptyTitle="No exam types yet" emptyDescription="Add types such as Midterm, Final, or Unit Test." renderRow={(item) => <Row key={item.id} icon={ShieldCheck} title={item.name} action={<RowActions label={item.name} onEdit={() => { setEditingExamType(item); setDialog("examType"); }} onDelete={() => setDeleting({ noun: "exam type", label: item.name, remove: () => deleteExamType(item.id) })} />} />} /></TabsContent>
    </Tabs>

    <FormShell open={dialog === "department"} title={editingDepartment ? "Edit Department" : "Add Department"} description={editingDepartment ? "Rename this department across staff and operational records." : "Create a department for staff and operational records."} onOpenChange={(open) => !open && setDialog(null)}><NameForm fieldLabel="Department name" initialValue={editingDepartment?.name} submitLabel={editingDepartment ? "Save Changes" : "Add Department"} onCancel={() => setDialog(null)} onSubmit={async (value) => { if (editingDepartment) { await updateDepartment(editingDepartment.id, value); saved(`${value} updated`); } else { await createDepartment(value); saved(`${value} added`); } }} /></FormShell>
    <FormShell open={dialog === "designation"} title={editingDesignation ? "Edit Designation" : "Add Designation"} description={editingDesignation ? "Rename this role title across the staff directory." : "Create a role title for the staff directory."} onOpenChange={(open) => !open && setDialog(null)}><NameForm fieldLabel="Designation title" initialValue={editingDesignation?.title} submitLabel={editingDesignation ? "Save Changes" : "Add Designation"} onCancel={() => setDialog(null)} onSubmit={async (value) => { if (editingDesignation) { await updateDesignation(editingDesignation.id, value); saved(`${value} updated`); } else { await createDesignation(value); saved(`${value} added`); } }} /></FormShell>
    <FormShell open={dialog === "subject"} title={editingSubject ? "Edit Subject" : "Add Subject"} description={editingSubject ? "Update the subject name or its short code." : "Create a subject that can be used in academic records."} onOpenChange={(open) => !open && setDialog(null)}><SubjectForm item={editingSubject} onCancel={() => setDialog(null)} onSubmit={async (name, code) => { if (editingSubject) { await updateSubject(editingSubject.id, { name, code: code ?? "" }); saved(`${name} updated`); } else { await createSubject({ name, code }); saved(`${name} added`); } }} /></FormShell>
    <FormShell open={dialog === "class"} title={editingClass ? "Edit Class" : "Add Class"} description="Set the class name and its numeric display order." onOpenChange={(open) => !open && setDialog(null)}><ClassForm item={editingClass} onCancel={() => setDialog(null)} onSubmit={async (name, numericOrder) => { if (editingClass) { await updateClass(editingClass.id, { name, numeric_order: numericOrder }); saved(`${name} updated`); } else { await createClass({ name, numeric_order: numericOrder }); saved(`${name} added`); } }} /></FormShell>
    <FormShell open={dialog === "section"} title={editingSection ? "Edit Section" : "Add Section"} description="Create a section under a class and academic year." onOpenChange={(open) => !open && setDialog(null)}><SectionForm item={editingSection} classes={sectionClasses} years={yearList} currentYearId={currentYear(yearList)?.id?.toString()} onCancel={() => setDialog(null)} onSubmit={async (classId, yearId, name, capacity) => { if (editingSection) { await updateSection(editingSection.id, { name, ...(capacity === undefined ? {} : { capacity }) }); saved(`${name} updated`); } else { await createSection({ class_id: classId, academic_year_id: yearId, name, ...(capacity === undefined ? {} : { capacity }) }); saved(`${name} added`); } }} /></FormShell>
    <FormShell open={dialog === "year"} title={editingYear ? "Edit Academic Year" : "Add Academic Year"} description="Keep the school calendar precise for enrolment and reporting." onOpenChange={(open) => !open && setDialog(null)}><DateFields prefix="academic_year" initial={editingYear} submitLabel={editingYear ? "Save Changes" : "Add Year"} onCancel={() => setDialog(null)} onSubmit={async (name, startDate, endDate) => { if (editingYear) { await updateAcademicYear(editingYear.id, { name, start_date: startDate, end_date: endDate }); saved(`${name} updated`); } else { await createAcademicYear({ name, start_date: startDate, end_date: endDate }); saved(`${name} added`); } }} /></FormShell>
    <FormShell open={dialog === "term"} title={editingTerm ? "Edit Academic Term" : "Add Academic Term"} description={`${editingTerm ? "Update this term of" : "Add a term to"} ${activeTermsYear?.name || "the selected academic year"}.`} onOpenChange={(open) => !open && setDialog(null)}><DateFields prefix="academic_term" initial={editingTerm} submitLabel={editingTerm ? "Save Changes" : "Add Term"} onCancel={() => setDialog(null)} onSubmit={async (name, startDate, endDate) => { if (!selectedTermsYear) throw new Error("Select an academic year first."); if (editingTerm) { await updateTerm(selectedTermsYear, editingTerm.id, { name, start_date: startDate, end_date: endDate }); saved(`${name} updated`); } else { await createTerm(selectedTermsYear, { name, start_date: startDate, end_date: endDate }); saved(`${name} added`); } }} /></FormShell>
    <FormShell open={dialog === "examType"} title={editingExamType ? "Edit Exam Type" : "Add Exam Type"} description={editingExamType ? "Rename this assessment type across the exam workflow." : "Create an assessment type for the exam workflow."} onOpenChange={(open) => !open && setDialog(null)}><NameForm fieldLabel="Exam type name" initialValue={editingExamType?.name} submitLabel={editingExamType ? "Save Changes" : "Add Exam Type"} onCancel={() => setDialog(null)} onSubmit={async (value) => { if (editingExamType) { await updateExamType(editingExamType.id, value); saved(`${value} updated`); } else { await createExamType(value); saved(`${value} added`); } }} /></FormShell>
    <ConfirmDialog open={yearToMakeCurrent !== null} onOpenChange={(open) => !open && setYearToMakeCurrent(null)} title="Set current academic year?" description={`New sections, enrolments, and fee workflows will use ${yearToMakeCurrent?.name || "this year"} by default.`} confirmLabel="Set Current" pendingLabel="Updating" errorTitle="Could not change current year" onConfirm={async () => { if (!yearToMakeCurrent) return; await setCurrentAcademicYear(yearToMakeCurrent.id); toast.success(`${yearToMakeCurrent.name || "Academic year"} is now current`); setYearToMakeCurrent(null); reload(); }} />
    <ConfirmDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)} title={`Delete this ${deleting?.noun || "record"}?`} description={<>{deleting ? <strong className="font-semibold text-foreground">{deleting.label}</strong> : "This record"} will be removed from academic setup. This cannot be undone, and the delete is refused while anything still uses it.</>} confirmLabel="Delete" pendingLabel="Deleting" errorTitle={`Could not delete this ${deleting?.noun || "record"}`} onConfirm={async () => { if (deleting) await runDelete(deleting); }} />
  </div>;
}
