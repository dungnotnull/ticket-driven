import { clearSessionCookie } from "@/lib/auth";
import { route } from "@/lib/api";

export async function POST() {
  const response = await route(async () => {
    await clearSessionCookie();
    return Response.json({ ok: true });
  });
  return response;
}
