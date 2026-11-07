import { requireSessionUser } from "@/lib/auth";
import { ApiError, readJson, route } from "@/lib/api";
import { createProjectSchema } from "@/lib/validation";
import {
  createProject,
  listProjectsForUser,
} from "@/lib/services/projects";

/** GET /api/projects - projects visible to the session user. */
export async function GET() {
  const response = await route(async () => {
    const user = await requireSessionUser();
    const projects = await listProjectsForUser(user);
    return Response.json({ projects });
  });
  return response;
}

/** POST /api/projects - create a project (admins & team members). */
export async function POST(request: Request) {
  const response = await route(async () => {
    const user = await requireSessionUser();
    if (user.globalRole === "client") {
      throw new ApiError(403, "Clients cannot create projects.");
    }
    const input = createProjectSchema.parse(await readJson(request));
    const project = await createProject(user, input);
    return Response.json({ project }, { status: 201 });
  });
  return response;
}
