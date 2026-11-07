import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { getProjectDetail, getProjectMetaForTitle } from "@/lib/services/projects";
import { listTickets } from "@/lib/services/tickets";
import { peekProjectRole } from "@/lib/rbac";
import { BoardWorkspace } from "@/components/board/board-workspace";

/** Dynamic board title: project name for authorized viewers only -
 * non-members / guests get a generic title (no data leak). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const fallbackTitle = "Board";
  try {
    const user = await getSessionUser();
    if (!user) return { title: fallbackTitle };
    const meta = await getProjectMetaForTitle(id, user);
    return {
      title: `${meta.name} - Board`,
      description:
        meta.description ||
        `Kanban board for "${meta.name}" on DymTicket - tickets, reviews and client collaboration.`,
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: fallbackTitle, robots: { index: false, follow: false } };
  }
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  let project;
  let tickets;
  let myRole: "admin" | "team" | "client" | null = null;
  try {
    // Parallel fetches: tickets + effective role resolve independently.
    project = await getProjectDetail(id, user);
    [tickets, myRole] = await Promise.all([
      listTickets(user, { projectId: id }),
      peekProjectRole(id),
    ]);
  } catch (error) {
    // 403 (non-member) and 404: hide the project's existence. Anything else
    // (e.g. database outage) surfaces through the error boundary.
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }

  return (
    <BoardWorkspace
      project={project}
      tickets={tickets}
      myRole={myRole ?? "team"}
      myUserId={user.id}
    />
  );
}
