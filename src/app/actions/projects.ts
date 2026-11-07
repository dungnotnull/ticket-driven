"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { toError, type ActionResult } from "@/lib/action-utils";
import {
  addMemberSchema,
  createProjectSchema,
  removeMemberSchema,
  updateMemberSchema,
  updateProjectSchema,
} from "@/lib/validation";
import {
  addProjectMember,
  createProject,
  deleteProject,
  removeProjectMember,
  updateProjectMember,
  updateProjectMeta,
} from "@/lib/services/projects";
import type { ProjectDTO } from "@/lib/types";

/** Shared shape that serializes across the RSC boundary. */
type ActionInput = Record<string, unknown>;

export async function createProjectAction(
  input: ActionInput,
): Promise<ActionResult<ProjectDTO>> {
  try {
    const user = await requireSessionUser();
    if (user.globalRole === "client") {
      throw new ApiError(403, "Clients cannot create projects.");
    }
    const data = createProjectSchema.parse(input);
    const project = await createProject(user, data);
    revalidatePath("/dashboard");
    return { ok: true, data: project };
  } catch (error) {
    return { ok: false, ...toError(error) };
  }
}

export async function updateProjectAction(
  input: ActionInput,
): Promise<ActionResult<ProjectDTO>> {
  try {
    const user = await requireSessionUser();
    const parsed = updateProjectSchema.parse(input.patch);
    const project = await updateProjectMeta(String(input.projectId), user, parsed);
    revalidatePath("/dashboard");
    revalidatePath(`/projects/${input.projectId}`);
    return { ok: true, data: project };
  } catch (error) {
    return { ok: false, ...toError(error) };
  }
}

export async function deleteProjectAction(
  input: ActionInput,
): Promise<ActionResult> {
  try {
    const user = await requireSessionUser();
    await deleteProject(String(input.projectId), user);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return { ok: false, ...toError(error) };
  }
}

export async function addMemberAction(
  input: ActionInput,
): Promise<ActionResult<ProjectDTO>> {
  try {
    const user = await requireSessionUser();
    const data = addMemberSchema.parse(input.member);
    const project = await addProjectMember(String(input.projectId), user, data);
    revalidatePath(`/projects/${input.projectId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: project };
  } catch (error) {
    return { ok: false, ...toError(error) };
  }
}

export async function updateMemberAction(
  input: ActionInput,
): Promise<ActionResult<ProjectDTO>> {
  try {
    const user = await requireSessionUser();
    const data = updateMemberSchema.parse(input.member);
    const project = await updateProjectMember(String(input.projectId), user, data);
    revalidatePath(`/projects/${input.projectId}`);
    return { ok: true, data: project };
  } catch (error) {
    return { ok: false, ...toError(error) };
  }
}

export async function removeMemberAction(
  input: ActionInput,
): Promise<ActionResult<ProjectDTO>> {
  try {
    const user = await requireSessionUser();
    const data = removeMemberSchema.parse(input.member);
    const project = await removeProjectMember(String(input.projectId), user, data.userId);
    revalidatePath(`/projects/${input.projectId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: project };
  } catch (error) {
    return { ok: false, ...toError(error) };
  }
}
