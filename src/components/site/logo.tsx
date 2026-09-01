import { cn } from "@/lib/utils";

/**
 * The Synerax Campus mark: a graduation cap in a squircle tile.
 *
 * Drawn rather than imported so it stays crisp at 20px and 200px alike, takes
 * its colour from the theme, and needs no asset pipeline. The three variants
 * are the ones the identity sheet specifies.
 */

export type MarkVariant = "solid" | "outline" | "mono";

export function SyneraxMark({
  variant = "solid",
  className,
}: {
  variant?: MarkVariant;
  className?: string;
}) {
  const tile =
    variant === "solid"
      ? "fill-brand-600"
      : variant === "mono"
        ? "fill-ink"
        : "fill-transparent stroke-brand-600";
  const cap = variant === "outline" ? "fill-brand-600" : "fill-white";

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Synerax Campus"
      className={cn("size-10", className)}
    >
      {/* Squircle tile — the ~28% corner radius from the identity sheet. */}
      <rect
        x={variant === "outline" ? 1.5 : 0}
        y={variant === "outline" ? 1.5 : 0}
        width={variant === "outline" ? 61 : 64}
        height={variant === "outline" ? 61 : 64}
        rx={18}
        strokeWidth={3}
        className={tile}
      />

      {/* Mortarboard: the board, the cap below it, and the tassel. */}
      <g className={cap}>
        <path d="M32 15.5 53.5 25.2 32 34.9 10.5 25.2 32 15.5Z" />
        <path d="M21 30.4v7.9c0 3.9 4.9 6.6 11 6.6s11-2.7 11-6.6v-7.9l-11 5-11-5Z" />
        <path d="M49.6 26.9c.8-.4 1.7.2 1.7 1.1v10.3a2.6 2.6 0 1 1-2.4 0V28.5c0-.7.3-1.3.7-1.6Z" />
      </g>
    </svg>
  );
}

/** Mark plus wordmark — the primary lockup. */
export function SyneraxLockup({
  className,
  markClassName,
  compact = false,
}: {
  className?: string;
  markClassName?: string;
  /** Drops the tagline line under the wordmark. */
  compact?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <SyneraxMark className={cn("size-10 shrink-0", markClassName)} />
      <span className="min-w-0 leading-none">
        <span className="block text-lg font-bold tracking-tight">
          Synerax <span className="text-brand-600">Campus</span>
        </span>
        {!compact && (
          <span className="mt-1 block text-[0.6875rem] font-medium text-muted-foreground">
            School Management &amp; ERP
          </span>
        )}
      </span>
    </span>
  );
}
