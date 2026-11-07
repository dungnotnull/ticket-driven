import { requireSessionUser } from "@/lib/auth";
import { readJson, route } from "@/lib/api";
import { reviewSchema } from "@/lib/validation";
import { reviewTicket } from "@/lib/services/tickets";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/tickets/[id]/review - client review actions.
 * - approved            → ticket auto-moves to Done (note optional)
 * - under_review        → stays in current column (note optional)
 * - changes_requested   → REQUIRES note, ticket auto-moves to In Progress
 */
export async function POST(request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id } = await params;
    const input = reviewSchema.parse(await readJson(request));
    const ticket = await reviewTicket(user, id, input);
    return Response.json({ ticket });
  });
  return response;
}
