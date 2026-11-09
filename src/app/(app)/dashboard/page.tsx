import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listProjectsForUser } from "@/lib/services/projects";
import { ProjectsView } from "@/components/dashboard/projects-view";
import { ConsoleBanner } from "@/components/ui/console-banner";
import { Skeleton, LoaderBar } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Your DymTicket workspace overview - every project you collaborate on, with role badges and quick board access.",
  robots: { index: false, follow: false },
};

/**
 * Per-request content: reads the session + projects. Lives behind Suspense so
 * the build prerenders only the safe skeleton shell (a cookie-less build-time
 * render must never bake a redirect("/login") into the shared document).
 */
async function DashboardContent() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const projects = await listProjectsForUser(user);
  const canCreate = user.globalRole !== "client";
  return (
    <>
      <ConsoleBanner />
      <ProjectsView projects={projects} canCreate={canCreate} role={user.globalRole} />
    </>
  );
}

/** Prerendered (shared) skeleton for the home dashboard. */
function DashboardFallback() {
  return (
    <div className="space-y-6">
      <LoaderBar />
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl max-sm:hidden" />
      </div>
    </div>
  );
}

/** Authenticated via (app) layout - but a session can lapse mid-flight. */
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}
