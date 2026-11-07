"use client";

import { useRef, useState } from "react";
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
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from "@/lib/types";

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
}

/** Presigned direct-to-cloud upload flow (S3-compatible: R2 or Backblaze B2). */
export function AttachmentUpload({ projectId, drafts, onChange, disabled }: AttachmentUploadProps) {
  void drafts;
  const { t } = useLang();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pickFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const valid = files.filter((file) => {
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
        // Direct upload: browser → storage (R2 presigned PUT, or signed local endpoint).
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
      } catch (error) {
        console.error("[attachment] upload failed:", error);
        // Safety: cloud storage un-configured → clear, calm message (no crash)
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
        disabled={disabled || busy}
        className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border-strong px-3 py-2 text-[13px] text-muted transition-colors hover:border-primary/60 hover:text-foreground disabled:opacity-50"
        data-testid="attach-file"
      >
        {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Paperclip size={14} />}
        {busy ? t("att.uploading") : t("att.button")}
      </button>

      {drafts.length > 0 && renderDraftList()}
    </div>
  );

  function renderDraftList() {
    return (
      <ul className="flex flex-col gap-1.5">
        {drafts.map((draft, index) => (
          <li
            key={draft.placeholderId ?? draft.key}
            className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-[12px]"
          >
            {draft.contentType.startsWith("image/") ? (
              <ImageIcon size={14} className="shrink-0 text-progress" />
            ) : (
              <FileText size={14} className="shrink-0 text-muted" />
            )}
            <span className="min-w-0 flex-1 truncate">{draft.name}</span>
            <span className="shrink-0 text-muted">{formatBytes(draft.size)}</span>
            {draft.status === "uploading" ? (
              <LoaderCircle size={13} className="shrink-0 animate-spin text-muted" />
            ) : (
              <Check size={13} className={cn("shrink-0", draft.status === "done" ? "text-done" : "text-danger")} />
            )}
            <button
              type="button"
              aria-label={t("att.removeNamed", { name: draft.name })}
              disabled={draft.status === "uploading"}
              onClick={() => removeDraft(index)}
              className="shrink-0 rounded p-0.5 text-muted transition-colors hover:text-danger disabled:opacity-40"
            >
              <X size={13} />
            </button>
          </li>
        ))}
      </ul>
    );
  }
}
