"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const Menu = DropdownMenuPrimitive.Root;
export const MenuTrigger = DropdownMenuPrimitive.Trigger;

export const MenuContent = forwardRef<HTMLDivElement, DropdownMenuPrimitive.DropdownMenuContentProps>(
  function MenuContent({ className, sideOffset = 4, ...props }, ref) {
    return (
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          {...props}
          className={cn(
            "z-50 min-w-[9rem] overflow-x-hidden rounded-md border border-border-strong bg-surface-2 py-1 shadow-xl text-[13px]",
            className
          )}
        />
      </DropdownMenuPrimitive.Portal>
    );
  }
);

type MenuItemProps = DropdownMenuPrimitive.DropdownMenuItemProps & {
  danger?: boolean;
};

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(function MenuItem(
  { className, danger = false, ...props },
  ref
) {
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      data-danger={danger ? "" : undefined}
      {...props}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-foreground outline-none data-[highlighted]:bg-border/40 data-[danger]:text-danger data-[danger]:data-[highlighted]:bg-danger/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
    />
  );
});

export function MenuLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      {...props}
      className={cn("px-3 py-1 text-[11px] font-medium text-muted", className)}
    />
  );
}

export const MenuSeparator = forwardRef<
  HTMLDivElement,
  DropdownMenuPrimitive.DropdownMenuSeparatorProps
>(function MenuSeparator({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      {...props}
      className={cn("-mx-1 my-1 h-px bg-border", className)}
    />
  );
});
