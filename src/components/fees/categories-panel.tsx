"use client";

import * as React from "react";
import { Layers, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { FEE_FREQUENCY_LABELS } from "@/components/fees/fee-meta";
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
import {
  FEE_FREQUENCIES,
  createFeeCategory,
  updateFeeCategory,
  type FeeCategory,
  type FeeFrequency,
} from "@/lib/api";
import { humanizeToken } from "@/lib/format";

/* -------------------------------------------------------------------------- */
/*                                    Form                                    */
/* -------------------------------------------------------------------------- */

type Values = { name: string; frequency: "" | FeeFrequency };
type Errors = Partial<Record<keyof Values, string>>;

function normaliseFrequency(value: string | null | undefined): "" | FeeFrequency {
  const key = (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (FEE_FREQUENCIES as readonly string[]).includes(key)
    ? (key as FeeFrequency)
    : "";
}

function CategoryForm({
  category,
  onCancel,
  onSaved,
}: {
  /** Null in create mode. */
  category: FeeCategory | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  // Mounted fresh each time the dialog opens, so the initialiser is the reset.
  const [values, setValues] = React.useState<Values>({
    name: category?.name ?? "",
    frequency: normaliseFrequency(category?.frequency),
  });
  const [errors, setErrors] = React.useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const found: Errors = {};
    if (!values.name.trim()) found.name = "Name is required.";
    if (!values.frequency) found.frequency = "Select how often this is charged.";
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    const payload = {
      name: values.name.trim(),
      frequency: values.frequency as FeeFrequency,
    };

    setIsSubmitting(true);
    try {
      if (category) {
        await updateFeeCategory(category.id, payload);
        toast.success("Fee category updated", {
          description: `${payload.name} has been saved.`,
        });
      } else {
        await createFeeCategory(payload);
        toast.success("Fee category added", {
          description: `${payload.name} can now be used in fee structures.`,
        });
      }
      onSaved();
    } catch (error) {
      toast.error(
        category ? "Could not save the category" : "Could not add the category",
        {
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
        }
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="space-y-4">
        <Field id="category_name" label="Name" error={errors.name}>
          <Input
            {...fieldProps("category_name", errors.name)}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Tuition Fee"
            autoComplete="off"
            disabled={isSubmitting}
            className="h-9 rounded-xl"
          />
        </Field>

        <Field id="category_frequency" label="Frequency" error={errors.frequency}>
          <Select
            value={values.frequency}
            onValueChange={(value) => set("frequency", value as FeeFrequency)}
            disabled={isSubmitting}
          >
            <SelectTrigger
              {...fieldProps("category_frequency", errors.frequency)}
              className="h-9 w-full rounded-xl"
            >
              <SelectValue placeholder="How often is this charged?" />
            </SelectTrigger>
            <SelectContent>
              {FEE_FREQUENCIES.map((frequency) => (
                <SelectItem key={frequency} value={frequency}>
                  {FEE_FREQUENCY_LABELS[frequency]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              Saving
            </>
          ) : category ? (
            "Save Changes"
          ) : (
            "Add Category"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Panel                                    */
/* -------------------------------------------------------------------------- */

export function CategoriesPanel({
  categories,
  error,
  onRetry,
  onChanged,
}: {
  /** Null while loading. */
  categories: FeeCategory[] | null;
  error: string | null;
  onRetry: () => void;
  onChanged: () => void;
}) {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FeeCategory | null>(null);

  function openAdd() {
    setEditing(null);
    setIsFormOpen(true);
  }

  return (
    <>
      <Panel
        title="Fee Categories"
        description="The kinds of fee your school charges, and how often."
        icon={Layers}
        action={
          <Button
            size="lg"
            onClick={openAdd}
            className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
          >
            <Plus className="size-4" />
            Add Category
          </Button>
        }
      >
        {error ? (
          <SectionError message={error} onRetry={onRetry} />
        ) : categories === null ? (
          <ul className="divide-y">
            {Array.from({ length: 3 }, (_, index) => (
              <li key={index} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="h-4 w-40 max-w-full rounded-md" />
                <Skeleton className="ml-auto h-5 w-20 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : categories.length === 0 ? (
          <SectionEmpty
            icon={Layers}
            title="No fee categories yet"
            description="Add a category such as Tuition, Transport or Lab Fee to get started."
          >
            <Button
              variant="outline"
              size="lg"
              onClick={openAdd}
              className="rounded-xl"
            >
              <Plus className="size-4" />
              Add Category
            </Button>
          </SectionEmpty>
        ) : (
          <ul className="divide-y">
            {categories.map((category) => (
              <li
                key={category.id}
                className="group/row flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <Layers className="size-4" />
                </span>

                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {category.name}
                </p>

                <span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {FEE_FREQUENCY_LABELS[
                    normaliseFrequency(category.frequency) || "other"
                  ] ?? humanizeToken(category.frequency)}
                </span>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-lg text-muted-foreground opacity-100 transition-opacity hover:text-foreground sm:opacity-0 sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100"
                  aria-label={`Edit ${category.name}`}
                  onClick={() => {
                    setEditing(category);
                    setIsFormOpen(true);
                  }}
                >
                  <Pencil className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit fee category" : "Add a fee category"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Rename this category or change how often it is charged."
                : "Categories are what fee structures are built from."}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            category={editing}
            onCancel={() => setIsFormOpen(false)}
            onSaved={() => {
              setIsFormOpen(false);
              onChanged();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
