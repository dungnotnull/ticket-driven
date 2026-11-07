import fs from "node:fs/promises";
import { Readable } from "node:stream";
import { GetObjectCommand, type GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { TicketModel } from "@/lib/models";
import { requireSessionUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/rbac";
import { getStorageDriver, safeLocalPath, s3ClientFor, storageBucket } from "@/lib/storage";
import { route } from "@/lib/api";

type RouteParams = { params: Promise<{ key: string[] }> };

/** Extension fallback for images embedded in rich text (no attachment row). */
function mimeFromKey(key: string): string | null {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    default: return null;
  }
}

/**
 * GET /api/files/<key> - auth-checked media streaming.
 * Authorization keys off the KEY ITSELF: its `tickets/<projectId>/` segment
 * selects the project, and project-level READ access is enforced - the same
 * level every ticket reference resolves to. Ticket-free preview WORKS: a
 * rich-text editor uploads and previews its image BEFORE the ticket is ever
 * saved; when an attachments row exists it enriches content-type/filename.
 * Because the owning project comes straight from the key, a foreign key
 * pasted into rich text can never tunnel cross-project assets (and private
 * project assets stay private with no public CDN base on B2/R2).
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { key: segments } = await params;
    const key = segments.join("/");
    const parts = key.split("/");
    const projectId = parts[0] === "tickets" && /^[a-f0-9]{24}$/i.test(parts[1] ?? "")
      ? parts[1]
      : null;
    if (!projectId) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }
    await getProjectAccess(projectId, "read", user);

    // A referencing ticket (if any) carries the nicer metadata row.
    const ticket = (await TicketModel.findOne({
      "attachments.key": key,
    })
      .select("attachments")
      .lean()) as {
      attachments: Array<{
        key: string;
        name: string;
        contentType: string;
        size: number;
      }>;
    } | null;

    const attachment = ticket?.attachments.find((a) => a.key === key);
    const contentType =
      attachment?.contentType ?? mimeFromKey(key) ?? "application/octet-stream";
    const fileName = attachment?.name ?? key.split("/").pop() ?? "file";
    const filenameParam = `filename*=UTF-8''${encodeURIComponent(fileName)}`;
    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `inline; ${filenameParam}`,
      "Cache-Control": "private, max-age=300",
    });

    const driver = getStorageDriver();
    if (driver) {
      const client = s3ClientFor(driver);
      let object: GetObjectCommandOutput;
      try {
        object = await client.send(
          new GetObjectCommand({ Bucket: storageBucket(driver), Key: key }),
        );
      } catch (error) {
        // Deleted/cleaned object -> calm 404 (never a 500 spinner).
        const meta = (error as { $metadata?: { httpStatusCode?: number } }).$metadata;
        const code = (error as { name?: string }).name ?? "";
        if (code === "NoSuchKey" || code === "NotFound" || meta?.httpStatusCode === 404) {
          return Response.json({ error: "Not found." }, { status: 404 });
        }
        throw error;
      }
      if (!object.Body) {
        return Response.json({ error: "Not found." }, { status: 404 });
      }
      headers.set(
        "Content-Length",
        String(object.ContentLength ?? attachment?.size ?? 0),
      );
      const stream = Readable.toWeb(object.Body as Readable);
      return new Response(stream as unknown as ReadableStream, { headers });
    }

    const abs = safeLocalPath(key);
    if (!abs) return Response.json({ error: "Not found." }, { status: 404 });
    try {
      const data = await fs.readFile(abs);
      headers.set("Content-Length", String(data.byteLength));
      return new Response(data as unknown as ReadableStream, { headers });
    } catch {
      return Response.json({ error: "Not found." }, { status: 404 });
    }
  });
  return response;
}
