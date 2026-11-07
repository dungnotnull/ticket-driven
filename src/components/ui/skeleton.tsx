import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/**
 * Placeholder shape for loading states. The `.skeleton` utility in
 * globals.css paints the brand shimmer sweep (plus a static block when the
 * user prefers reduced motion).
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div {...props} className={cn("skeleton rounded-md", className)} />;
}

/** Slim indigo progress bar: the shared "page is loading" indicator. */
export function LoaderBar({ className }: { className?: string }) {
  return <div className={cn("loader-bar", className)} aria-hidden="true" />;
}
