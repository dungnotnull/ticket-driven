"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Paperclip,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatBytes } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { apiFetch } from "@/lib/fetcher";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  MAX_TOTAL_ATTACHMENTS,
} from "@/lib/types";
import { objectDownloadUrl } from "@/components/ui/rich-text";
import { ImagePreviewDialog } from "@/components/ui/image-preview";

/**
 * A pending attachment: either reserved (uploading) with a placeholder id,
 * or fully uploaded with its storage key ready to be persisted on the ticket.
 */
export interface UploadDraft {
  key: string;
  url: string;
  name: string;
  size: number;
  contentType: string;
  status: "uploading" | "done" | "error";
  placeholderId?: string;
}

interface AttachmentUploadProps {
  projectId: string;
  drafts: UploadDraft[];
  /** Report changes with a functional updater (avoids stale closures). */
  onChange: (updater: (prev: UploadDraft[]) => UploadDraft[]) => void;
  disabled?: boolean;
  /** Max attachments the target ticket may hold (default 5). */
  maxCount?: number;
  /** Fires for every DONE upload of this session (orphan cleanup on cancel). */
  onUploadedKey?: (key: string) => void;
}

/**
 * Presigned direct-to-cloud upload flow (S3-compatible: R2 or Backblaze B2).
 * IMAGES ONLY (pdf/video/etc. are rejected client- AND server-side), up to
 * `maxCount` files, thumbnail list with remove buttons and a click-to-zoom
 * lightbox for finished images.
 */
export function AttachmentUpload({
  projectId,
  drafts,
  onChange,
  disabled,
  maxCount = MAX_TOTAL_ATTACHMENTS,
  onUploadedKey,
}: AttachmentUploadProps) {
  const { t } = useLang();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<UploadDraft | null>(null);
  const objectUrlRef = useRef<Map<string, string>>(new Map());

  // Revoke local blob previews when the surfaces unmount.
  useEffect(() => {
    const map = objectUrlRef.current;
    return () => {
      for (const url of map.values()) URL.revokeObjectURL(url);
      map.clear();
    };
  }, []);

  function localPreviewFor(draft: UploadDraft, file: File | null): string | null {
    if (!draft.placeholderId) return null;
    const map = objectUrlRef.current;
    if (file && !map.has(draft.placeholderId)) {
      map.set(draft.placeholderId, URL.createObjectURL(file));
    }
    return map.get(draft.placeholderId) ?? null;
  }

  async function pickFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;

    const capacity = maxCount - drafts.length;
    if (capacity <= 0) {
      toast.error(t("att.limitCount", { max: maxCount }));
      return;
    }
    if (selected.length > capacity) {
      toast.error(t("att.limitCount", { max: maxCount }));
    }

    const valid = selected.slice(0, Math.max(capacity, 0)).filter((file) => {
      if (!(ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(file.type)) {
        toast.error(t("att.invalidType", { name: file.name }));
        return false;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(t("att.tooLarge", { name: file.name }));
        return false;
      }
      return true;
    });
    if (valid.length === 0) return;

    setBusy(true);
    for (const file of valid) {
      const placeholderId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const placeholder: UploadDraft = {
        key: "",
        url: "",
        name: file.name,
        size: file.size,
        contentType: file.type,
        status: "uploading",
        placeholderId,
      };
      localPreviewFor(placeholder, file);
      onChange((prev) => [...prev, placeholder]);
      try {
        const presign = await apiFetch<{
          key: string;
          uploadUrl: string;
          uploadHeaders: Record<string, string>;
          directUrl?: string;
        }>("/api/upload/presign", {
          method: "POST",
          json: {
            projectId,
            fileName: file.name,
            contentType: file.type,
            size: file.size,
          },
        });
        // Direct upload: browser -> storage (R2/B2 presigned PUT).
        const upload = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: presign.uploadHeaders,
          body: file,
        });
        if (!upload.ok) throw new Error(`Upload failed (${upload.status})`);
        onChange((prev) =>
          prev.map((draft) =>
            draft.placeholderId === placeholderId
              ? {
                  key: presign.key,
                  url: presign.directUrl ?? "",
                  name: file.name,
                  size: file.size,
                  contentType: file.type,
                  status: "done",
                }
              : draft,
          ),
        );
        onUploadedKey?.(presign.key);
      } catch (error) {
        console.error("[attachment] upload failed:", error);
        // Safety: cloud storage un-configured -> clear, calm message (no crash)
        const message = error instanceof Error ? error.message : "";
        const storageUnconfigured = message.includes("not configured");
        toast.error(
          storageUnconfigured
            ? t("att.unconfigured")
            : t("att.fail", { name: file.name }),
        );
        onChange((prev) => prev.filter((draft) => draft.placeholderId !== placeholderId));
      }
    }
    setBusy(false);
  }

  function removeDraft(index: number) {
    onChange((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }

  const remainingSlots = maxCount - drafts.length;

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={Array.from(ALLOWED_ATTACHMENT_TYPES).join(",")}
        className="hidden"
        onChange={pickFiles}
        disabled={disabled || busy}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy || remainingSlots <= 0}
        className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border-strong px-3 py-2 text-[13px] text-muted transition-colors hover:border-primary/60 hover:text-foreground disabled:opacity-50"
        data-testid="attach-file"
      >
        {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Paperclip size={14} />}
        {busy ? t("att.uploading") : t("att.button")}
        {remainingSlots > 0 ? null : (
          <span className="text-[11px] text-danger">{t("att.limitCount", { max: maxCount })}</span>
        )}
      </button>

      {drafts.length > 0 && renderDraftList()}

      <ImagePreviewDialog
        src={preview?.url || (preview ? objectDownloadUrl(preview.key) : null)}
        title={preview?.name}
        alt={preview?.name}
        onClose={() => setPreview(null)}
      />
    </div>
  );

  function renderDraftList() {
    return (
      <ul className="grid grid-cols-2 gap-1.5">
        {drafts.map((draft, index) => {
          const imageUrl =
            draft.status === "uploading"
              ? (localPreviewFor(draft, null) ?? "")
              : draft.contentType.startsWith("image/")
                ? draft.url || objectDownloadUrl(draft.key)
                : "";
          const clickable =
            draft.status === "done" && draft.contentType.startsWith("image/") && Boolean(imageUrl);
          return (
            <li
              key={draft.placeholderId ?? draft.key}
              className={cn(
                "flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[12px]",
                clickable && "cursor-zoom-in transition-colors hover:border-primary/50",
              )}
              onClick={() => clickable && setPreview(draft)}
              data-testid="attachment-draft"
              data-name={draft.name}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={draft.name}
                  className="size-9 shrink-0 rounded border border-border object-cover"
                />
              ) : (
                <FileText size={20} className="shrink-0 text-muted" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate">{draft.name}</span>
                <span className="flex items-center gap-1 text-[10.5px] text-muted">
                  {draft.contentType.startsWith("image/") ? (
                    <ImageIcon size={11} className="text-progress" />
                  ) : (
                    <FileText size={11} />
                  )}
                  {formatBytes(draft.size)}
                  {clickable && <span className="text-primary">{t("att.preview")}</span>}
                </span>
              </span>
              {draft.status === "uploading" ? (
                <LoaderCircle size={13} className="shrink-0 animate-spin text-muted" />
              ) : (
                <Check size={13} className={cn("shrink-0", draft.status === "done" ? "text-done" : "text-danger")} />
              )}
              <button
                type="button"
                aria-label={t("att.removeNamed", { name: draft.name })}
                disabled={draft.status === "uploading"}
                onClick={(e) => {
                  e.stopPropagation();
                  removeDraft(index);
                }}
                className="shrink-0 rounded p-0.5 text-muted transition-colors hover:text-danger disabled:opacity-40"
              >
                <X size={13} />
              </button>
            </li>
          );
        })}
      </ul>
    );
  }
}
