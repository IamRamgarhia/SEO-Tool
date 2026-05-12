import { cn } from "@/lib/utils";

/**
 * Shimmer skeleton block — drop-in placeholder for content over 300ms.
 * Use `animate-pulse` from Tailwind for a subtle 1s breathing effect
 * that respects prefers-reduced-motion (Tailwind's animate-pulse uses
 * @media (prefers-reduced-motion: no-preference) under the hood).
 *
 * Composes well into any shape — pass width / height via className
 * or use one of the preset helpers below.
 *
 * Example — tool form loading state:
 *
 *   {pending ? (
 *     <div className="space-y-3">
 *       <Skeleton.Line className="w-1/3" />
 *       <Skeleton.Block className="h-32" />
 *       <Skeleton.Lines count={3} />
 *     </div>
 *   ) : (
 *     <Result data={data} />
 *   )}
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-white/[0.06]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Single-line skeleton — default height matches body text, so it
 * substitutes for an unknown string without layout shift.
 */
function Line({ className }: { className?: string }) {
  return <Skeleton className={cn("h-3.5 w-full max-w-md", className)} />;
}

/**
 * Multiple stacked lines — for a paragraph or list of items still loading.
 * Last line is narrower so it reads as actual prose, not a brick.
 */
function Lines({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-3.5",
            i === count - 1 ? "w-2/3" : "w-full max-w-md",
          )}
        />
      ))}
    </div>
  );
}

/**
 * Block skeleton — sized via className (e.g. h-32 for a chart area,
 * h-10 for a form field).
 */
function Block({ className }: { className?: string }) {
  return <Skeleton className={cn("h-20 w-full", className)} />;
}

/** Pre-shaped card skeleton — matches the StatCard footprint exactly. */
function Card({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-xl border border-border bg-card p-6",
        className,
      )}
    >
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-4 h-7 w-16" />
      <Skeleton className="mt-3 h-2.5 w-32" />
    </div>
  );
}

Skeleton.Line = Line;
Skeleton.Lines = Lines;
Skeleton.Block = Block;
Skeleton.Card = Card;
