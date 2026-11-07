import { requireSessionUser } from "@/lib/auth";
import { readJson, route } from "@/lib/api";
import { commentSchema } from "@/lib/validation";
import { addComment } from "@/lib/services/tickets";
import { enforceRateLimit } from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ id: string }> };

/** POST /api/tickets/[id]/comments - any project member can comment. */
export async function POST(request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id } = await params;
    enforceRateLimit(request, "comments", user.id);
    const input = commentSchema.parse(await readJson(request));
    const ticket = await addComment(user, id, input);
    return Response.json({ ticket });
  });
  return response;
}
