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

/** Round-34 @-mention candidate (project members only). */
export type MentionCandidate = { id: string; name: string; email: string };

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
  /** Round-34: when set, typing "@" opens the member autocomplete overlay
   * (arrow keys / click to insert `@Name `). Server scans are authoritative;
   * this is pure UX sugar. */
  mentionCandidates?: MentionCandidate[];
  /** Round-35: exclude THIS user id from the mention list (you cannot tag
   * yourself; the server never notifies the actor anyway). */
  mentionExcludeId?: string;
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
  mentionCandidates,
  mentionExcludeId,
}: RichTextEditorProps) {
  const { t } = useLang();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  /* -------- round-34 @-mention autocomplete (Facebook-style) -------- */
  type MentionState = { query: string; from: number; to: number } | null;
  const [mention, setMention] = useState<MentionState>(null);
  const [mentionIdx, setMentionIdx] = useState(0);

  // Round-35: you can never tag yourself - drop the current user first.
  const mentionPool = (mentionCandidates ?? []).filter(
    (m) => m.id !== mentionExcludeId,
  );

  const mentionMatches = (() => {
    if (!mention || !mentionPool.length) return [];
    const q = mention.query.toLowerCase();
    const scored = mentionPool.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    );
    // First-word (>=3 chars) match like the server-scan logic, e.g. "Alex".
    const first = mentionPool.filter((m) => {
      const firstWord = m.name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
      return q.length >= 3 && firstWord.startsWith(q);
    });
    const seen = new Set<string>();
    return [...scored, ...first].filter((m) => !seen.has(m.id) && seen.add(m.id)).slice(0, 6);
  })();

  function detectMention(editor: Editor) {
    if (!mentionPool.length) return setMention(null);
    const { from, to } = editor.state.selection;
    if (from !== to) return setMention(null);
    const start = Math.max(0, from - 40);
    const textBefore = editor.state.doc.textBetween(start, from, "\n", "\u0000");
    const match = /(?:^|[\s>])@([^\s@]{0,30})$/.exec(textBefore);
    if (!match) return setMention(null);
    const query = match[1];
    const atPos = from - query.length - 1;
    setMention({ query, from: atPos, to: from });
    setMentionIdx(0);
  }

  const insertMention = useCallback(
    (candidate: MentionCandidate) => {
      const current = editorRef.current;
      if (!current || !mention) return;
      current
        .chain()
        .focus()
        .insertContentAt(
          { from: mention.from, to: mention.to },
          `@${candidate.name} `,
        )
        .run();
      setMention(null);
    },
    [mention],
  );

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
      detectMention(current);
    },
  });

  /* Keyboard support for the mention overlay (arrow keys + Enter/Tab/Esc). */
  useEffect(() => {
    if (!editor || !mention || mentionMatches.length === 0) return;
    const dom = editor.view.dom;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIdx((i) => (i + 1) % mentionMatches.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIdx((i) => (i - 1 + mentionMatches.length) % mentionMatches.length);
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertMention(mentionMatches[mentionIdx] ?? mentionMatches[0]);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setMention(null);
      }
    };
    dom.addEventListener("keydown", handler, true);
    return () => dom.removeEventListener("keydown", handler, true);
  }, [editor, mention, mentionIdx, mentionMatches, insertMention]);

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
        "relative rounded-lg border border-border bg-surface transition-colors focus-within:border-border-strong",
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
      {/* @-mention autocomplete overlay (project members only, round-34). */}
      {mention && mentionMatches.length > 0 && (
        <div
          className="absolute z-30 left-2 right-2 top-8 max-h-44 overflow-y-auto rounded-lg border border-border bg-surface-2 py-1 shadow-xl scroll-thin-xs"
          data-testid="mention-menu"
        >
          <p className="px-2.5 pb-1 text-[10.5px] text-muted">{t("notif.atHint")}</p>
          {mentionMatches.map((m, i) => (
            <button
              key={m.id}
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault(); // keep editor selection
                insertMention(m);
              }}
              onMouseEnter={() => setMentionIdx(i)}
              data-testid={`mention-option-${m.id}`}
              data-active={i === mentionIdx}
              className={cn(
                "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px] transition-colors",
                i === mentionIdx
                  ? "bg-surface text-primary"
                  : "text-foreground/90 hover:bg-surface hover:text-primary",
              )}
            >
              <span className="size-5 shrink-0 rounded-full bg-primary/15 text-center text-[10px] leading-5 text-primary">
                {m.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate font-medium">{m.name}</span>
              <span className="truncate text-[10.5px] text-muted">{m.email}</span>
            </button>
          ))}
        </div>
      )}
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
