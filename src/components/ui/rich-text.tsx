"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  LoaderCircle,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiClientError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { explainApi } from "@/lib/i18n/dictionary";
import { MAX_EDITOR_IMAGES } from "@/lib/types";

/** Auth-checked download URL for server-stored objects (same shape as the
 * legacy local driver's serving path; safe inside <img> src attributes). */
export function objectDownloadUrl(key: string): string {
  return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
}

interface RichTextEditorProps {
  /** Current HTML value (controlled; used as the initial document). */
  value: string;
  /** Fired on every doc change with the serialized HTML + emptiness flag. */
  onChange: (html: string, isEmpty: boolean) => void;
  placeholder?: string;
  /** data-testid for the contenteditable element itself. */
  testid?: string;
  disabled?: boolean;
  /** Project scope for image uploads (cloud storage; refused when un-configured). */
  projectId?: string;
  minHeight?: string;
  className?: string;
  /** Max images the body may hold (default shared MAX_EDITOR_IMAGES = 5). */
  maxImages?: number;
  /** Fires for every object key this editor session uploads (orphan cleanup
   * runs on dialog cancel - the server only deletes UNREFERENCED keys). */
  onMediaKeyUploaded?: (key: string) => void;
}

/**
 * Tiptap rich-text editor for the feedback/reply surfaces inside tickets
 * (comments + client review notes) and the ticket/project descriptions.
 * Formatting: bold/italic/strike/underline, bullet & ordered lists, links,
 * undo/redo. Images: toolbar multi-pick or paste - IMAGES ONLY - uploaded
 * straight to cloud storage (presigned R2/B2 PUT), hard-capped per body
 * (default 5). Without credentials the image upload fails with the calm
 * storage-safety toast and the rest of the page stays fully functional.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  testid,
  disabled,
  projectId,
  minHeight = "2.75rem",
  className,
  maxImages = MAX_EDITOR_IMAGES,
  onMediaKeyUploaded,
}: RichTextEditorProps) {
  const { t } = useLang();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  function imageCount(target: Editor): number {
    return target.getHTML().match(/<img\b/gi)?.length ?? 0;
  }

  const uploadAndInsert = useCallback(
    async (target: Editor, file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error(t("rt.imageOnly"));
        return;
      }
      if (!projectId) return;
      if (imageCount(target) >= maxImages) {
        toast.error(t("rt.imageLimit", { max: maxImages }));
        return;
      }
      setUploading(true);
      try {
        const presign = await apiFetch<{
          key: string;
          uploadUrl: string;
          uploadHeaders: Record<string, string>;
        }>("/api/upload/presign", {
          method: "POST",
          json: {
            projectId,
            fileName: file.name,
            contentType: file.type,
            size: file.size,
          },
        });
        const res = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: presign.uploadHeaders,
          body: file,
        });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
        if (imageCount(target) >= maxImages) {
          // A concurrent paste may have filled the body while upload ran.
          toast.error(t("rt.imageLimit", { max: maxImages }));
          return;
        }
        target
          .chain()
          .focus()
          .setImage({ src: objectDownloadUrl(presign.key), alt: file.name })
          .run();
        onMediaKeyUploaded?.(presign.key);
      } catch (error) {
        const unavailable =
          error instanceof ApiClientError && error.status === 503;
        toast.error(
          unavailable
            ? t("att.unconfigured")
            : explainApi(error, t, "rt.uploadFail"),
        );
      } finally {
        setUploading(false);
      }
    },
    [projectId, t, maxImages, onMediaKeyUploaded],
  );

  const editor = useEditor({
    // These editors mount only inside interaction-only dialogs; skip any SSR
    // document pass so the board's hydration gates stay untouched.
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image.configure({ inline: true, allowBase64: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    // Ref is assigned at editor creation (never during render).
    onCreate: ({ editor: instance }) => {
      editorRef.current = instance;
    },
    onDestroy: () => {
      editorRef.current = null;
    },
    editorProps: {
      attributes: {
        class: cn(
          "rt-content max-w-none outline-none",
          "min-h-[2.75rem] w-full px-2.5 py-1.5 text-[13px] leading-relaxed",
        ),
        style: `min-height:${minHeight}`,
        "data-testid": testid ?? "richtext-input",
        spellcheck: "true",
      },
      handlePaste: (_view, event) => {
        const current = editorRef.current;
        const files = Array.from(event.clipboardData?.files ?? []);
        const image = files.find((f) => f.type.startsWith("image/"));
        if (!image || !current) return false;
        event.preventDefault();
        void uploadAndInsert(current, image);
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      const isEmpty = current.isEmpty;
      onChange(isEmpty ? "" : current.getHTML(), isEmpty);
    },
  });

  useEffect(() => {
    if (editor && disabled !== undefined) editor.setEditable(!disabled);
  }, [disabled, editor]);

  async function pickThenUpload() {
    if (!editor) return;
    fileRef.current?.click();
  }

  async function handlePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!editor || files.length === 0) return;
    const remaining = maxImages - imageCount(editor);
    if (remaining <= 0) {
      toast.error(t("rt.imageLimit", { max: maxImages }));
      return;
    }
    if (files.length > remaining) {
      toast.error(t("rt.imageLimit", { max: maxImages }));
    }
    for (const file of files.slice(0, Math.max(remaining, 0))) {
      await uploadAndInsert(editor, file);
    }
  }

  const btn = (
    key: string,
    action: () => void,
    icon: ReactNode,
    label: string,
  ) => (
    <button
      key={key}
      type="button"
      tabIndex={-1}
      onMouseDown={(e) => {
        e.preventDefault(); // keep the editor selection focused
        action();
      }}
      aria-label={label}
      title={label}
      className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      {icon}
    </button>
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface transition-colors focus-within:border-border-strong",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1.5 py-1">
        {editor &&
          [
            btn("bold", () => editor.chain().focus().toggleBold().run(), <Bold size={13} />, "Bold - Ctrl+B"),
            btn("italic", () => editor.chain().focus().toggleItalic().run(), <Italic size={13} />, "Italic - Ctrl+I"),
            btn("strike", () => editor.chain().focus().toggleStrike().run(), <Strikethrough size={13} />, "Strikethrough"),
            btn("underline", () => editor.chain().focus().toggleUnderline().run(), <Underline size={13} />, "Underline - Ctrl+U"),
            btn("bullet", () => editor.chain().focus().toggleBulletList().run(), <List size={13} />, "Bullet list"),
            btn("ordered", () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered size={13} />, "Numbered list"),
            btn("link", () => {
              const url = window.prompt("Link URL");
              if (url === null) return;
              if (!url) {
                editor.chain().focus().unsetLink().run();
                return;
              }
              editor.chain().focus().setLink({ href: url }).run();
            }, <Link2 size={13} />, "Insert link"),
            btn("undo", () => editor.chain().focus().undo().run(), <Undo2 size={13} />, "Undo - Ctrl+Z"),
            btn("redo", () => editor.chain().focus().redo().run(), <Redo2 size={13} />, "Redo - Ctrl+Shift+Z"),
          ].filter(Boolean)}
        {projectId && (
          <button
            type="button"
            tabIndex={-1}
            disabled={uploading || !editor}
            onMouseDown={(e) => {
              e.preventDefault();
              void pickThenUpload();
            }}
            aria-label={t("rt.image")}
            title={t("rt.image")}
            className="ml-auto flex h-6 items-center gap-1 rounded px-1.5 text-[11px] text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
          >
            {uploading && <LoaderCircle size={12} className="animate-spin" />}
            <ImageIcon size={13} />
            {t("rt.image")}
          </button>
        )}
      </div>
      <EditorContent editor={editor} />
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handlePicked(e);
        }}
      />
    </div>
  );
}

/** True when a stored note/comment body carries HTML worth rendering richly. */
export function looksLikeHtml(text: string): boolean {
  return /<(p|br|strong|em|s|u|ul|ol|li|blockquote|h[1-6]|a|img|code|pre)\b/i.test(text);
}
