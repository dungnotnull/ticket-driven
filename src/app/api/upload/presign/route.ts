import { requireSessionUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/rbac";
import { readJson, route } from "@/lib/api";
import { presignSchema } from "@/lib/validation";
import { getStorageDriver, presignStorage } from "@/lib/storage";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/upload/presign
 * Validated media upload ticket for direct browser -> storage uploads.
 * Drivers: Cloudflare R2 (production) or Backblaze B2 (also production);
 * IMAGES ONLY (the zod schema rejects every other content type).
 */
export async function POST(request: Request) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const input = presignSchema.parse(await readJson(request));
    // Burst brake: 30 presigns / min per user.
    enforceRateLimit(request, "presign", user.id);
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
