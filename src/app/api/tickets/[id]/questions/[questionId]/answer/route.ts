import { requireSessionUser } from "@/lib/auth";
import { readJson, route } from "@/lib/api";
import { answerQuestionSchema } from "@/lib/validation";
import { answerTicketQuestion } from "@/lib/services/tickets";

type RouteParams = { params: Promise<{ id: string; questionId: string }> };

/**
 * POST /api/tickets/[id]/questions/[questionId]/answer - any project member
 * can answer (workflow targets clients). One answer per member: re-answering
 * replaces the previous one. Choice answers are bounds/multiplicity-checked.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id, questionId } = await params;
    const input = answerQuestionSchema.parse(await readJson(request));
    const ticket = await answerTicketQuestion(user, id, questionId, input);
    return Response.json({ ticket });
  });
  return response;
}
