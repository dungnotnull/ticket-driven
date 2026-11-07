import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listProjectsForUser } from "@/lib/services/projects";
import { ProjectsView } from "@/components/dashboard/projects-view";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Your DymTicket workspace overview - every project you collaborate on, with role badges and quick board access.",
  robots: { index: false, follow: false },
};

/** Authenticated via (app) layout - but a session can lapse mid-flight. */
export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const projects = await listProjectsForUser(user);
  const canCreate = user.globalRole !== "client";
  return (
    <ProjectsView projects={projects} canCreate={canCreate} role={user.globalRole} />
  );
}
