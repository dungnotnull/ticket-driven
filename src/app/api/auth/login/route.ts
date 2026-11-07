import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models";
import { loginSchema } from "@/lib/validation";
import {
  createSessionCookie,
  toSessionUser,
  verifyPassword,
} from "@/lib/auth";
import { ApiError, readJson, route } from "@/lib/api";
import { assertLoginAllowed, recordLoginFailure } from "@/lib/rate-limit";

// A bcrypt hash of an unrelated password keeps the timing profile even
// when the account does not exist (mitigates user enumeration).
const DUMMY_HASH = "$2b$10$C6UzMDM.H6dfI/f/IKcEe.e7G8H4Z1RlYv9w8OZ2yN7Zm9K3mW7Xu";

export async function POST(request: Request) {
  const response = await route(async () => {
    const input = loginSchema.parse(await readJson(request));
    // Brute-force brake: 10 FAILED attempts / 5 min per IP+email pair. Only
    // failures increment, so real users/batteries can log in repeatedly.
    const identity = input.email.toLowerCase().trim();
    assertLoginAllowed(request, identity);
    await connectDB();

    const email = input.email.toLowerCase().trim();
    const user = await UserModel.findOne({ email }).lean();
    if (!user) {
      recordLoginFailure(request, identity);
      await verifyPassword(input.password, DUMMY_HASH);
      throw new ApiError(401, "Invalid email or password.");
    }

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      recordLoginFailure(request, identity);
      throw new ApiError(401, "Invalid email or password.");
    }

    await createSessionCookie(user._id.toString());
    return Response.json({ user: toSessionUser(user) });
  });
  return response;
}
