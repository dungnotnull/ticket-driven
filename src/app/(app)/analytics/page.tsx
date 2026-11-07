import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrgStats } from "@/lib/services/stats";
import { AnalyticsView } from "@/components/analytics/analytics-view";

export const metadata: Metadata = {
  title: "Analytics",
  description:
    "Organization-level delivery analytics - throughput, review pipeline, workload and client-response coverage (admin/team).",
  robots: { index: false, follow: false },
};

/**
 * Workspace analytics (admin/team only). Global admins see every project;
 * team roles see the projects they belong to. Clients are bounced home.
 */
export default async function AnalyticsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.globalRole === "client") redirect("/dashboard");

  const stats = await getOrgStats(user);
  return <AnalyticsView stats={stats} />;
}
