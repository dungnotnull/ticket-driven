import { requireSessionUser } from "@/lib/auth";
import { readJson, route } from "@/lib/api";
import {
  addMemberSchema,
  updateMemberSchema,
  removeMemberSchema,
} from "@/lib/validation";
import {
  addProjectMember,
  removeProjectMember,
  updateProjectMember,
} from "@/lib/services/projects";

type RouteParams = { params: Promise<{ id: string }> };

/** POST - add a member by email (project admins / global admins). */
export async function POST(request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id } = await params;
    const input = addMemberSchema.parse(await readJson(request));
    const project = await addProjectMember(id, user, input);
    return Response.json({ project }, { status: 201 });
  });
  return response;
}

/** PATCH - change a member's project role. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id } = await params;
    const input = updateMemberSchema.parse(await readJson(request));
    const project = await updateProjectMember(id, user, input);
    return Response.json({ project });
  });
  return response;
}

/** DELETE - remove a member (userId in body). */
export async function DELETE(request: Request, { params }: RouteParams) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const { id } = await params;
    const input = removeMemberSchema.parse(await readJson(request));
    const project = await removeProjectMember(id, user, input.userId);
    return Response.json({ project });
  });
  return response;
}
