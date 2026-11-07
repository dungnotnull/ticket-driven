import { requireSessionUser } from "@/lib/auth";
import { readJson, route } from "@/lib/api";
import { updateProjectSchema } from "@/lib/validation";
import {
  deleteProject,
  getProjectDetail,
  updateProjectMeta,
} from "@/lib/services/projects";

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/projects/[id] - project detail incl. populated members. */
export async function GET(_request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id } = await params;
    const project = await getProjectDetail(id, user);
    return Response.json({ project });
  });
  return response;
}

/** PATCH /api/projects/[id] - rename / re-describe (project admins). */
export async function PATCH(request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id } = await params;
    const input = updateProjectSchema.parse(await readJson(request));
    const project = await updateProjectMeta(id, user, input);
    return Response.json({ project });
  });
  return response;
}

/** DELETE /api/projects/[id] - removes the project and its tickets. */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id } = await params;
    await deleteProject(id, user);
    return Response.json({ ok: true });
  });
  return response;
}
