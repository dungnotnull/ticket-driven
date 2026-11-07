import { type Types } from "mongoose";
import { ProjectModel, type GlobalRole, type ProjectDocData } from "./models";
import { forbidden, notFound } from "./api";
import {
  getSessionUser,
  requireSessionUser,
  type SessionUser,
} from "./auth";

export type ProjectRole = "admin" | "team" | "client";

export type AccessLevel = "read" | "write" | "review" | "manage";

export interface ProjectAccess {
  project: ProjectDocData & { _id: Types.ObjectId };
  /** Effective project role (global admins are treated as project admins). */
  role: ProjectRole | null;
  isGlobalAdmin: boolean;
  user: SessionUser;
}

export function stringifyProjectId(id: unknown): string {
  if (id === null || id === undefined) return "";
  return typeof id === "object" ? String(id) : String(id);
}

function roleAllows(role: ProjectRole | null, level: AccessLevel): boolean {
  if (level === "read") return role !== null;
  if (level === "write") return role === "admin" || role === "team";
  if (level === "manage") return role === "admin";
  // "review" is reserved for client stakeholders (strict spec rule).
  if (level === "review") return role === "client";
  return false;
}

/**
 * Load a project and resolve the requesting user's effective role.
 * Global admins bypass membership (read/write/manage) but clients keep
 * exclusive ownership of the review workflow.
 */
export async function getProjectAccess(
  projectId: string,
  level: AccessLevel,
  user: SessionUser | null = null,
): Promise<ProjectAccess> {
  const sessionUser = user ?? (await requireSessionUser());
  if (!/^[a-f\d]{24}$/i.test(projectId)) throw notFound("Project not found.");

  const project = (await ProjectModel.findById(projectId).lean()) as unknown as
    | (ProjectDocData & { _id: Types.ObjectId })
    | null;
  if (!project) throw notFound("Project not found.");

  const isGlobalAdmin = sessionUser.globalRole === ("admin" satisfies GlobalRole);
  const membership = project.members.find(
    (m) => stringifyProjectId(m.userId) === sessionUser.id,
  );

  const role: ProjectRole | null = isGlobalAdmin
    ? "admin"
    : ((membership?.role as ProjectRole | undefined) ?? null);

  if (isGlobalAdmin && level !== "review") {
    return { project, role: "admin", isGlobalAdmin, user: sessionUser };
  }

  if (!roleAllows(role, level)) {
    if (role === null) throw forbidden("You are not a member of this project.");
    throw forbidden(`Your role does not allow this action.`);
  }

  return { project, role, isGlobalAdmin, user: sessionUser };
}

/** API-route convenience: require signed-in user + project access. */
export async function requireProjectAccess(
  projectId: string,
  level: AccessLevel,
): Promise<ProjectAccess> {
  const user = await requireSessionUser();
  return getProjectAccess(projectId, level, user);
}

/** Guard for admin-only endpoints (user management, global listings). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireSessionUser();
  if (user.globalRole !== "admin") {
    throw forbidden("This area is restricted to administrators.");
  }
  return user;
}

/**
 * Lightweight check used by client components (no throw): returns the
 * effective project role or null. `getSessionUser` is reused via cache.
 */
export async function peekProjectRole(
  projectId: string,
): Promise<ProjectRole | null> {
  const user = await getSessionUser();
  if (!user) return null;
  try {
    const { role } = await getProjectAccess(projectId, "read", user);
    return role;
  } catch {
    return null;
  }
}
