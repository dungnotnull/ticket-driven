"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<HTMLButtonElement, SelectPrimitive.SelectTriggerProps>(
  function SelectTrigger({ className, children, ...props }, ref) {
    return (
      <SelectPrimitive.Trigger
        ref={ref}
        {...props}
        className={cn(
          "h-9 w-full inline-flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 data-[placeholder]:text-muted/60 disabled:opacity-50",
          className
        )}
      >
        {children}
        <SelectPrimitive.Icon asChild>
          <ChevronDown size={14} className="shrink-0 text-muted" aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
    );
  }
);

export const SelectContent = forwardRef<HTMLDivElement, SelectPrimitive.SelectContentProps>(
  function SelectContent(
    { className, children, position = "popper", sideOffset = 4, ...props },
    ref
  ) {
    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={ref}
          position={position}
          sideOffset={sideOffset}
          {...props}
          className={cn(
            "z-50 max-h-72 min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border border-border-strong bg-surface-2 py-1 shadow-xl text-[13px]",
            className
          )}
        >
          <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    );
  }
);

export const SelectItem = forwardRef<HTMLDivElement, SelectPrimitive.SelectItemProps>(
  function SelectItem({ className, children, ...props }, ref) {
    return (
      <SelectPrimitive.Item
        ref={ref}
        {...props}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-[4px] py-1.5 pl-3 pr-8 text-foreground outline-none data-[highlighted]:bg-border/40 data-[highlighted]:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className
        )}
      >
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex items-center justify-center">
          <Check size={13} aria-hidden="true" />
        </SelectPrimitive.ItemIndicator>
      </SelectPrimitive.Item>
    );
  }
);

export function SelectLabel({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      {...props}
      className={cn("px-3 py-1 text-[11px] font-medium text-muted", className)}
    />
  );
}

export const SelectSeparator = forwardRef<HTMLDivElement, SelectPrimitive.SelectSeparatorProps>(
  function SelectSeparator({ className, ...props }, ref) {
    return (
      <SelectPrimitive.Separator
        ref={ref}
        {...props}
        className={cn("-mx-1 my-1 h-px bg-border", className)}
      />
    );
  }
);
