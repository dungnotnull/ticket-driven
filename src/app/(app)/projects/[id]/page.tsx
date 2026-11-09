import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { getProjectDetail, getProjectMetaForTitle } from "@/lib/services/projects";
import { listTickets } from "@/lib/services/tickets";
import { peekProjectRole } from "@/lib/rbac";
import { BoardWorkspace } from "@/components/board/board-workspace";
import { Skeleton, LoaderBar } from "@/components/ui/skeleton";

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

/**
 * Per-request board content (session + project + tickets). Behind Suspense so
 * the build prerenders only the safe skeleton shell - a cookie-less build
 * render must never bake notFound()/redirect() into the shared document.
 */
async function BoardContent({ id }: { id: string }) {
  const user = await getSessionUser();
  if (!user) notFound();

  let project;
  let tickets;
  let myRole: "admin" | "team" | "client" | null = null;
  try {
    // Fully parallel: session-cold serverless instances have a tight
    // function budget (Netlify sync functions cap at 10s) - getProjectDetail
    // is RBAC-checked inside, and non-403/404 errors propagate.
    [project, tickets, myRole] = await Promise.all([
      getProjectDetail(id, user),
      listTickets(user, { projectId: id }),
      peekProjectRole(id) as Promise<"admin" | "team" | "client" | null>,
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

/** Prerendered (shared) skeleton for any board document. */
function BoardFallback() {
  return (
    <div className="space-y-6">
      <LoaderBar />
      <Skeleton className="h-12 rounded-xl" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl max-md:hidden" />
      </div>
    </div>
  );
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<BoardFallback />}>
      <BoardContent id={id} />
    </Suspense>
  );
}
