"use client";

import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Lightbox for attachment/chip images: big centered preview inside the
 * standard dialog chrome (phone gutters + scroll lock come for free).
 */
export function ImagePreviewDialog({
  src,
  title,
  alt,
  onClose,
}: {
  src: string | null;
  title?: string;
  alt?: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(src)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="2xl"
        className="top-[6vh] max-h-[88vh] translate-y-0"
        data-testid="image-preview"
      >
        <DialogHeader>
          <DialogTitle className="truncate pr-8">
            {title ?? alt ?? ""}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Attached image preview
          </DialogDescription>
        </DialogHeader>
        {src && (
          <div className="flex max-h-[62vh] min-h-[240px] items-center justify-center overflow-hidden rounded-lg border border-border bg-[repeating-conic-gradient(#f1f5f9_0%_25%,white_0%_50%)] bg-[length:16px_16px] px-3 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt ?? title ?? "preview"}
              data-testid="image-preview-img"
              className="max-h-[58vh] max-w-full rounded object-contain"
            />
          </div>
        )}
        <button
          type="button"
          aria-label="Close preview"
          onClick={onClose}
          className={cn(
            "absolute right-4 top-4 rounded-md p-1.5 text-muted",
            "transition-colors hover:bg-surface-2 hover:text-foreground",
          )}
        >
          <X size={16} />
        </button>
      </DialogContent>
    </Dialog>
  );
}
