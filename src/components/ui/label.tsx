import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      {...props}
      className={cn("text-[13px] font-medium text-foreground/90 flex w-fit", className)}
    />
  );
}
