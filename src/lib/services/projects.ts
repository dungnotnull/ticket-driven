import { Types } from "mongoose";
import { ProjectModel, TicketModel, UserModel } from "@/lib/models";
import type { ProjectDTO } from "@/lib/types";
import { isProjectGradient } from "@/lib/gradients";
import { serializeProject, type LeanProject } from "@/lib/serialize";
import { ApiError } from "@/lib/api";
import { getProjectAccess } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";
import type { CreateProjectInput } from "@/lib/validation";
import { connectDB } from "@/lib/db";
import { isAllowedBackgroundUrl } from "@/lib/background-gallery";

const MEMBER_POPULATE = { path: "members.userId", select: "name email globalRole" } as const;

function toLean(doc: unknown, message = "Project not found."): LeanProject {
  const lean = doc as LeanProject | null;
  if (!lean) throw new ApiError(404, message);
  return lean;
}

export async function listProjectsForUser(
  user: SessionUser,
): Promise<ProjectDTO[]> {
  await connectDB();
  const filter =
    user.globalRole === "admin"
      ? {}
      : { "members.userId": new Types.ObjectId(user.id) };
  const docs = (await ProjectModel.find(filter)
    .sort({ updatedAt: -1 })
    .populate(MEMBER_POPULATE)
    .lean()) as unknown as LeanProject[];
  return docs.map(serializeProject);
}

export async function createProject(
  user: SessionUser,
  input: CreateProjectInput,
): Promise<ProjectDTO> {
  await connectDB();
  const created = await ProjectModel.create({
    name: input.name,
    description: input.description ?? "",
    ownerId: new Types.ObjectId(user.id),
    members: [{ userId: new Types.ObjectId(user.id), role: "admin" }],
  });
  const lean = toLean(await ProjectModel.findById(created._id).populate(MEMBER_POPULATE));
  return serializeProject(lean);
}

/** Lightweight read-guarded lookup used by generateMetadata (title/desc only). */
export async function getProjectMetaForTitle(
  projectId: string,
  user: SessionUser,
): Promise<{ name: string; description: string }> {
  const { project } = await getProjectAccess(projectId, "read", user);
  return { name: project.name, description: project.description ?? "" };
}

export async function updateProjectMeta(
  projectId: string,
  user: SessionUser,
  input: {
    name?: string;
    description?: string;
    backgroundUrl?: string | null;
    gradientKey?: string | null;
    defaultQuestions?:
      | Array<{
          prompt: string;
          type?: "choice" | "text";
          options?: Array<{ label: string; withText?: boolean }>;
          allowMultiple?: boolean;
          required?: boolean;
        }>
      | null;
  },
): Promise<ProjectDTO> {
  // "write" (admin AND team): the quick-add templates belong to the working
  // team; name/desc/gradient changes are the same project-meta dialog.
  const { project } = await getProjectAccess(projectId, "write", user);
  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.description !== undefined) update.description = input.description;
  if (input.backgroundUrl !== undefined) {
    // Server-side allowlist: only curated gallery URLs (or no background).
    if (
      input.backgroundUrl !== null &&
      !isAllowedBackgroundUrl(input.backgroundUrl)
    ) {
      throw new ApiError(400, "Unknown background image.");
    }
    update.backgroundUrl = input.backgroundUrl ?? "";
  }
  if (input.gradientKey !== undefined) {
    // "" and null both mean "automatic name-hash cover" (legacy saves stored
    // ""; normalizing here keeps re-saves from tripping the allowlist and
    // surfacing "Unknown header gradient." on follow-up edits).
    const key =
      (input.gradientKey ?? null) === "" ? null : (input.gradientKey ?? null);
    if (key !== null && !isProjectGradient(key)) {
      throw new ApiError(400, "Unknown header gradient.");
    }
    update.gradientKey = key ?? "";
  }
  if (input.defaultQuestions !== undefined) {
    // Sanitize: trim prompts/labels; choice questions must keep >= 2 valid
    // options, otherwise the entry degrades to a text question. null clears.
    update.defaultQuestions = (input.defaultQuestions ?? []).map((q) => {
      const options = (q.options ?? [])
        .map((o) => ({ label: (o.label ?? "").trim(), withText: o.withText === true }))
        .filter((o) => o.label.length > 0)
        .slice(0, 8);
      const type: "choice" | "text" =
        q.type === "text" || options.length < 2 ? "text" : "choice";
      return {
        prompt: (q.prompt ?? "").trim().slice(0, 200),
        type,
        options: type === "choice" ? options : [],
        allowMultiple: q.allowMultiple === true,
        required: q.required === true,
      };
    }).filter((q) => q.prompt.length > 0).slice(0, 5);
  }
  if (Object.keys(update).length > 0) {
    await ProjectModel.updateOne({ _id: project._id }, { $set: update });
  }
  const lean = toLean(
    await ProjectModel.findById(project._id).populate(MEMBER_POPULATE),
  );
  return serializeProject(lean);
}

export async function deleteProject(
  projectId: string,
  user: SessionUser,
): Promise<void> {
  const { project } = await getProjectAccess(projectId, "manage", user);
  await TicketModel.deleteMany({ projectId: project._id });
  await ProjectModel.deleteOne({ _id: project._id });
}

export async function addProjectMember(
  projectId: string,
  user: SessionUser,
  input: { email: string; role: "admin" | "team" | "client" },
): Promise<ProjectDTO> {
  const { project } = await getProjectAccess(projectId, "manage", user);
  const target = await UserModel.findOne({
    email: input.email.toLowerCase().trim(),
  }).lean();
  if (!target) throw new ApiError(404, "No account found with that email.");
  if (project.members.some((m) => m.userId?.toString() === target._id.toString())) {
    throw new ApiError(409, "That user is already a project member.");
  }
  await ProjectModel.updateOne(
    { _id: project._id },
    {
      $push: {
        members: {
          userId: new Types.ObjectId(target._id.toString()),
          role: input.role,
          addedAt: new Date(),
        },
      },
    },
  );
  const lean = toLean(
    await ProjectModel.findById(project._id).populate(MEMBER_POPULATE),
  );
  return serializeProject(lean);
}

export async function updateProjectMember(
  projectId: string,
  user: SessionUser,
  input: { userId: string; role: "admin" | "team" | "client" },
): Promise<ProjectDTO> {
  const { project } = await getProjectAccess(projectId, "manage", user);
  const targetUserId = input.userId;
  if (project.ownerId?.toString() === targetUserId) {
    throw new ApiError(400, "The project owner's role cannot be changed.");
  }
  if (!project.members.some((m) => m.userId?.toString() === targetUserId)) {
    throw new ApiError(404, "That user is not a project member.");
  }
  await ProjectModel.updateOne(
    { _id: project._id, "members.userId": new Types.ObjectId(targetUserId) },
    { $set: { "members.$.role": input.role } },
  );
  const lean = toLean(
    await ProjectModel.findById(project._id).populate(MEMBER_POPULATE),
  );
  return serializeProject(lean);
}

export async function removeProjectMember(
  projectId: string,
  user: SessionUser,
  targetUserId: string,
): Promise<ProjectDTO> {
  const { project } = await getProjectAccess(projectId, "manage", user);
  if (project.ownerId?.toString() === targetUserId) {
    throw new ApiError(400, "The project owner cannot be removed.");
  }
  await ProjectModel.updateOne(
    { _id: project._id },
    { $pull: { members: { userId: new Types.ObjectId(targetUserId) } } },
  );
  const lean = toLean(
    await ProjectModel.findById(project._id).populate(MEMBER_POPULATE),
  );
  return serializeProject(lean);
}

/** Load a single project with populated members (read-level enforced by caller). */
export async function getProjectDetail(
  projectId: string,
  user: SessionUser,
): Promise<ProjectDTO> {
  const { project } = await getProjectAccess(projectId, "read", user);
  const lean = toLean(
    await ProjectModel.findById(project._id).populate(MEMBER_POPULATE),
  );
  return serializeProject(lean);
}
