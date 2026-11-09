import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getKnowledgeGraph } from "@/lib/services/knowledge";
import { KnowledgeGraphView } from "@/components/knowledge/knowledge-graph";
import { Skeleton, LoaderBar } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Knowledge brain",
  description:
    "Force-directed knowledge map over projects, tickets, members and unanswered questions with explainable health scores (admin/team).",
  robots: { index: false, follow: false },
};

/**
 * Per-request content (session + knowledge graph). Behind Suspense so the
 * build prerenders only the safe skeleton shell - a cookie-less build-time
 * render must never bake redirect("/login") into the shared document.
 */
async function KnowledgeContent() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.globalRole === "client") redirect("/dashboard");

  const graph = await getKnowledgeGraph(user);
  return <KnowledgeGraphView graph={graph} />;
}

/** Prerendered (shared) skeleton for the knowledge brain. */
function KnowledgeFallback() {
  return (
    <div className="space-y-6">
      <LoaderBar />
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}

/**
 * Obsidian-style knowledge brain (admin/team only): a force-directed graph
 * over projects, tickets, members and unanswered required questions, plus an
 * explainable per-project health score.
 */
export default function KnowledgePage() {
  return (
    <Suspense fallback={<KnowledgeFallback />}>
      <KnowledgeContent />
    </Suspense>
  );
}
