import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listUsers } from "@/lib/services/users";
import { AdminUsers } from "@/components/admin/admin-users";
import { Skeleton, LoaderBar } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Admin console",
  description: "Manage DymTicket accounts and global roles (admins only).",
  robots: { index: false, follow: false },
};

/**
 * Per-request content (session + accounts). Behind Suspense so the build
 * prerenders only the safe skeleton shell - a cookie-less build-time render
 * must never bake redirect("/login") into the shared document.
 */
async function AdminContent() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.globalRole !== "admin") redirect("/dashboard");
  const users = await listUsers();
  return <AdminUsers currentUserId={user.id} initialUsers={users} />;
}

/** Prerendered (shared) skeleton for the admin console. */
function AdminFallback() {
  return (
    <div className="space-y-6">
      <LoaderBar />
      <Skeleton className="h-12 rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl max-sm:hidden" />
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminFallback />}>
      <AdminContent />
    </Suspense>
  );
}
