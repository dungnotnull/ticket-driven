import path from "node:path";
import fs from "node:fs/promises";
import { MAX_ATTACHMENT_BYTES } from "@/lib/types";
import { safeLocalPath, verifyLocalUploadSignature } from "@/lib/storage";

/**
 * PUT /api/upload/local?key=..&exp=..&sig=..
 * Dev-only fallback driver target for the presigned PUT flow, protected by
 * an HMAC signature with expiry - mirrors the R2 presigned-PUT contract.
 */
export async function PUT(request: Request) {
  const response = await (async () => {
    try {
      const url = new URL(request.url);
      const key = url.searchParams.get("key") ?? "";
      const exp = url.searchParams.get("exp") ?? "";
      const sig = url.searchParams.get("sig") ?? "";

      if (!key.startsWith("tickets/") || !verifyLocalUploadSignature(key, exp, sig)) {
        return Response.json({ error: "Invalid or expired upload URL." }, { status: 403 });
      }

      const body = await request.arrayBuffer();
      if (body.byteLength === 0) {
        return Response.json({ error: "Empty upload body." }, { status: 400 });
      }
      if (body.byteLength > MAX_ATTACHMENT_BYTES) {
        return Response.json(
          { error: "Files must be 10 MB or smaller." },
          { status: 413 },
        );
      }

      const abs = safeLocalPath(key);
      if (!abs) {
        return Response.json({ error: "Invalid storage key." }, { status: 400 });
      }
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, Buffer.from(body));

      return Response.json({ ok: true, key });
    } catch (error) {
      console.error("[upload/local] failed:", error);
      return Response.json({ error: "Upload failed." }, { status: 500 });
    }
  })();
  return response;
}
