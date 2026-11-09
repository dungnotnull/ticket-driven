"use client";

import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  /** Optional third, low-emphasis action (e.g. discard/neutral outcome).
   * Rendered leftmost; clicking it closes THIS dialog and fires onNeutral. */
  neutralLabel?: string;
  onNeutral?: () => void;
  /** Visual weight of the confirm button. Defaults to `danger` (destructive
   * asks); unsaved-changes prompts pass `default` so Save reads positively. */
  confirmVariant?: "default" | "secondary" | "ghost" | "danger" | "outline";
}

/**
 * Brand-consistent destructive-action confirmation (replaces window.confirm,
 * which is blocking, unstyled and inconsistent with the design system).
 * Supports the standard 2-button ask or a 3-button unsaved-changes variant
 * (neutral = discard, cancel = keep editing, confirm = save).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  neutralLabel,
  onNeutral,
  confirmVariant = "danger",
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-testid="confirm-dialog">        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          {neutralLabel && onNeutral && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                onOpenChange(false);
                onNeutral();
              }}
              data-testid="confirm-neutral"
            >
              {neutralLabel}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            data-testid="confirm-cancel"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            size="sm"
            disabled={busy}
            onClick={onConfirm}
            data-testid="confirm-accept"
          >
            {busy && <LoaderCircle size={13} className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
