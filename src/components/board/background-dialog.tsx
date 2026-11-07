"use client";

import { useState } from "react";
import { Check, ImageIcon, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateProjectAction } from "@/app/actions/projects";
import { BACKGROUND_GALLERY } from "@/lib/background-gallery";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { explainApi } from "@/lib/i18n/dictionary";

interface BackgroundDialogProps {
  projectId: string;
  current: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: (url: string | null) => void;
}

/**
 * Trello-style board background picker. Gallery is curated (allowlisted
 * server-side); admin/team only — the parent renders the trigger conditionally.
 * Clicking applies immediately; "No background" restores the plain board.
 */
export function BackgroundDialog({
  projectId,
  current,
  open,
  onOpenChange,
  onApplied,
}: BackgroundDialogProps) {
  const { t } = useLang();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function apply(url: string | null) {
    setBusyId(url ?? "none");
    try {
      const result = await updateProjectAction({
        projectId,
        patch: { backgroundUrl: url },
      });
      if (!result.ok || !result.data) {
        toast.error(explainApi(result, t, "bg.fail"));
        return;
      }
      onApplied(result.data.backgroundUrl);
      toast.success(t("bg.saved"));
      onOpenChange(false);
    } catch {
      toast.error(t("bg.fail"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" data-testid="background-dialog">
        <DialogHeader>
          <DialogTitle>{t("bg.title")}</DialogTitle>
          <DialogDescription>{t("bg.desc")}</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[52vh] grid-cols-2 gap-2.5 overflow-y-auto px-5 py-4 sm:grid-cols-3 scroll-thin">
          <button
            type="button"
            onClick={() => void apply(null)}
            data-testid="background-none"
            className="press relative aspect-video overflow-hidden rounded-lg border border-border bg-surface-2 text-[12px] font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground"
            aria-label={t("bg.none")}
          >
            <span className="flex h-full items-center justify-center gap-1.5">
              <ImageIcon size={14} />
              {t("bg.none")}
            </span>
            {current === null && (
              <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                <Check size={12} />
              </span>
            )}
          </button>
          {BACKGROUND_GALLERY.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => void apply(img.url)}
              data-testid={`background-item-${img.id.slice(0, 5)}`}
              aria-label={img.name}
              title={img.name}
              className={cn(
                "press group relative aspect-video overflow-hidden rounded-lg border transition-colors",
                current === img.url ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-border-strong",
              )}
            >
              {/* Plain <img>: CSS background art, not layout-critical content */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.thumb}
                alt={img.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 py-1 text-left text-[10.5px] font-medium text-white">
                {img.name}
              </span>
              {busyId === img.url && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                  <LoaderCircle size={16} className="animate-spin text-white" />
                </span>
              )}
              {current === img.url && (
                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                  <Check size={12} />
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex justify-end border-t border-border px-5 py-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t("home.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
