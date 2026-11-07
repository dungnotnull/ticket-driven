import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ApiError } from "./api";
import { ALLOWED_ATTACHMENT_TYPES } from "./types";

/**
 * Storage abstraction - CLOUD-ONLY for NEW uploads:
 *  - "r2" -> Cloudflare R2 (S3-compatible) presigned PUT production uploads.
 *  - "b2" -> Backblaze B2 (S3-compatible) presigned PUT uploads; same flow,
 *    configured via B2_* credentials (see .env.example).
 *  - No local fallback for uploads: without S3-compatible credentials
 *    presigning THROWS a safety error (surfaced as a calm toast - never
 *    breaks the page).
 *  - Legacy local files already in `.data/uploads` remain downloadable via
 *    the HMAC-verified file route below.
 */

export type StorageDriver = "r2" | "b2";

/** User-facing safety message; surfaced via toast (never thrown to the UI). */
export const STORAGE_UNCONFIGURED_MESSAGE =
  "File uploads are unavailable - cloud storage (R2/S3) is not configured on this deployment.";

const PRESIGN_TTL_SECONDS = 900; // 15 minutes

const B2_DEFAULT_REGION = "us-west-004";

/** null = no cloud credentials: uploads must be refused upstream. */
export function getStorageDriver(): StorageDriver | null {
  if (
    process.env.B2_KEY_ID &&
    process.env.B2_APPLICATION_KEY &&
    process.env.B2_BUCKET
  ) {
    return "b2";
  }
  return process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
    ? "r2"
    : null;
}

/** Target bucket per driver (validated by getStorageDriver beforehand). */
export function storageBucket(driver: StorageDriver): string {
  return driver === "b2"
    ? process.env.B2_BUCKET!
    : process.env.R2_BUCKET!;
}

/** One S3-compatible client builder for every supported driver. */
export function s3ClientFor(driver: StorageDriver): S3Client {
  if (driver === "b2") {
    return new S3Client({
      region: process.env.B2_REGION?.trim() || B2_DEFAULT_REGION,
      endpoint: `https://s3.${
        process.env.B2_REGION?.trim() || B2_DEFAULT_REGION
      }.backblazeb2.com`,
      credentials: {
        accessKeyId: process.env.B2_KEY_ID!,
        secretAccessKey: process.env.B2_APPLICATION_KEY!,
      },
    });
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

/** Collisions impossible via uuid; keys stay inside tickets/<projectId>/... */
export function buildObjectKey(projectId: string, fileName: string): string {
  const raw = (fileName.split(/[\\/]/).pop() ?? "file").slice(0, 150);
  const base =
    raw
      .normalize("NFKD")
      .replace(/[^\w.\-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "file";
  return `tickets/${projectId}/${randomUUID()}/${base}`;
}

export interface PresignedUpload {
  driver: StorageDriver;
  key: string;
  /** URL the browser PUTs the raw file bytes to. */
  uploadUrl: string;
  /** Direct public URL when R2_PUBLIC_BASE is configured; else undefined. */
  directUrl?: string;
  uploadHeaders: Record<string, string>;
  expiresIn: number;
}

function hmacSecret(): string {
  return `upload-signing:${process.env.AUTH_SECRET ?? "dev-secret"}`;
}

function signLocalKey(key: string, exp: number): string {
  return createHmac("sha256", hmacSecret()).update(`${key}:${exp}`).digest("hex");
}

export async function presignStorage(options: {
  projectId: string;
  fileName: string;
  contentType: string;
}): Promise<PresignedUpload> {
  const { projectId, fileName, contentType } = options;
  const driver = getStorageDriver();
  if (!driver) {
    // Safety gate: refuse uploads rather than silently falling back to disk.
    throw new ApiError(503, STORAGE_UNCONFIGURED_MESSAGE);
  }
  const key = buildObjectKey(projectId, fileName);

  const command = new PutObjectCommand({
    Bucket: storageBucket(driver),
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3ClientFor(driver), command, {
    expiresIn: PRESIGN_TTL_SECONDS,
  });
  const base =
    driver === "b2"
      ? process.env.B2_PUBLIC_BASE?.replace(/\/+$/, "")
      : process.env.R2_PUBLIC_BASE?.replace(/\/+$/, "");
  return {
    driver,
    key,
    uploadUrl,
    directUrl: base ? `${base}/${key}` : undefined,
    uploadHeaders: { "Content-Type": contentType },
    expiresIn: PRESIGN_TTL_SECONDS,
  };
}

/** Constant-time verification for the local fallback upload route. */
export function verifyLocalUploadSignature(
  key: string,
  exp: string,
  sig: string,
): boolean {
  const expNum = Number(exp);
  if (!Number.isInteger(expNum) || expNum * 1000 < Date.now()) return false;
  const expected = signLocalKey(key, expNum);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Resolve a storage key to a safe absolute path inside the uploads root. */
export function safeLocalPath(key: string): string | null {
  const root = path.resolve(process.cwd(), ".data", "uploads");
  const abs = path.resolve(root, key);
  if (!abs.startsWith(root + path.sep)) return null;
  return abs;
}

export function isAllowedContentType(value: string): boolean {
  return (ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(value);
}

/** Auth-checked streaming path used whenever no direct URL exists. */
export function downloadPath(key: string): string {
  return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
}
