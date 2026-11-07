"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const CONTENT_SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  /* Ticket modal: extra room so the questions column never feels cramped. */
  "2xl": "sm:max-w-[1200px]",
} as const;

type DialogContentSize = keyof typeof CONTENT_SIZES;

type DialogContentProps = DialogPrimitive.DialogContentProps & {
  size?: DialogContentSize;
};

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  { className, children, size = "md", ...props },
  ref
) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-indigo-950/35 backdrop-blur-[3px]" />
      <DialogPrimitive.Content
        ref={ref}
        {...props}
        className={cn(
          // w-[calc(100%-1.5rem)]: small side gutters on phones (modals no
          // longer touch the edges); desktop is capped by max-w-* anyway.
          "elev-dialog fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1.5rem)] rounded-2xl border border-border bg-surface outline-none max-h-[90vh] overflow-y-auto p-0",
          CONTENT_SIZES[size],
          className
        )}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none"
        >
          <X size={14} aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

export function DialogHeader({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div {...props} className={cn("border-b border-border px-5 py-4", className)} />;
}

export const DialogTitle = forwardRef<
  HTMLHeadingElement,
  DialogPrimitive.DialogTitleProps
>(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      {...props}
      className={cn("text-[15px] font-semibold leading-none", className)}
    />
  );
});

export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  DialogPrimitive.DialogDescriptionProps
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      {...props}
      className={cn("text-[13px] text-muted mt-1", className)}
    />
  );
});

export function DialogFooter({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={cn("border-t border-border px-5 py-3 flex items-center justify-end gap-2", className)}
    />
  );
}
