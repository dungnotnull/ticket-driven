import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Skeleton, LoaderBar } from "@/components/ui/skeleton";

/**
 * Authenticated shell for dashboard / project / admin routes.
 *
 * Under cacheComponents the build prerenders every segment it can. This layout
 * reads cookies()/DB per request, so the per-user part sits behind <Suspense>:
 * the prerendered shell is the loading skeleton (safe to cache and share with
 * ANY visitor), while the session check + app shell stream in per request,
 * carrying the cookie. Without the boundary, the build renders the layout
 * WITHOUT a cookie, and redirect("/login") becomes the prerendered document -
 * Vercel then serves that constant 200 shell (embedded meta redirect) to every
 * signed-in visitor, which is what bounced users back to /login in production.
 */
export const instant = false;

/** Session-gated inner shell - streams per request. */
async function AuthenticatedShell({
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

/** Prerendered (shared) fallback shown while the session resolves. */
function ShellFallback() {
  return (
    <div className="min-h-dvh flex-1">
      <header className="flex items-center justify-between px-4 py-3 md:px-6">
        <Skeleton className="h-9 w-36" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <LoaderBar />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl max-sm:hidden" />
        </div>
      </div>
    </div>
  );
}

/** Authenticated shell for dashboard / project / admin routes. */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}
