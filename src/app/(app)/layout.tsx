import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

/**
 * Authenticated shell for dashboard / project / admin routes. Session data is
 * read from cookies on every request - block the prerender shell instead of
 * streaming a redirect-prone layout (Cache Components requirement).
 */
export const instant = false;

/** Authenticated shell for dashboard / project / admin routes. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: SessionUser | null = null;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }
  if (!user) redirect("/login");
  return <AppShell user={user}>{children}</AppShell>;
}
