"use client";

import * as React from "react";
import {
  Download,
  FileImage,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Field,
  SectionEmpty,
  SectionError,
  fieldProps,
} from "@/components/shared/form-field";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteDocument,
  downloadDocument,
  listDocuments,
  replaceDocumentFile,
  updateDocument,
  uploadDocument,
  type StudentDocument,
} from "@/lib/api";
import { formatDate, humanizeToken } from "@/lib/format";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                   Limits                                   */
/* -------------------------------------------------------------------------- */

/** Certificates and scans, not media. Kept in step with the backend's cap. */
const MAX_BYTES = 10 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/** Null when the file is fine; otherwise the reason to show the user. */
function rejectionFor(file: File): string | null {
  if (file.size > MAX_BYTES) {
    return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(
      MAX_BYTES
    )}.`;
  }
  if (!ACCEPTED_EXTENSIONS.includes(extensionOf(file.name) as never)) {
    return "Only PDF, Word documents and images can be uploaded.";
  }
  return null;
}

function formatBytes(bytes: number | null | undefined): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) {
    return "";
  }
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** The filename to show, falling back to the tail of the storage path. */
function displayName(document: StudentDocument): string {
  const name = document.file_name?.trim();
  if (name) return name;
  const tail = document.gcs_path?.split("/").pop()?.trim();
  return tail || "Untitled file";
}

function isImage(document: StudentDocument): boolean {
  if (document.mime_type?.startsWith("image/")) return true;
  return [".jpg", ".jpeg", ".png", ".webp"].includes(
    extensionOf(displayName(document))
  );
}

/* -------------------------------------------------------------------------- */
/*                                 File picker                                */
/* -------------------------------------------------------------------------- */

function FilePicker({
  file,
  onPick,
  error,
  disabled,
}: {
  file: File | null;
  onPick: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  function take(picked: File | undefined) {
    if (!picked) return;
    onPick(picked);
  }

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          take(event.target.files?.[0]);
          // Reset, so picking the same file twice still fires a change.
          event.target.value = "";
        }}
      />

      {file ? (
        <div className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {formatBytes(file.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-lg text-muted-foreground hover:text-foreground"
            aria-label="Remove selected file"
            disabled={disabled}
            onClick={() => onPick(null)}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            take(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors outline-none",
            "hover:border-brand-300 hover:bg-brand-50/40 focus-visible:ring-3 focus-visible:ring-ring/35",
            "disabled:pointer-events-none disabled:opacity-50",
            isDragging ? "border-brand-400 bg-brand-50/60" : "border-border",
            error && "border-destructive/50"
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <Upload className="size-4.5" />
          </span>
          <span className="text-sm font-medium">
            Choose a file, or drop it here
          </span>
          <span className="text-xs text-muted-foreground">
            PDF, Word or image · up to {formatBytes(MAX_BYTES)}
          </span>
        </button>
      )}

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Upload form                                 */
/* -------------------------------------------------------------------------- */

function UploadForm({
  studentId,
  onCancel,
  onUploaded,
}: {
  studentId: string | number;
  onCancel: () => void;
  onUploaded: () => void;
}) {
  const [docType, setDocType] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [typeError, setTypeError] = React.useState<string | undefined>();
  const [fileError, setFileError] = React.useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function pick(picked: File | null) {
    if (!picked) {
      setFile(null);
      setFileError(undefined);
      return;
    }
    const rejection = rejectionFor(picked);
    if (rejection) {
      setFile(null);
      setFileError(rejection);
      return;
    }
    setFile(picked);
    setFileError(undefined);
    // A blank type is almost always the filename minus its extension.
    if (!docType.trim()) {
      const base = picked.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
      setDocType(humanizeToken(base));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmed = docType.trim();
    if (!trimmed) setTypeError("Document type is required.");
    if (!file) setFileError("Choose a file to upload.");
    if (!trimmed || !file) return;

    setIsSubmitting(true);
    try {
      await uploadDocument(studentId, { doc_type: trimmed, file });
      toast.success("Document uploaded", {
        description: `${trimmed} is now on this student's file.`,
      });
      onUploaded();
    } catch (error) {
      toast.error("Could not upload the document", {
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="space-y-4">
        <FilePicker
          file={file}
          onPick={pick}
          error={fileError}
          disabled={isSubmitting}
        />

        <Field
          id="doc_type"
          label="Document Type"
          error={typeError}
          hint="What this paper is — Birth Certificate, Transfer Certificate, Aadhaar."
        >
          <Input
            {...fieldProps("doc_type", typeError)}
            value={docType}
            onChange={(event) => {
              setDocType(event.target.value);
              setTypeError(undefined);
            }}
            placeholder="Birth Certificate"
            autoComplete="off"
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
              Uploading
            </>
          ) : (
            <>
              <Upload className="size-4" />
              Upload
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Rename form                                 */
/* -------------------------------------------------------------------------- */

function RenameForm({
  studentId,
  document,
  onCancel,
  onSaved,
}: {
  studentId: string | number;
  document: StudentDocument;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [docType, setDocType] = React.useState(document.doc_type ?? "");
  const [error, setError] = React.useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmed = docType.trim();
    if (!trimmed) {
      setError("Document type is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDocument(studentId, document.id, { doc_type: trimmed });
      toast.success("Document updated");
      onSaved();
    } catch (cause) {
      toast.error("Could not save the document", {
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
      <Field id="rename_doc_type" label="Document Type" error={error}>
        <Input
          {...fieldProps("rename_doc_type", error)}
          value={docType}
          onChange={(event) => {
            setDocType(event.target.value);
            setError(undefined);
          }}
          autoComplete="off"
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
              Saving
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Rows                                    */
/* -------------------------------------------------------------------------- */

function DocumentRow({
  document,
  isBusy,
  onDownload,
  onReplace,
  onRename,
  onDelete,
}: {
  document: StudentDocument;
  /** True while this row's own download or replace is in flight. */
  isBusy: boolean;
  onDownload: () => void;
  onReplace: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const label = humanizeToken(document.doc_type) || "Document";
  const name = displayName(document);
  const size = formatBytes(document.size_bytes);
  const Icon = isImage(document) ? FileImage : FileText;

  return (
    <li className="group/row flex flex-wrap items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/40">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <Icon className="size-4.5" />
      </span>

      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground" title={name}>
          {name}
          {size ? ` · ${size}` : ""}
        </p>
      </div>

      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatDate(document.uploaded_at)}
      </span>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg"
          disabled={isBusy}
          onClick={onDownload}
        >
          {isBusy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          <span className="hidden sm:inline">Download</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
              aria-label={`More actions for ${label}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={onReplace}>
              <RefreshCw className="size-4" />
              Replace file
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onRename}>
              <Pencil className="size-4" />
              Rename type
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function DocumentRowSkeleton() {
  return (
    <li className="flex items-center gap-4 px-4 py-4">
      <Skeleton className="size-10 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-36 max-w-full rounded-md" />
        <Skeleton className="h-3 w-52 max-w-full rounded-md" />
      </div>
      <Skeleton className="h-8 w-24 rounded-lg" />
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Tab                                     */
/* -------------------------------------------------------------------------- */

export function DocumentsTab({ studentId }: { studentId: string | number }) {
  const [documents, setDocuments] = React.useState<StudentDocument[] | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [renaming, setRenaming] = React.useState<StudentDocument | null>(null);
  const [deleting, setDeleting] = React.useState<StudentDocument | null>(null);
  /** The row with a download or replace in flight, so only it shows a spinner. */
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // One hidden input serves every row; the pending target says which row asked.
  const replaceInputRef = React.useRef<HTMLInputElement>(null);
  const replaceTargetRef = React.useRef<StudentDocument | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    listDocuments(studentId)
      .then((loaded) => {
        if (cancelled) return;
        setDocuments(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while loading documents."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, reloadKey]);

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  async function handleDownload(entry: StudentDocument) {
    setBusyId(String(entry.id));
    try {
      const { blob, fileName } = await downloadDocument(studentId, entry.id);

      // The endpoint needs an Authorization header, so the file arrives as a
      // blob and is handed to the browser through a temporary object URL.
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = fileName || displayName(entry);
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      toast.error("Could not download the document", {
        description:
          cause instanceof Error
            ? cause.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  function askForReplacement(entry: StudentDocument) {
    replaceTargetRef.current = entry;
    replaceInputRef.current?.click();
  }

  async function handleReplace(file: File) {
    const target = replaceTargetRef.current;
    replaceTargetRef.current = null;
    if (!target) return;

    const rejection = rejectionFor(file);
    if (rejection) {
      toast.error("That file cannot be uploaded", { description: rejection });
      return;
    }

    setBusyId(String(target.id));
    try {
      await replaceDocumentFile(studentId, target.id, file);
      toast.success("File replaced", {
        description: `${humanizeToken(target.doc_type) || "The document"} now points at ${file.name}.`,
      });
      refresh();
    } catch (cause) {
      toast.error("Could not replace the file", {
        description:
          cause instanceof Error
            ? cause.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {/* Shared by every row's "Replace file" action. */}
      <input
        ref={replaceInputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        onChange={(event) => {
          const picked = event.target.files?.[0];
          event.target.value = "";
          if (picked) void handleReplace(picked);
        }}
      />

      <Panel
        title="Documents"
        description="Certificates and paperwork held for this student."
        icon={FileText}
        action={
          <Button
            size="lg"
            onClick={() => setIsUploadOpen(true)}
            className="rounded-xl shadow-brand transition-all hover:bg-brand-700"
          >
            <Plus className="size-4" />
            Upload Document
          </Button>
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
        ) : documents === null ? (
          <ul className="divide-y">
            {Array.from({ length: 2 }, (_, index) => (
              <DocumentRowSkeleton key={index} />
            ))}
          </ul>
        ) : documents.length === 0 ? (
          <SectionEmpty
            icon={FileText}
            title="No documents yet"
            description="Upload a birth certificate, transfer certificate or ID against this student."
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsUploadOpen(true)}
              className="rounded-xl"
            >
              <Upload className="size-4" />
              Upload Document
            </Button>
          </SectionEmpty>
        ) : (
          <ul className="divide-y">
            {documents.map((entry) => (
              <DocumentRow
                key={entry.id}
                document={entry}
                isBusy={busyId === String(entry.id)}
                onDownload={() => void handleDownload(entry)}
                onReplace={() => askForReplacement(entry)}
                onRename={() => setRenaming(entry)}
                onDelete={() => setDeleting(entry)}
              />
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload a document</DialogTitle>
            <DialogDescription>
              Pick a file from this device and file it against the student.
            </DialogDescription>
          </DialogHeader>
          <UploadForm
            studentId={studentId}
            onCancel={() => setIsUploadOpen(false)}
            onUploaded={() => {
              setIsUploadOpen(false);
              refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename document type</DialogTitle>
            <DialogDescription>
              The stored file is untouched — only its label changes.
            </DialogDescription>
          </DialogHeader>
          {renaming && (
            <RenameForm
              studentId={studentId}
              document={renaming}
              onCancel={() => setRenaming(null)}
              onSaved={() => {
                setRenaming(null);
                refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        title="Delete this document?"
        description={
          <>
            {humanizeToken(deleting?.doc_type) || "This document"} and its
            uploaded file will be permanently deleted from this student&rsquo;s
            record.
          </>
        }
        confirmLabel="Delete document"
        pendingLabel="Deleting"
        errorTitle="Could not delete the document"
        onConfirm={async () => {
          if (!deleting) return;
          await deleteDocument(studentId, deleting.id);
          toast.success("Document deleted");
          setDeleting(null);
          refresh();
        }}
      />
    </>
  );
}
