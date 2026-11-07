import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listUsers } from "@/lib/services/users";
import { AdminUsers } from "@/components/admin/admin-users";

export const metadata: Metadata = {
  title: "Admin console",
  description: "Manage DymTicket accounts and global roles (admins only).",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.globalRole !== "admin") redirect("/dashboard");
  const users = await listUsers();
  return <AdminUsers currentUserId={user.id} initialUsers={users} />;
}
