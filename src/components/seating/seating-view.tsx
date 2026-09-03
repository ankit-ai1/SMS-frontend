"use client";

import * as React from "react";
import {
  Armchair,
  Building2,
  Loader2,
  MousePointerClick,
  Plus,
  Printer,
  Shuffle,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Field, SectionEmpty, SectionError, fieldProps } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { sectionLabel } from "@/components/shared/section-picker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createExamRoom,
  generateSeating,
  getCurrentAcademicYear,
  getExamSeating,
  listExamRooms,
  listExams,
  listSections,
  type Exam,
  type ExamRoom,
  type ExamSeating,
  type SeatAllocation,
  type Section,
  type SeatingRoom,
} from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * One tint per class on the chart. The whole point of the plan is that no two
 * neighbours share a class, so the colours are what make it checkable at a
 * glance — an invigilator should spot a mistake without reading a name.
 */
const CLASS_TONES = [
  "bg-brand-100 text-brand-900 ring-brand-200",
  "bg-gold-soft text-neutral-900 ring-gold/25",
  "bg-sky-100 text-sky-900 ring-sky-200",
  "bg-fuchsia-100 text-fuchsia-900 ring-fuchsia-200",
  "bg-emerald-100 text-emerald-900 ring-emerald-200",
  "bg-orange-100 text-orange-900 ring-orange-200",
] as const;

/** Same class, same colour, every render — no randomness on a printed chart. */
function toneFor(label: string, order: string[]): string {
  const index = order.indexOf(label);
  return CLASS_TONES[(index < 0 ? 0 : index) % CLASS_TONES.length];
}

function classOf(seat: SeatAllocation): string {
  return (
    [seat.class_name?.trim(), seat.section_name?.trim()]
      .filter(Boolean)
      .join(" — ") || "Unassigned"
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Rooms                                   */
/* -------------------------------------------------------------------------- */

type RoomErrors = Partial<Record<"name" | "grid" | "capacity", string>>;

function RoomForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = React.useState("");
  const [rows, setRows] = React.useState("5");
  const [columns, setColumns] = React.useState("6");
  const [capacity, setCapacity] = React.useState("");
  const [errors, setErrors] = React.useState<RoomErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const gridSeats = (Number(rows) || 0) * (Number(columns) || 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found: RoomErrors = {};
    if (!name.trim()) found.name = "Give the hall a name.";
    if (gridSeats <= 0) found.grid = "Rows and columns must both be at least 1.";
    // The backend rejects this too; catching it here saves a round trip.
    if (capacity && Number(capacity) > gridSeats) {
      found.capacity = `A ${rows} × ${columns} grid is ${gridSeats} seats.`;
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      await createExamRoom({
        name: name.trim(),
        rows: Number(rows),
        columns: Number(columns),
        capacity: capacity ? Number(capacity) : undefined,
      });
      toast.success("Hall added", { description: `${name.trim()} is ready to use.` });
      onCreated();
    } catch (cause) {
      toast.error("Could not add the hall", {
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
      <Field id="room_name" label="Hall name" error={errors.name}>
        <Input
          {...fieldProps("room_name", errors.name)}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setErrors((current) => ({ ...current, name: undefined }));
          }}
          placeholder="Hall A"
          disabled={isSubmitting}
          className="h-9 rounded-xl"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="room_rows" label="Rows" error={errors.grid}>
          <Input
            {...fieldProps("room_rows", errors.grid)}
            type="number"
            min={1}
            value={rows}
            onChange={(event) => {
              setRows(event.target.value);
              setErrors((current) => ({ ...current, grid: undefined }));
            }}
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field id="room_columns" label="Columns">
          <Input
            id="room_columns"
            type="number"
            min={1}
            value={columns}
            onChange={(event) => setColumns(event.target.value)}
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>
      </div>

      <Field
        id="room_capacity"
        label="Usable seats (optional)"
        error={errors.capacity}
        hint={
          errors.capacity
            ? undefined
            : `Leave blank for the whole grid — ${formatNumber(gridSeats)} seats.`
        }
      >
        <Input
          {...fieldProps("room_capacity", errors.capacity)}
          type="number"
          min={1}
          max={gridSeats || undefined}
          value={capacity}
          onChange={(event) => {
            setCapacity(event.target.value);
            setErrors((current) => ({ ...current, capacity: undefined }));
          }}
          placeholder={String(gridSeats)}
          disabled={isSubmitting}
          className="h-9 rounded-xl"
        />
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
          disabled={isSubmitting}
          className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Adding
            </>
          ) : (
            "Add hall"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

function RoomsTab({
  rooms,
  error,
  onRetry,
  onChanged,
}: {
  rooms: ExamRoom[] | null;
  error: string | null;
  onRetry: () => void;
  onChanged: () => void;
}) {
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  return (
    <>
      <Panel
        title="Examination halls"
        description="The rooms an exam can be seated in, and the grid each one lays out."
        icon={Building2}
        action={
          <Button
            size="lg"
            onClick={() => setIsFormOpen(true)}
            className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
          >
            <Plus className="size-4" />
            Add Hall
          </Button>
        }
      >
        {error ? (
          <SectionError message={error} onRetry={onRetry} />
        ) : rooms === null ? (
          <ul className="divide-y">
            {Array.from({ length: 3 }, (_, index) => (
              <li key={index} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="size-9 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
              </li>
            ))}
          </ul>
        ) : rooms.length === 0 ? (
          <SectionEmpty
            icon={Building2}
            title="No halls set up"
            description="Add the rooms your exams are held in before a seating plan can be laid out."
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsFormOpen(true)}
              className="rounded-xl"
            >
              <Plus className="size-4" />
              Add Hall
            </Button>
          </SectionEmpty>
        ) : (
          <ul className="divide-y">
            {rooms.map((room) => {
              const grid = room.rows * room.columns;
              const seats = room.capacity ?? grid;

              return (
                <li
                  key={room.id}
                  className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <Building2 className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{room.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                      {room.rows} × {room.columns} grid
                      {room.capacity != null && room.capacity < grid
                        ? ` · ${formatNumber(room.capacity)} of ${formatNumber(grid)} usable`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-muted px-2 py-0.5 text-xs font-bold tabular-nums">
                    {formatNumber(seats)} seats
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add an examination hall</DialogTitle>
            <DialogDescription>
              The grid is how the desks are actually arranged in the room.
            </DialogDescription>
          </DialogHeader>
          <RoomForm
            onCancel={() => setIsFormOpen(false)}
            onCreated={() => {
              setIsFormOpen(false);
              onChanged();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Chart                                   */
/* -------------------------------------------------------------------------- */

function RoomChart({
  room,
  order,
}: {
  room: SeatingRoom;
  order: string[];
}) {
  // Index the seats so an empty desk renders as a gap rather than shifting the
  // grid — a chart that does not match the room is worse than no chart.
  const byPosition = new Map<string, SeatAllocation>();
  for (const seat of room.seats) {
    byPosition.set(`${seat.row}:${seat.column}`, seat);
  }

  return (
    <div className="print-avoid-break rounded-3xl border border-black/5 bg-white p-5 shadow-card print:rounded-none print:border print:border-neutral-300 print:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black">{room.room}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {room.rows} × {room.columns} · {formatNumber(room.seats.length)} seated
          </p>
        </div>
        <span className="rounded-lg bg-neutral-100 px-2.5 py-1 text-[0.625rem] font-bold tracking-wide text-neutral-600 uppercase">
          Front of hall
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${room.columns}, minmax(5.5rem, 1fr))`,
          }}
        >
          {Array.from({ length: room.rows }, (_, rowIndex) =>
            Array.from({ length: room.columns }, (_, columnIndex) => {
              const seat = byPosition.get(`${rowIndex + 1}:${columnIndex + 1}`);

              if (!seat) {
                return (
                  <div
                    key={`${rowIndex}-${columnIndex}`}
                    className="flex min-h-16 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-[0.5625rem] text-neutral-400"
                  >
                    Empty
                  </div>
                );
              }

              const label = classOf(seat);

              return (
                <div
                  key={`${rowIndex}-${columnIndex}`}
                  className={cn(
                    "flex min-h-16 flex-col justify-between rounded-xl px-2 py-1.5 ring-1",
                    toneFor(label, order)
                  )}
                >
                  <p className="truncate text-[0.625rem] leading-tight font-bold">
                    {seat.student_name}
                  </p>
                  <div>
                    <p className="truncate text-[0.5rem] font-semibold opacity-75 tabular-nums">
                      {seat.admission_number}
                    </p>
                    <p className="truncate text-[0.5rem] font-bold opacity-90">
                      {label}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Seating                                   */
/* -------------------------------------------------------------------------- */

function SeatingTab({
  exams,
  sections,
  rooms,
}: {
  exams: Exam[];
  sections: Section[];
  rooms: ExamRoom[];
}) {
  const [examId, setExamId] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>([]);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const [loaded, setLoaded] = React.useState<{
    examId: string;
    seating: ExamSeating;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    if (!examId) return;
    let cancelled = false;

    getExamSeating(examId)
      .then((seating) => {
        if (cancelled) return;
        setLoaded({ examId, seating });
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        // No plan yet is the normal first state, not a failure.
        setLoaded({ examId, seating: { exam: {} as Exam, rooms: [] } });
        setError(
          cause instanceof Error && !/not found/i.test(cause.message)
            ? cause.message
            : null
        );
      });

    return () => {
      cancelled = true;
    };
  }, [examId, reloadKey]);

  const seating = loaded?.examId === examId ? loaded.seating : null;
  const seatedRooms = seating?.rooms ?? [];
  const totalSeated = seatedRooms.reduce(
    (sum, room) => sum + room.seats.length,
    0
  );

  // A stable class order across every room, so a class keeps one colour.
  // Keyed off `seating` rather than the derived array — that array is rebuilt
  // every render, which would defeat the memo entirely.
  const order = React.useMemo(() => {
    const labels = new Set<string>();
    for (const room of seating?.rooms ?? []) {
      for (const seat of room.seats) labels.add(classOf(seat));
    }
    return [...labels].sort();
  }, [seating]);

  const totalSeats = rooms.reduce(
    (sum, room) => sum + (room.capacity ?? room.rows * room.columns),
    0
  );

  async function handleGenerate() {
    if (isGenerating || !examId || picked.length === 0) return;
    setIsGenerating(true);
    try {
      const result = await generateSeating(examId, { section_ids: picked });
      toast.success("Seating plan laid out", {
        description: `${formatNumber(result.students_seated)} students across ${formatNumber(
          result.rooms_used
        )} ${result.rooms_used === 1 ? "hall" : "halls"}.`,
      });
      setReloadKey((key) => key + 1);
    } catch (cause) {
      // The backend's message carries the numbers — show it as written.
      toast.error("Could not lay out the plan", {
        description:
          cause instanceof Error
            ? cause.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  function toggle(sectionId: string) {
    setPicked((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId]
    );
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Lay out a plan"
        description="Pick the exam and the sections sitting it. No two neighbours will share a class."
        icon={Shuffle}
        action={
          seatedRooms.length > 0 ? (
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.print()}
              className="rounded-xl"
            >
              <Printer className="size-4" />
              Print chart
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4 p-4">
          <Field id="seating_exam" label="Examination">
            <Select
              value={examId}
              onValueChange={(value) => {
                setExamId(value);
                setLoaded(null);
              }}
              disabled={exams.length === 0}
            >
              <SelectTrigger id="seating_exam" className="h-9 w-full rounded-xl sm:w-72">
                <SelectValue
                  placeholder={
                    exams.length === 0 ? "No exams scheduled" : "Select an exam"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={String(exam.id)}>
                    {exam.name?.trim() || `Exam ${exam.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Sections sitting this exam
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sections set up for this year.
                </p>
              ) : (
                sections.map((section) => {
                  const id = String(section.id);
                  const isPicked = picked.includes(id);

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggle(id)}
                      aria-pressed={isPicked}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
                        isPicked
                          ? "bg-brand-600 text-white ring-brand-600"
                          : "bg-card text-muted-foreground ring-border hover:bg-brand-50 hover:text-brand-700"
                      )}
                    >
                      {sectionLabel(section)}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <Button
              size="lg"
              disabled={!examId || picked.length === 0 || isGenerating}
              onClick={handleGenerate}
              className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Laying out
                </>
              ) : (
                <>
                  <Shuffle className="size-4" />
                  {seatedRooms.length > 0 ? "Lay out again" : "Lay out plan"}
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground tabular-nums">
              {formatNumber(rooms.length)}{" "}
              {rooms.length === 1 ? "hall" : "halls"} ·{" "}
              {formatNumber(totalSeats)} seats available
            </p>
          </div>

          {seatedRooms.length > 0 && (
            <p className="flex gap-3 rounded-xl bg-gold-soft px-3.5 py-2.5 text-xs leading-relaxed text-neutral-800 ring-1 ring-gold/20">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-gold" />
              Laying out again replaces this plan entirely. Anything already
              printed and put on a hall door will be out of date.
            </p>
          )}
        </div>
      </Panel>

      {/* ------------------------------- Chart ------------------------------- */}
      {!examId ? (
        <div className="rounded-3xl border border-dashed bg-card/60 px-6 py-16 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <MousePointerClick className="size-5" />
          </span>
          <p className="mt-4 text-sm text-muted-foreground">
            Pick an exam to see or lay out its seating plan.
          </p>
        </div>
      ) : error ? (
        <SectionError
          message={error}
          onRetry={() => {
            setError(null);
            setReloadKey((key) => key + 1);
          }}
        />
      ) : seating === null ? (
        <Skeleton className="h-72 rounded-3xl" />
      ) : seatedRooms.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card/60 px-6 py-16 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Armchair className="size-5" />
          </span>
          <p className="mt-4 text-sm font-medium">No plan for this exam yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the sections above and lay one out.
          </p>
        </div>
      ) : (
        <div className="print-area space-y-6">
          {/* Legend, so a chart on a wall explains its own colours. */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white p-4 shadow-card print:border-neutral-300 print:shadow-none">
            <span className="text-xs font-bold text-neutral-600">
              {formatNumber(totalSeated)} seated across{" "}
              {formatNumber(seatedRooms.length)}{" "}
              {seatedRooms.length === 1 ? "hall" : "halls"} —
            </span>
            {order.map((label) => (
              <span
                key={label}
                className={cn(
                  "rounded-lg px-2 py-0.5 text-[0.625rem] font-bold ring-1",
                  toneFor(label, order)
                )}
              >
                {label}
              </span>
            ))}
          </div>

          {seatedRooms.map((room) => (
            <RoomChart key={String(room.room_id)} room={room} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function SeatingView() {
  const [rooms, setRooms] = React.useState<ExamRoom[] | null>(null);
  const [exams, setExams] = React.useState<Exam[]>([]);
  const [sections, setSections] = React.useState<Section[]>([]);
  const [roomsError, setRoomsError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    listExamRooms()
      .then((loaded) => {
        if (cancelled) return;
        setRooms(loaded);
        setRoomsError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setRoomsError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading halls."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      const year = await getCurrentAcademicYear();
      if (!year) return;
      const [loadedExams, loadedSections] = await Promise.all([
        listExams({ academic_year_id: year.id }),
        listSections(year.id),
      ]);
      if (cancelled) return;
      setExams(loadedExams);
      setSections(loadedSections);
    }

    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Seating Plan
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Lay out an exam hall so no two students from the same class sit next
            to each other, then print the chart for the door.
          </p>
        </div>
      </div>

      <Tabs defaultValue="plan" className="gap-5">
        {/* The list keeps its natural width; the wrapper scrolls when narrow. */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max gap-0.5 rounded-xl p-1">
            <TabsTrigger
              value="plan"
              className="gap-2 rounded-lg px-3.5 data-active:text-brand-700 dark:data-active:text-brand-300"
            >
              <Armchair className="size-4" />
              Seating Plan
            </TabsTrigger>
            <TabsTrigger
              value="rooms"
              className="gap-2 rounded-lg px-3.5 data-active:text-brand-700 dark:data-active:text-brand-300"
            >
              <Building2 className="size-4" />
              Halls
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="plan">
          {rooms === null ? (
            <Card className="shadow-card">
              <CardContent className="p-6">
                <Skeleton className="h-40 rounded-2xl" />
              </CardContent>
            </Card>
          ) : (
            <SeatingTab exams={exams} sections={sections} rooms={rooms} />
          )}
        </TabsContent>

        <TabsContent value="rooms">
          <RoomsTab
            rooms={rooms}
            error={roomsError}
            onRetry={() => {
              setRoomsError(null);
              setReloadKey((key) => key + 1);
            }}
            onChanged={() => setReloadKey((key) => key + 1)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
