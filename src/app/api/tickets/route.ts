import type { ColumnKey } from "@/lib/types";
import { requireSessionUser } from "@/lib/auth";
import { ApiError, readJson, route } from "@/lib/api";
import { createTicketSchema } from "@/lib/validation";
import { createTicket, listTickets } from "@/lib/services/tickets";
import { enforceRateLimit } from "@/lib/rate-limit";

const COLUMN_KEYS = ["todo", "in_progress", "in_review", "done"] as const;

/** GET /api/tickets?projectId=...&assignee=...&status=... */
export async function GET(request: Request) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId") ?? "";
    if (!projectId) throw new ApiError(400, "projectId query parameter is required.");
    const assigneeId = url.searchParams.get("assignee") ?? undefined;
    const statusParam = url.searchParams.get("status") ?? "";
    const status = (COLUMN_KEYS as readonly string[]).includes(statusParam)
      ? (statusParam as ColumnKey)
      : undefined;
    const tickets = await listTickets(user, { projectId, assigneeId, status });
    return Response.json({ tickets });
  });
  return response;
}

/** POST /api/tickets - create a ticket (team/admin project members). */
export async function POST(request: Request) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    enforceRateLimit(request, "tickets", user.id);
    const input = createTicketSchema.parse(await readJson(request));
    const ticket = await createTicket(user, input);
    return Response.json({ ticket }, { status: 201 });
  });
  return response;
}
