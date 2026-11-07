import fs from "node:fs/promises";
import { Readable } from "node:stream";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { TicketModel } from "@/lib/models";
import { requireSessionUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/rbac";
import { getStorageDriver, safeLocalPath } from "@/lib/storage";
import { route } from "@/lib/api";

type RouteParams = { params: Promise<{ key: string[] }> };

/**
 * GET /api/files/<key> - auth-checked attachment streaming.
 * Membership of the owning ticket's project is required, so private project
 * assets stay private even when R2 has no public CDN base configured.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { key: segments } = await params;
    const key = segments.join("/");

    if (!key.startsWith("tickets/")) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    const ticket = (await TicketModel.findOne({ "attachments.key": key })
      .select("projectId attachments")
      .lean()) as {
      projectId: { toString(): string };
      attachments: Array<{
        key: string;
        name: string;
        contentType: string;
        size: number;
      }>;
    } | null;

    if (!ticket) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    await getProjectAccess(ticket.projectId.toString(), "read", user);

    const attachment = ticket.attachments.find((a) => a.key === key);
    const contentType = attachment?.contentType ?? "application/octet-stream";
    const fileName = attachment?.name ?? key.split("/").pop() ?? "file";
    const filenameParam = `filename*=UTF-8''${encodeURIComponent(fileName)}`;
    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `inline; ${filenameParam}`,
      "Cache-Control": "private, max-age=300",
    });

    if (getStorageDriver() === "r2") {
      const client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
      });
      const object = await client.send(
        new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }),
      );
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
