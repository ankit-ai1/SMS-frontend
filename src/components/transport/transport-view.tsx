"use client";

import * as React from "react";
import {
  Bus,
  ChevronDown,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  UserRoundPlus,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { toAmount } from "@/components/fees/fee-meta";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Field, SectionEmpty, SectionError, fieldProps } from "@/components/shared/form-field";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
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
  canBillTransport,
  canManageTransport,
  createTransportAssignment,
  createTransportRoute,
  createTransportStop,
  deleteTransportRoute,
  deleteTransportStop,
  endTransportAssignment,
  generateTransportFees,
  getCurrentAcademicYear,
  getUser,
  listFeeStructures,
  listStudents,
  listTransportAssignments,
  listTransportRoutes,
  listTransportStops,
  toUserRole,
  type FeeStructure,
  type Student,
  type TransportAssignment,
  type TransportRoute,
  type TransportStop,
} from "@/lib/api";
import { formatCurrency, formatDate, formatNumber, initialsFrom } from "@/lib/format";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 350;
const RESULT_LIMIT = 6;

function studentName(student: Student): string {
  return `${student.first_name} ${student.last_name}`.trim() || "Unnamed";
}

/** "07:30:00" → "7:30 am". Anything unparseable is shown as written. */
function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return value;
  const hours = Number(match[1]);
  if (!Number.isFinite(hours)) return value;
  const suffix = hours >= 12 ? "pm" : "am";
  return `${hours % 12 === 0 ? 12 : hours % 12}:${match[2]} ${suffix}`;
}

/* -------------------------------------------------------------------------- */
/*                                 Route form                                 */
/* -------------------------------------------------------------------------- */

function RouteForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = React.useState({
    name: "",
    vehicle_number: "",
    driver_name: "",
    driver_phone: "",
    capacity: "",
  });
  const [error, setError] = React.useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function set(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!values.name.trim()) {
      setError("Give the route a name.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransportRoute({
        name: values.name.trim(),
        vehicle_number: values.vehicle_number.trim() || undefined,
        driver_name: values.driver_name.trim() || undefined,
        driver_phone: values.driver_phone.trim() || undefined,
        capacity: values.capacity ? Number(values.capacity) : undefined,
      });
      toast.success("Route added", { description: values.name.trim() });
      onSaved();
    } catch (cause) {
      toast.error("Could not add the route", {
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
      <Field id="route_name" label="Route name" error={error}>
        <Input
          {...fieldProps("route_name", error)}
          value={values.name}
          onChange={(event) => {
            set("name", event.target.value);
            setError(undefined);
          }}
          placeholder="Route 1 — City Centre"
          disabled={isSubmitting}
          className="h-9 rounded-xl"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="route_vehicle" label="Vehicle number">
          <Input
            id="route_vehicle"
            value={values.vehicle_number}
            onChange={(event) => set("vehicle_number", event.target.value)}
            placeholder="KA 01 AB 1234"
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field id="route_capacity" label="Seats on the bus">
          <Input
            id="route_capacity"
            type="number"
            min={1}
            value={values.capacity}
            onChange={(event) => set("capacity", event.target.value)}
            placeholder="40"
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field id="route_driver" label="Driver">
          <Input
            id="route_driver"
            value={values.driver_name}
            onChange={(event) => set("driver_name", event.target.value)}
            placeholder="Ramesh"
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field id="route_phone" label="Driver's phone">
          <Input
            id="route_phone"
            type="tel"
            value={values.driver_phone}
            onChange={(event) => set("driver_phone", event.target.value)}
            placeholder="+91 98765 43210"
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>
      </div>

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
            "Add route"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Stop form                                 */
/* -------------------------------------------------------------------------- */

function StopForm({
  routeId,
  onCancel,
  onSaved,
}: {
  routeId: string | number;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [pickup, setPickup] = React.useState("");
  const [drop, setDrop] = React.useState("");
  const [fare, setFare] = React.useState("");
  const [errors, setErrors] = React.useState<
    Partial<Record<"name" | "fare", string>>
  >({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found: Partial<Record<"name" | "fare", string>> = {};
    if (!name.trim()) found.name = "Name the stop.";
    if (!fare || Number(fare) <= 0) found.fare = "Set the monthly fare.";
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransportStop(routeId, {
        stop_name: name.trim(),
        pickup_time: pickup || undefined,
        drop_time: drop || undefined,
        monthly_fare: Number(fare),
      });
      toast.success("Stop added", { description: name.trim() });
      onSaved();
    } catch (cause) {
      toast.error("Could not add the stop", {
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
      <Field id="stop_name" label="Stop name" error={errors.name}>
        <Input
          {...fieldProps("stop_name", errors.name)}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setErrors((current) => ({ ...current, name: undefined }));
          }}
          placeholder="Gandhi Chowk"
          disabled={isSubmitting}
          className="h-9 rounded-xl"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="stop_pickup" label="Pickup time">
          <Input
            id="stop_pickup"
            type="time"
            value={pickup}
            onChange={(event) => setPickup(event.target.value)}
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field id="stop_drop" label="Drop time">
          <Input
            id="stop_drop"
            type="time"
            value={drop}
            onChange={(event) => setDrop(event.target.value)}
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>
      </div>

      <Field
        id="stop_fare"
        label="Monthly fare"
        error={errors.fare}
        hint={errors.fare ? undefined : "The fare belongs to the stop, not the bus."}
      >
        <Input
          {...fieldProps("stop_fare", errors.fare)}
          type="number"
          min={1}
          value={fare}
          onChange={(event) => {
            setFare(event.target.value);
            setErrors((current) => ({ ...current, fare: undefined }));
          }}
          placeholder="1200"
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
            "Add stop"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Routes & stops                              */
/* -------------------------------------------------------------------------- */

function RouteCard({
  route,
  canManage,
  onChanged,
  onDelete,
}: {
  route: TransportRoute;
  canManage: boolean;
  onChanged: () => void;
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [stops, setStops] = React.useState<TransportStop[] | null>(null);
  const [isStopFormOpen, setIsStopFormOpen] = React.useState(false);
  const [deletingStop, setDeletingStop] = React.useState<TransportStop | null>(
    null
  );
  const [reloadKey, setReloadKey] = React.useState(0);

  // Stops load per route, so they are fetched only once expanded.
  React.useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    listTransportStops(route.id)
      .then((loaded) => {
        if (!cancelled) setStops(loaded);
      })
      .catch(() => {
        if (!cancelled) setStops([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, route.id, reloadKey]);

  return (
    <li className="px-4 py-3.5 transition-colors hover:bg-muted/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 basis-56 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <Bus className="size-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{route.name}</span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {[
                route.vehicle_number?.trim(),
                route.driver_name?.trim(),
                route.driver_phone?.trim(),
              ]
                .filter(Boolean)
                .join(" · ") || "No vehicle recorded"}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        <div className="flex shrink-0 items-center gap-4 text-right">
          <div>
            <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
              Stops
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatNumber(route.stop_count)}
            </p>
          </div>
          <div>
            <p className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
              Riders
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatNumber(route.assigned_students)}
              {route.capacity ? ` / ${formatNumber(route.capacity)}` : ""}
            </p>
          </div>

          {canManage && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDelete}
              aria-label={`Delete ${route.name}`}
              className="rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="mt-3 rounded-2xl border bg-card/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
            <p className="text-xs font-bold text-muted-foreground">
              Stops on this route
            </p>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStopFormOpen(true)}
                className="rounded-lg"
              >
                <Plus className="size-3.5" />
                Add stop
              </Button>
            )}
          </div>

          {stops === null ? (
            <div className="space-y-2">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : stops.length === 0 ? (
            <p className="rounded-xl bg-muted/60 px-3.5 py-2.5 text-xs text-muted-foreground">
              No stops yet. A student can only be put on a bus once this route
              has a stop with a fare.
            </p>
          ) : (
            <ul className="space-y-2">
              {stops.map((stop) => (
                <li
                  key={stop.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-3.5 py-2.5"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <MapPin className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 basis-36">
                    <p className="truncate text-sm font-medium">
                      {stop.stop_name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                      {[
                        stop.pickup_time
                          ? `Pick ${formatTime(stop.pickup_time)}`
                          : "",
                        stop.drop_time ? `Drop ${formatTime(stop.drop_time)}` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No times set"}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatNumber(stop.assigned_students)} riders
                  </span>

                  <span className="shrink-0 rounded-lg bg-gold-soft px-2 py-0.5 text-xs font-bold text-gold tabular-nums">
                    {formatCurrency(toAmount(stop.monthly_fare))}/mo
                  </span>

                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeletingStop(stop)}
                      aria-label={`Delete ${stop.stop_name}`}
                      className="rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Dialog open={isStopFormOpen} onOpenChange={setIsStopFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a stop to {route.name}</DialogTitle>
            <DialogDescription>
              Each stop carries its own monthly fare.
            </DialogDescription>
          </DialogHeader>
          <StopForm
            routeId={route.id}
            onCancel={() => setIsStopFormOpen(false)}
            onSaved={() => {
              setIsStopFormOpen(false);
              setReloadKey((key) => key + 1);
              onChanged();
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingStop !== null}
        onOpenChange={(open) => !open && setDeletingStop(null)}
        title="Delete this stop?"
        description={
          <>
            {deletingStop?.stop_name ?? "This stop"} will be removed from{" "}
            {route.name}. A stop that students still board at cannot be deleted.
          </>
        }
        confirmLabel="Delete stop"
        pendingLabel="Deleting"
        errorTitle="Could not delete the stop"
        onConfirm={async () => {
          if (!deletingStop) return;
          await deleteTransportStop(route.id, deletingStop.id);
          toast.success("Stop deleted");
          setDeletingStop(null);
          setReloadKey((key) => key + 1);
          onChanged();
        }}
      />
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Assign form                                 */
/* -------------------------------------------------------------------------- */

function AssignForm({
  routes,
  onCancel,
  onAssigned,
}: {
  routes: TransportRoute[];
  onCancel: () => void;
  onAssigned: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [results, setResults] = React.useState<Student[] | null>(null);
  const [picked, setPicked] = React.useState<Student | null>(null);

  const [routeId, setRouteId] = React.useState("");
  const [stops, setStops] = React.useState<TransportStop[]>([]);
  const [stopId, setStopId] = React.useState("");

  const [errors, setErrors] = React.useState<
    Partial<Record<"student" | "route" | "stop", string>>
  >({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  React.useEffect(() => {
    if (!routeId) return;
    let cancelled = false;

    listTransportStops(routeId)
      .then((loaded) => {
        if (!cancelled) setStops(loaded);
      })
      .catch(() => {
        if (!cancelled) setStops([]);
      });

    return () => {
      cancelled = true;
    };
  }, [routeId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found: Partial<Record<"student" | "route" | "stop", string>> = {};
    if (!picked) found.student = "Pick the student.";
    if (!routeId) found.route = "Pick a route.";
    if (!stopId) found.stop = "Pick the stop they board at.";
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransportAssignment({
        student_id: picked!.id,
        route_id: routeId,
        stop_id: stopId,
      });
      toast.success("Put on the bus", {
        description: `${studentName(picked!)} now rides this route.`,
      });
      onAssigned();
    } catch (cause) {
      toast.error("Could not assign the student", {
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
      <Field id="assign_student" label="Student" error={errors.student}>
        {picked ? (
          <div className="flex items-center gap-3 rounded-xl bg-brand-50 px-3.5 py-2.5 ring-1 ring-brand-100">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-[0.625rem] font-bold text-brand-700">
              {initialsFrom(studentName(picked))}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{studentName(picked)}</p>
              <p className="truncate text-xs text-muted-foreground tabular-nums">
                {picked.admission_number || "—"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
              aria-label="Pick a different student"
              onClick={() => {
                setPicked(null);
                setSearch("");
                setResults(null);
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                {...fieldProps("assign_student", errors.student)}
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setErrors((current) => ({ ...current, student: undefined }));
                }}
                placeholder="Search by name or admission number"
                disabled={isSubmitting}
                className="h-9 rounded-xl pl-9"
              />
            </div>

            {term && results && results.length > 0 && (
              <ul className="mt-2 divide-y overflow-hidden rounded-xl border">
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
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Field>

      <Field id="assign_route" label="Route" error={errors.route}>
        <Select
          value={routeId}
          onValueChange={(value) => {
            setRouteId(value);
            setStopId("");
            setErrors((current) => ({ ...current, route: undefined }));
          }}
          disabled={isSubmitting || routes.length === 0}
        >
          <SelectTrigger
            {...fieldProps("assign_route", errors.route)}
            className="h-9 w-full rounded-xl"
          >
            <SelectValue
              placeholder={routes.length === 0 ? "No routes set up" : "Select a route"}
            />
          </SelectTrigger>
          <SelectContent>
            {routes.map((route) => (
              <SelectItem key={route.id} value={String(route.id)}>
                {route.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        id="assign_stop"
        label="Boarding stop"
        error={errors.stop}
        hint={errors.stop ? undefined : "The fare comes from the stop they board at."}
      >
        <Select
          value={stopId}
          onValueChange={(value) => {
            setStopId(value);
            setErrors((current) => ({ ...current, stop: undefined }));
          }}
          disabled={isSubmitting || !routeId || stops.length === 0}
        >
          <SelectTrigger
            {...fieldProps("assign_stop", errors.stop)}
            className="h-9 w-full rounded-xl"
          >
            <SelectValue
              placeholder={
                !routeId
                  ? "Pick a route first"
                  : stops.length === 0
                    ? "This route has no stops"
                    : "Select a stop"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {stops.map((stop) => (
              <SelectItem key={stop.id} value={String(stop.id)}>
                {stop.stop_name} — {formatCurrency(toAmount(stop.monthly_fare))}/mo
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
          disabled={isSubmitting}
          className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Assigning
            </>
          ) : (
            <>
              <UserRoundPlus className="size-4" />
              Put on the bus
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

export function TransportView() {
  const [routes, setRoutes] = React.useState<TransportRoute[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [deletingRoute, setDeletingRoute] = React.useState<TransportRoute | null>(
    null
  );
  const [isRouteFormOpen, setIsRouteFormOpen] = React.useState(false);

  const [assignments, setAssignments] = React.useState<
    TransportAssignment[] | null
  >(null);
  const [routeFilter, setRouteFilter] = React.useState("all");
  const [isAssignOpen, setIsAssignOpen] = React.useState(false);
  const [ending, setEnding] = React.useState<TransportAssignment | null>(null);

  const [structures, setStructures] = React.useState<FeeStructure[]>([]);
  const [structureId, setStructureId] = React.useState("");
  const [billingMonth, setBillingMonth] = React.useState(
    () => new Date().toISOString().slice(0, 7)
  );
  const [dueDate, setDueDate] = React.useState("");
  const [isBilling, setIsBilling] = React.useState(false);

  // localStorage only exists on the client, so gate on a mount signal that is
  // identical between the prerendered markup and the first client render.
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const role = isClient ? toUserRole(getUser()?.role) : null;
  const mayManage = canManageTransport(role);
  const mayBill = canBillTransport(role);

  React.useEffect(() => {
    let cancelled = false;

    listTransportRoutes()
      .then((loaded) => {
        if (cancelled) return;
        setRoutes(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading routes."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  React.useEffect(() => {
    let cancelled = false;

    listTransportAssignments({
      route_id: routeFilter === "all" ? null : routeFilter,
    })
      .then((loaded) => {
        if (!cancelled) setAssignments(loaded);
      })
      .catch(() => {
        if (!cancelled) setAssignments([]);
      });

    return () => {
      cancelled = true;
    };
  }, [routeFilter, reloadKey]);

  // Only the billing tab needs structures, so a failure costs a dropdown.
  React.useEffect(() => {
    if (!mayBill) return;
    let cancelled = false;

    getCurrentAcademicYear()
      .then((year) => (year ? listFeeStructures({ academic_year_id: year.id }) : []))
      .then((loaded) => {
        if (!cancelled) setStructures(loaded);
      })
      .catch(() => {
        if (!cancelled) setStructures([]);
      });

    return () => {
      cancelled = true;
    };
  }, [mayBill]);

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  async function handleBill() {
    if (isBilling || !structureId || !billingMonth) return;
    setIsBilling(true);
    try {
      const result = await generateTransportFees({
        fee_structure_id: structureId,
        month: billingMonth,
        due_date: dueDate || undefined,
      });
      toast.success("Transport fees raised", {
        description: `${formatNumber(result.allocations_created)} of ${formatNumber(
          result.current_riders
        )} riders billed${
          result.skipped > 0
            ? `, ${formatNumber(result.skipped)} skipped — no enrolment this year`
            : ""
        }.`,
      });
    } catch (cause) {
      toast.error("Could not raise the fees", {
        description:
          cause instanceof Error
            ? cause.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setIsBilling(false);
    }
  }

  const totalRiders = (routes ?? []).reduce(
    (sum, route) => sum + route.assigned_students,
    0
  );

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Transport
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Bus routes, the stops on them, and who rides which one.
          </p>
        </div>

        {totalRiders > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
            <UsersRound className="size-3.5" />
            {formatNumber(totalRiders)} riders
          </span>
        )}
      </div>

      <Tabs defaultValue="routes" className="gap-5">
        {/* The list keeps its natural width; the wrapper scrolls when narrow. */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max gap-0.5 rounded-xl p-1">
            <TabsTrigger
              value="routes"
              className="gap-2 rounded-lg px-3.5 data-active:text-brand-700 dark:data-active:text-brand-300"
            >
              <Bus className="size-4" />
              Routes &amp; Stops
            </TabsTrigger>
            <TabsTrigger
              value="riders"
              className="gap-2 rounded-lg px-3.5 data-active:text-brand-700 dark:data-active:text-brand-300"
            >
              <UsersRound className="size-4" />
              Riders
            </TabsTrigger>
            {mayBill && (
              <TabsTrigger
                value="fees"
                className="gap-2 rounded-lg px-3.5 data-active:text-brand-700 dark:data-active:text-brand-300"
              >
                <Wallet className="size-4" />
                Transport Fees
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* ------------------------------ Routes ----------------------------- */}
        <TabsContent value="routes">
          <Panel
            title="Routes"
            description="Open a route to see and manage the stops on it."
            icon={Bus}
            action={
              mayManage ? (
                <Button
                  size="lg"
                  onClick={() => setIsRouteFormOpen(true)}
                  className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
                >
                  <Plus className="size-4" />
                  Add Route
                </Button>
              ) : undefined
            }
          >
            {error ? (
              <SectionError
                message={error}
                onRetry={() => {
                  setError(null);
                  refresh();
                }}
              />
            ) : routes === null ? (
              <ul className="divide-y">
                {Array.from({ length: 3 }, (_, index) => (
                  <li key={index} className="flex items-center gap-4 px-4 py-3.5">
                    <Skeleton className="size-10 shrink-0 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40 rounded-md" />
                      <Skeleton className="h-3 w-56 max-w-full rounded-md" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : routes.length === 0 ? (
              <SectionEmpty
                icon={Bus}
                title="No routes yet"
                description="Add a bus route, give it stops with fares, and then put students on it."
              >
                {mayManage && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setIsRouteFormOpen(true)}
                    className="rounded-xl"
                  >
                    <Plus className="size-4" />
                    Add Route
                  </Button>
                )}
              </SectionEmpty>
            ) : (
              <ul className="divide-y">
                {routes.map((route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    canManage={mayManage}
                    onChanged={refresh}
                    onDelete={() => setDeletingRoute(route)}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        {/* ------------------------------ Riders ----------------------------- */}
        <TabsContent value="riders">
          <Panel
            title="Riders"
            description="Students currently on a bus, and the stop they board at."
            icon={UsersRound}
            action={
              mayManage ? (
                <Button
                  size="lg"
                  onClick={() => setIsAssignOpen(true)}
                  className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
                >
                  <UserRoundPlus className="size-4" />
                  Assign Student
                </Button>
              ) : undefined
            }
          >
            <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-end">
              <Field id="rider_route" label="Route">
                <Select value={routeFilter} onValueChange={setRouteFilter}>
                  <SelectTrigger
                    id="rider_route"
                    className="h-9 w-full rounded-xl sm:w-64"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All routes</SelectItem>
                    {(routes ?? []).map((route) => (
                      <SelectItem key={route.id} value={String(route.id)}>
                        {route.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {assignments === null ? (
              <ul className="divide-y">
                {Array.from({ length: 4 }, (_, index) => (
                  <li key={index} className="flex items-center gap-4 px-4 py-3.5">
                    <Skeleton className="size-9 shrink-0 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40 rounded-md" />
                      <Skeleton className="h-3 w-52 rounded-md" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : assignments.length === 0 ? (
              <SectionEmpty
                icon={UsersRound}
                title="Nobody on this bus yet"
                description="Assign a student to a route and a stop, and they show up here."
              />
            ) : (
              <ul className="divide-y">
                {assignments.map((ride) => (
                  <li
                    key={ride.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-[0.7rem] font-bold text-brand-700 ring-1 ring-brand-100">
                      {initialsFrom(ride.student_name)}
                    </span>

                    <div className="min-w-0 flex-1 basis-44">
                      <p className="truncate text-sm font-semibold">
                        {ride.student_name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                        {[
                          ride.admission_number,
                          [ride.class_name?.trim(), ride.section_name?.trim()]
                            .filter(Boolean)
                            .join(" — "),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <div className="min-w-0 flex-1 basis-40">
                      <p className="truncate text-xs font-medium">
                        {ride.route_name?.trim() || "Route"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {ride.stop_name?.trim() || "Stop"} · since{" "}
                        {formatDate(ride.start_date)}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-lg bg-gold-soft px-2 py-0.5 text-xs font-bold text-gold tabular-nums">
                      {formatCurrency(toAmount(ride.monthly_fare))}/mo
                    </span>

                    {mayManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEnding(ride)}
                        className="shrink-0 rounded-lg text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="size-3.5" />
                        End ride
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        {/* ------------------------------- Fees ------------------------------ */}
        {mayBill && (
          <TabsContent value="fees">
            <Panel
              title="Raise transport fees"
              description="Bills every current rider their own stop's fare, against one fee structure."
              icon={Wallet}
            >
              <div className="space-y-4 p-4">
                <p className="flex gap-3 rounded-xl bg-brand-50 px-3.5 py-3 text-xs leading-relaxed text-brand-800 ring-1 ring-brand-100">
                  <Bus className="mt-0.5 size-4 shrink-0" />
                  Pick a fee structure to bill against — its amount is ignored,
                  because each rider is charged their own stop&rsquo;s fare.
                  Running this twice does not double-bill anyone.
                </p>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <Field
                    id="transport_month"
                    label="Billing month"
                    hint="One structure bills every month — the month keeps them apart."
                  >
                    <Input
                      id="transport_month"
                      type="month"
                      value={billingMonth}
                      onChange={(event) => setBillingMonth(event.target.value)}
                      className="h-9 w-full rounded-xl sm:w-44"
                    />
                  </Field>

                  <Field id="transport_structure" label="Fee structure">
                    <Select
                      value={structureId}
                      onValueChange={setStructureId}
                      disabled={structures.length === 0}
                    >
                      <SelectTrigger
                        id="transport_structure"
                        className="h-9 w-full rounded-xl sm:w-72"
                      >
                        <SelectValue
                          placeholder={
                            structures.length === 0
                              ? "No fee structures set up"
                              : "Select a structure"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {structures.map((structure) => (
                          <SelectItem
                            key={structure.id}
                            value={String(structure.id)}
                          >
                            {structure.category_name?.trim() ||
                              `Category ${structure.fee_category_id}`}
                            {structure.class_name?.trim()
                              ? ` — ${structure.class_name}`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field id="transport_due" label="Due date (optional)">
                    <Input
                      id="transport_due"
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="h-9 w-full rounded-xl sm:w-44"
                    />
                  </Field>

                  <Button
                    size="lg"
                    disabled={!structureId || !billingMonth || isBilling}
                    onClick={handleBill}
                    className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
                  >
                    {isBilling ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Raising
                      </>
                    ) : (
                      <>
                        <Wallet className="size-4" />
                        Raise fees
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Panel>
          </TabsContent>
        )}
      </Tabs>

      {/* ------------------------------ Dialogs ----------------------------- */}
      <Dialog open={isRouteFormOpen} onOpenChange={setIsRouteFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a bus route</DialogTitle>
            <DialogDescription>
              Give it stops afterwards — that is where the fares live.
            </DialogDescription>
          </DialogHeader>
          <RouteForm
            onCancel={() => setIsRouteFormOpen(false)}
            onSaved={() => {
              setIsRouteFormOpen(false);
              refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Put a student on a bus</DialogTitle>
            <DialogDescription>
              A student rides one bus at a time — end the current ride first if
              they are moving.
            </DialogDescription>
          </DialogHeader>
          <AssignForm
            routes={routes ?? []}
            onCancel={() => setIsAssignOpen(false)}
            onAssigned={() => {
              setIsAssignOpen(false);
              refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingRoute !== null}
        onOpenChange={(open) => !open && setDeletingRoute(null)}
        title="Delete this route?"
        description={
          <>
            {deletingRoute?.name ?? "This route"} will be removed. A route that
            students still ride cannot be deleted — end their rides first.
          </>
        }
        confirmLabel="Delete route"
        pendingLabel="Deleting"
        errorTitle="Could not delete the route"
        onConfirm={async () => {
          if (!deletingRoute) return;
          await deleteTransportRoute(deletingRoute.id);
          toast.success("Route deleted");
          setDeletingRoute(null);
          refresh();
        }}
      />

      <ConfirmDialog
        open={ending !== null}
        onOpenChange={(open) => !open && setEnding(null)}
        title="End this ride?"
        description={
          <>
            {ending?.student_name ?? "This student"} will stop riding{" "}
            {ending?.route_name?.trim() || "this route"}. The record is kept, so
            the fees already raised against it stay intact.
          </>
        }
        confirmLabel="End ride"
        pendingLabel="Ending"
        errorTitle="Could not end the ride"
        onConfirm={async () => {
          if (!ending) return;
          await endTransportAssignment(ending.id);
          toast.success("Ride ended");
          setEnding(null);
          refresh();
        }}
      />
    </div>
  );
}
