/**
 * Server-side HTML defense layer. Rich-text bodies (ticket/project
 * descriptions, comments, review notes) are stored as HTML - the browser
 * already renders them through a strict DOMPurify allowlist (rich-note.tsx);
 * this module is the PERSISTENCE-side guard so dangerous markup never even
 * reaches the database. It never throws: on any anomaly the input is
 * softened, not rejected.
 */

/** Blocks that are removed with their whole content (nothing inside is safe). */
const BLOCK_FULLY =
  /<(script|style|iframe|object|embed|form|link|meta)[\s\S]*?<\/\1\s*>/gi;
const BLOCK_SELF_CLOSING = /<(script|style|link|meta|iframe|object|embed)\b[^>]*\/?>/gi;

/** Event-handler attributes: onclick=, onerror=, onload= ... (quoted + bare). */
const EVENT_ATTRS = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** Dangerous URL schemes in href/src/action. */
const DANGEROUS_URLS =
  /\s(href|src|action)\s*=\s*(?:"\s*(javascript|data|vbscript):[^"]*"|'\s*(javascript|data|vbscript):[^']*'|(javascript|data|vbscript):[^\s>]*)/gi;

/** Server-safe rich-HTML sanitizer (persistence-side defense in depth). */
export function stripDangerousHtml(html: string): string {
  if (!html.includes("<")) return html;
  return html
    .replace(BLOCK_FULLY, "")
    .replace(BLOCK_SELF_CLOSING, "")
    .replace(EVENT_ATTRS, "")
    .replace(DANGEROUS_URLS, " ");
}

/** Plain-text projection of rich HTML (project cards, board header, search). */
export function stripRichHtml(html: string): string {
  if (!html.includes("<")) return html;
  return html
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}
