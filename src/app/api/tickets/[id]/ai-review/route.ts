import { requireSessionUser } from "@/lib/auth";
import { readJson, route } from "@/lib/api";
import { reviewTicketContent } from "@/lib/services/ai-review";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/tickets/[id]/ai-review - admin/team only. Asks Gemini to review
 * the ticket content and question/option design. Returns READ-ONLY
 * suggestions; any upstream failure surfaces as a calm 503 maintenance
 * response instead of breaking the page.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id } = await params;
    await readJson(request); // {}
    const review = await reviewTicketContent(user, id);
    return Response.json({ review });
  });
  return response;
}
