import { requireSessionUser } from "@/lib/auth";
import { readJson, route } from "@/lib/api";
import { moveSchema } from "@/lib/validation";
import { moveTickets } from "@/lib/services/tickets";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/tickets/[id]/move
 * Body: { updates: [{ id, status, order }] } - sent after a DnD drop once
 * the affected column(s) have been reindexed on the client.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    await params; // route segment kept for REST symmetry with [id]
    const input = moveSchema.parse(await readJson(request));
    await moveTickets(user, input);
    return Response.json({ ok: true });
  });
  return response;
}
