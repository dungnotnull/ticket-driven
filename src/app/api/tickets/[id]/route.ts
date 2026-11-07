import { requireSessionUser } from "@/lib/auth";
import { readJson, route } from "@/lib/api";
import { updateTicketSchema } from "@/lib/validation";
import {
  deleteTicket,
  getTicket,
  updateTicket,
} from "@/lib/services/tickets";

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/tickets/[id] - ticket with full activity log. */
export async function GET(_request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id } = await params;
    const ticket = await getTicket(user, id);
    return Response.json({ ticket });
  });
  return response;
}

/** PATCH - edit ticket fields (team/admin). */
export async function PATCH(request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id } = await params;
    const input = updateTicketSchema.parse(await readJson(request));
    const ticket = await updateTicket(user, id, input);
    return Response.json({ ticket });
  });
  return response;
}

/** DELETE - remove a ticket (team/admin). */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id } = await params;
    await deleteTicket(user, id);
    return Response.json({ ok: true });
  });
  return response;
}
