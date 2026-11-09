import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

/**
 * Root is a pure redirect bouncer. It reads cookies at request time: the
 * decision lives behind <Suspense> so the build prerenders only an inert
 * skeleton shell - a cookie-less build-time render must never bake
 * redirect("/login") into the shared document (that is exactly the class of
 * prerendered redirect shell that bounced signed-in users back to /login).
 */
export const instant = false;

async function RootBouncer() {
  let signedIn = false;
  try {
    signedIn = (await getSessionUser()) !== null;
  } catch {
    signedIn = false;
  }
  // redirect() throws and never returns; the trailing null only satisfies
  // the JSX component type so this can render inside <Suspense>.
  redirect(signedIn ? "/dashboard" : "/login");
  return null;
}

export default function RootPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <div className="skeleton h-10 w-44 rounded-xl" />
        </div>
      }
    >
      <RootBouncer />
    </Suspense>
  );
}
