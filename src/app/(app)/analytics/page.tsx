import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrgStats } from "@/lib/services/stats";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { Skeleton, LoaderBar } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Analytics",
  description:
    "Organization-level delivery analytics - throughput, review pipeline, workload and client-response coverage (admin/team).",
  robots: { index: false, follow: false },
};

/**
 * Per-request content (session + org stats). Behind Suspense so the build
 * prerenders only the safe skeleton shell - a cookie-less build-time render
 * must never bake redirect("/login") into the shared document.
 */
async function AnalyticsContent() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.globalRole === "client") redirect("/dashboard");

  const stats = await getOrgStats(user);
  return <AnalyticsView stats={stats} />;
}

/** Prerendered (shared) skeleton for analytics. */
function AnalyticsFallback() {
  return (
    <div className="space-y-6">
      <LoaderBar />
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl max-sm:hidden" />
      </div>
    </div>
  );
}

/**
 * Workspace analytics (admin/team only). Global admins see every project;
 * team roles see the projects they belong to. Clients are bounced home.
 */
export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsFallback />}>
      <AnalyticsContent />
    </Suspense>
  );
}
