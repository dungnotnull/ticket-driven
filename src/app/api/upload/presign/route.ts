import { requireSessionUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/rbac";
import { readJson, route } from "@/lib/api";
import { presignSchema } from "@/lib/validation";
import { getStorageDriver, presignStorage } from "@/lib/storage";

/**
 * POST /api/upload/presign
 * Validated media upload ticket for direct browser → storage uploads.
 * Drivers: Cloudflare R2 (production) or HMAC-signed local dev fallback.
 */
export async function POST(request: Request) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const input = presignSchema.parse(await readJson(request));
    // Only project team/admins may initiate uploads for that project.
    await getProjectAccess(input.projectId, "write", user);
    const upload = await presignStorage({
      projectId: input.projectId,
      fileName: input.fileName,
      contentType: input.contentType,
    });
    return Response.json(
      { ...upload, driver: getStorageDriver() },
      { status: 201 },
    );
  });
  return response;
}
