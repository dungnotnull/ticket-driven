import { requireSessionUser } from "@/lib/auth";
import { readJson, route } from "@/lib/api";
import { updateQuestionSchema } from "@/lib/validation";
import { deleteTicketQuestion, updateTicketQuestion } from "@/lib/services/tickets";

type RouteParams = { params: Promise<{ id: string; questionId: string }> };

/**
 * PUT /api/tickets/[id]/questions/[questionId] - admin/team may edit a
 * question at any time (even after answers); existing answers are sanitized.
 * DELETE - removes the question and its answers.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id, questionId } = await params;
    const input = updateQuestionSchema.parse(await readJson(request));
    const ticket = await updateTicketQuestion(user, id, questionId, input);
    return Response.json({ ticket });
  });
  return response;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id, questionId } = await params;
    const ticket = await deleteTicketQuestion(user, id, questionId);
    return Response.json({ ticket });
  });
  return response;
}
