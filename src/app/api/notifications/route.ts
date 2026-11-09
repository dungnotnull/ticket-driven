import { getSessionUser } from "@/lib/auth";
import { ApiError, route, readJson, badRequest, forbidden } from "@/lib/api";
import {
  connectDB,
} from "@/lib/db";
import {
  listNotifications,
  unreadNotificationCount,
  setNotificationSeen,
  markAllNotificationsSeen,
  purgeSeenNotifications,
} from "@/lib/services/notifications";
import { createNotificationActionSchema } from "@/lib/validation";

/**
 * GET /api/notifications?tab=unread|read|all&limit=30
 * Bell dropdown feed. Global admins never receive notifications (round-34
 * simplification), so their feed is empty by construction.
 */
export async function GET(request: Request) {
  return route(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "Not signed in.", "AUTH_REQUIRED");
    const url = new URL(request.url);
    const rawTab = url.searchParams.get("tab");
    const tab = rawTab === "read" || rawTab === "all" ? rawTab : "unread";
    const limitParam = Number(url.searchParams.get("limit") ?? "30");
    const limit = Number.isFinite(limitParam) ? limitParam : 30;
    const [items, unread] = await Promise.all([
      listNotifications(user.id, { seen: tab, limit }),
      unreadNotificationCount(user.id),
    ]);
    return Response.json({ items, unread });
  });
}

/**
 * POST /api/notifications - one compact endpoint for every bell action:
 *  {action:"seen", id, seen:boolean} | {action:"seen-all"}
 *  | {action:"purge", days?} (GLOBAL ADMIN ONLY - also the manual cron).
 */
export async function POST(request: Request) {
  return route(async () => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "Not signed in.", "AUTH_REQUIRED");
    await connectDB();
    const body = createNotificationActionSchema.parse(await readJson(request));
    if (body.action === "seen") {
      const matched = await setNotificationSeen(user.id, body.id, body.seen);
      if (!matched) throw badRequest("Notification not found for this user.");
      return Response.json({ ok: true, unread: await unreadNotificationCount(user.id) });
    }
    if (body.action === "seen-all") {
      const modified = await markAllNotificationsSeen(user.id);
      return Response.json({ ok: true, modified, unread: 0 });
    }
    // purge: admin-only (requirement: global admins skip notifications entirely,
    // so they are the natural operators of the cleanup).
    if (user.globalRole !== "admin") {
      throw forbidden("Only global admins can run the notification purge.");
    }
    const deleted = await purgeSeenNotifications(body.days ?? 30);
    return Response.json({ ok: true, deleted, days: body.days ?? 30 });
  });
}
