"use client";

import DOMPurify from "dompurify";
import { cn, escapeRegExp } from "@/lib/utils";

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

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Round-34b: decorate `@Name` tokens with the Facebook-style mention chip
 * (bold + light indigo background). Runs AFTER sanitization on TEXT SEGMENTS
 * ONLY (tag segments are skipped) so attributes (src/alt/urls) can never be
 * touched. Longest names first so "Alex Rivera" wins over a sibling prefix.
 */
export function highlightMentions(html: string, names: string[]): string {
  if (names.length === 0 || !html) return html;
  const segments = html.split(/(<[^>]*>)/);
  const sorted = [...names].sort((a, b) => b.length - a.length);
  for (let i = 0; i < segments.length; i++) {
    if (i % 2 === 1) continue; // tag segment
    if (!segments[i].includes("@")) continue;
    let seg = segments[i];
    for (const name of sorted) {
      if (!name) continue;
      const re = new RegExp(
        `(^|\\s)@(${escapeRegExp(name)})(?=$|\\s|[.,!?;:)\\]<>])`,
        "gi",
      );
      seg = seg.replace(re, (_m, pre, nm) => {
        return `${pre}<strong class="mention-chip">@${escapeHtml(nm)}</strong>`;
      });
    }
    segments[i] = seg;
  }
  return segments.join("");
}

/** Renders sanitized rich-note HTML (Tiptap bodies live in .rt-content),
 * optionally decorating @-mentions of the given member names. */
export function RichNote({
  html,
  className,
  memberNames,
}: {
  html: string;
  className?: string;
  /** Project member names (round-34b) - enables the @mention chip styling. */
  memberNames?: string[];
}) {
  const decorated = memberNames?.length
    ? highlightMentions(sanitizeNoteHtml(html), memberNames)
    : sanitizeNoteHtml(html);
  return (
    <div
      className={cn("rt-content max-w-none text-[12.5px] leading-relaxed text-foreground/90", className)}
      // sanitized above with a strict allowlist (DOMPurify); decoration only
      // wraps member-name text in controlled <strong> chips
      dangerouslySetInnerHTML={{ __html: decorated }}
    />
  );
}
