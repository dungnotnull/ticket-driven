import { requireSessionUser } from "@/lib/auth";
import { readJson, route } from "@/lib/api";
import { createQuestionSchema } from "@/lib/validation";
import { createTicketQuestion } from "@/lib/services/tickets";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/tickets/[id]/questions - admin/team attach a client-verification
 * question: choice (radio single / checkbox multi) or free text, accordion UI.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id } = await params;
    const input = createQuestionSchema.parse(await readJson(request));
    const ticket = await createTicketQuestion(user, id, input);
    return Response.json({ ticket });
  });
  return response;
}
