import { requireSessionUser } from "@/lib/auth";
import { readJson, route } from "@/lib/api";
import { createHeartToggleSchema } from "@/lib/validation";
import { toggleTicketHeart } from "@/lib/services/tickets";
import { enforceRateLimit } from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/tickets/[id]/hearts - toggle a heart on one reply/feedback
 * entry (Facebook-style: at most ONE heart per user, click again to undo).
 */
export async function POST(request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id } = await params;
    enforceRateLimit(request, "comments", user.id);
    const input = createHeartToggleSchema.parse(await readJson(request));
    const result = await toggleTicketHeart(user, id, input.activityId);
    return Response.json({ ok: true, ...result });
  });
  return response;
}
