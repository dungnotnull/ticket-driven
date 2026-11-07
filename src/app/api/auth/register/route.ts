import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models";
import { registerSchema } from "@/lib/validation";
import {
  createSessionCookie,
  hashPassword,
  toSessionUser,
} from "@/lib/auth";
import { ApiError, readJson, route } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

/** First registered user becomes the global admin (bootstrap convention). */
export async function POST(request: Request) {
  const response = await route(async () => {
    const input = registerSchema.parse(await readJson(request));
    // Mass-registration brake: 5 attempts / 15 min per IP+email pair.
    enforceRateLimit(request, "register", input.email.toLowerCase().trim());
    await connectDB();

    const email = input.email.toLowerCase().trim();
    const existing = await UserModel.findOne({ email }).lean();
    if (existing) {
      throw new ApiError(409, "An account with this email already exists.");
    }

    const passwordHash = await hashPassword(input.password);
    const isFirstUser = (await UserModel.countDocuments({})) === 0;
    const doc = await UserModel.create({
      name: input.name,
      email,
      passwordHash,
      globalRole: isFirstUser ? "admin" : "team",
    });

    await createSessionCookie(doc.id);
    return Response.json({ user: toSessionUser(doc) }, { status: 201 });
  });
  return response;
}
