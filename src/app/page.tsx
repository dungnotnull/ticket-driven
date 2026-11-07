import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

/**
 * Root is a pure redirect bouncer. It reads cookies at request time, so
 * opt out of the streaming-prerender shell (Cache Components requirement).
 */
export const instant = false;

export default async function RootPage() {
  let signedIn = false;
  try {
    signedIn = (await getSessionUser()) !== null;
  } catch {
    signedIn = false;
  }
  redirect(signedIn ? "/dashboard" : "/login");
}
