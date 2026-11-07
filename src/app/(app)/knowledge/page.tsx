import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getKnowledgeGraph } from "@/lib/services/knowledge";
import { KnowledgeGraphView } from "@/components/knowledge/knowledge-graph";

export const metadata: Metadata = {
  title: "Knowledge brain",
  description:
    "Force-directed knowledge map over projects, tickets, members and unanswered questions with explainable health scores (admin/team).",
  robots: { index: false, follow: false },
};

/**
 * Obsidian-style knowledge brain (admin/team only): a force-directed graph
 * over projects, tickets, members and unanswered required questions, plus an
 * explainable per-project health score.
 */
export default async function KnowledgePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.globalRole === "client") redirect("/dashboard");

  const graph = await getKnowledgeGraph(user);
  return <KnowledgeGraphView graph={graph} />;
}
