"use client";

import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

/** Allowlist matching what the Tiptap editor can actually produce plus the
 * served-image URL shape. Everything else (scripts, styles, iframes, event
 * handlers...) is stripped before any feedback HTML touches the DOM. */
const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "s", "u", "del",
  "ul", "ol", "li", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6",
  "a", "img", "code", "pre", "hr",
];

const ALLOWED_ATTR = ["href", "src", "alt", "title", "target", "rel", "data-type"];

const ALLOWED_URI = /^(?:https?:|\/api\/files\/|\/)/i;

/** Sanitize stored rich feedback (comments / review notes) for display. */
export function sanitizeNoteHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: ALLOWED_URI,
  });
}

/** Renders sanitized rich-note HTML (Tiptap bodies live in .rt-content). */
export function RichNote({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={cn("rt-content max-w-none text-[12.5px] leading-relaxed text-foreground/90", className)}
      // sanitized above with a strict allowlist (DOMPurify)
      dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(html) }}
    />
  );
}
