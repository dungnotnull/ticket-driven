import mongoose from "mongoose";

/**
 * Netlify SCHEDULED function (round-34): every Monday 00:00 (UTC) delete
 * seen notifications older than 30 days - the user-approved cron policy.
 * Self-contained on purpose: it runs OUTSIDE the Next.js bundle and only
 * needs MONGODB_URI (+ MONGODB_DB).
 *
 * Configure - netlify.toml: [functions."notifications-cleanup"] schedule = "0 0 * * 1"
 */
export default async (req: Request, context: { waitUntil: (p: Promise<unknown>) => void }) => {
  const uri = process.env.MONGODB_URI;
  const db = process.env.MONGODB_DB || "kanban";
  if (!uri) {
    return new Response(JSON.stringify({ ok: false, error: "MONGODB_URI missing" }), { status: 500 });
  }
  const run = async () => {
    const conn = await mongoose.createConnection(uri, { dbName: db }).asPromise();
    const database = conn.db;
    if (!database) throw new Error("Mongo connection returned no database handle");
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const res = await database
        .collection("notifications")
        .deleteMany({ seen: true, seenAt: { $lte: cutoff } });
      console.log(`[notifications-cleanup] deleted ${res.deletedCount} seen notifications (cutoff ${cutoff.toISOString()})`);
      return res.deletedCount;
    } finally {
      await conn.close();
    }
  };
  const deleted = await run();
  return new Response(JSON.stringify({ ok: true, deleted }), { status: 200 });
};

export const config = {
  // Every Monday 00:00 UTC ("0:00 thứ 2 hàng tuần").
  schedule: "0 0 * * 1",
};
