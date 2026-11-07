import { getSessionUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { route } from "@/lib/api";

export async function GET() {
  const response = await route(async () => {
    // Ensure the DB is reachable before trusting the session user.
    await connectDB();
    const user = await getSessionUser();
    return Response.json({ user });
  });
  return response;
}
