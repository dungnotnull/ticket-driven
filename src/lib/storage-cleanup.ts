import fs from "node:fs/promises";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  getStorageDriver,
  safeLocalPath,
  s3ClientFor,
  storageBucket,
} from "./storage";

/**
 * Media cleanup layer - keeps the (free-tier) storage honest:
 * every uploaded object key (attachments + rich-text images referenced
 * from description / comment / review-note HTML) is deleted when the
 * content that referenced it disappears. Cleanup is BEST-EFFORT - it never
 * throws and never blocks the parent create/update/delete flow.
 */

/** Pull `/api/files/<key>` object references out of rich-text HTML. */
export function extractFileKeysFromHtml(
  html: string | null | undefined,
): string[] {
  if (!html) return [];
  const keys: string[] = [];
  const pattern = /\/api\/files\/([^"'\s)<>]+)/g;
  for (const match of html.matchAll(pattern)) {
    try {
      const key = match[1]!
        .split("/")
        .map((segment) => decodeURIComponent(segment))
        .join("/");
      if (key.startsWith("tickets/")) keys.push(key);
    } catch {
      // Malformed encoding in legacy content - skip this reference.
    }
  }
  return keys;
}

/** All storage keys a single ticket references (media hygiene inventory). */
export function collectTicketStorageKeys(ticket: {
  attachments?: Array<{ key: string }>;
  description?: string;
  activity?: Array<{ note?: string }>;
}): string[] {
  const keys = new Set<string>();
  for (const attachment of ticket.attachments ?? []) keys.add(attachment.key);
  for (const key of extractFileKeysFromHtml(ticket.description)) keys.add(key);
  for (const entry of ticket.activity ?? []) {
    for (const key of extractFileKeysFromHtml(entry.note)) keys.add(key);
  }
  return [...keys];
}

/** Media present in `previous` but dropped by a new version of the content. */
export function removedKeys(previous: string[], current: string[]): string[] {
  const alive = new Set(current);
  return [...new Set(previous)].filter((key) => !alive.has(key));
}

/**
 * Delete storage objects with the ACTIVE driver (cloud) or remove the
 * matching legacy files under `.data/uploads` (no driver). Idempotent and
 * failure-tolerant: individual object errors are logged, never thrown.
 */
export async function deleteStorageObjects(keys: string[]): Promise<number> {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return 0;
  const driver = getStorageDriver();
  if (!driver) {
    let removed = 0;
    await Promise.all(
      unique.map(async (key) => {
        const abs = safeLocalPath(key);
        if (!abs) return;
        try {
          await fs.unlink(abs);
          removed += 1;
        } catch {
          // Already gone / never local - nothing to clean.
        }
      }),
    );
    console.warn(
      `[storage] no driver configured - removed ${removed}/${unique.length} legacy local file(s)`,
    );
    return removed;
  }
  const client = s3ClientFor(driver);
  const bucket = storageBucket(driver);
  let deleted = 0;
  for (const key of unique) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      deleted += 1;
    } catch (error) {
      console.warn(`[storage] failed to delete object ${key}:`, error);
    }
  }
  console.warn(
    `[storage] deleted ${deleted}/${unique.length} object(s) from ${driver} bucket ${bucket}`,
  );
  return deleted;
}
