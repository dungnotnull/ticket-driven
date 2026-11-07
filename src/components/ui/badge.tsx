import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const BADGE_VARIANTS = {
  default: "border-border bg-surface-2 text-muted",
  success: "border-done/25 bg-done/10 text-done",
  progress: "border-progress/25 bg-progress/10 text-progress",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-danger/25 bg-danger/10 text-danger",
  primary: "border-primary/30 bg-primary/10 text-primary",
  outline: "border-border text-muted",
} as const;

type BadgeVariant = keyof typeof BADGE_VARIANTS;

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-[1px] text-[11px] font-medium leading-4",
        BADGE_VARIANTS[variant],
        className
      )}
    />
  );
}
