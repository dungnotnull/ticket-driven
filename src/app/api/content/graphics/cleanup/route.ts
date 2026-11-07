import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/rbac";
import { readJson, route } from "@/lib/api";
import { objectIdSchema } from "@/lib/validation";
import { TicketModel } from "@/lib/models";
import { deleteStorageObjects } from "@/lib/storage-cleanup";
import { enforceRateLimit } from "@/lib/rate-limit";

const cleanupSchema = z.object({
  projectId: objectIdSchema,
  keys: z
    .array(z.string().min(1).max(400))
    .max(50, "Pass at most 50 keys per cleanup call."),
});

/** Escape a storage key for the $regex reference check. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * POST /api/content/graphics/cleanup
 * Orphan garbage collector for media uploaded inside draft surfaces
 * (rich-text editors, pending attachments) that never became part of a
 * saved ticket/project. Deletes ONLY keys that are safe: they must belong
 * to the project AND appear in no ticket's attachments/description/
 * activity notes. Anything referenced stays - the server decides.
 */
export async function POST(request: Request) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const input = cleanupSchema.parse(await readJson(request));
    enforceRateLimit(request, "mediaCleanup", user.id);
    await getProjectAccess(input.projectId, "read", user);

    const prefix = `tickets/${input.projectId}/`;
    const inScope = input.keys.filter(
      (key) =>
        key.startsWith(prefix) && /^[A-Za-z0-9][A-Za-z0-9._\-/]*$/.test(key),
    );
    const orphans: string[] = [];
    for (const key of inScope) {
      const pattern = escapeRegex(key);
      const referenced = (await TicketModel.countDocuments({
        projectId: input.projectId,
        $or: [
          { "attachments.key": key },
          { description: { $regex: pattern } },
          { "activity.note": { $regex: pattern } },
        ],
      }).catch(() => 1));
      if (referenced === 0) orphans.push(key);
    }
    const removed = await deleteStorageObjects(orphans);
    return Response.json({ removed, considered: inScope.length });
  });
  return response;
}
