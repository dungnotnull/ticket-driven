import { ApiError, route } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { unreadNotificationCount } from "@/lib/services/notifications";

/**
 * GET /api/notifications/unread-count - tiny projection for the header bell
 * poll (round-34). Global admins always get 0 (they receive nothing).
 */
export async function GET() {
  return route(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "Not signed in.", "AUTH_REQUIRED");
    const unread = user.globalRole === "admin" ? 0 : await unreadNotificationCount(user.id);
    return Response.json({ unread });
  });
}
