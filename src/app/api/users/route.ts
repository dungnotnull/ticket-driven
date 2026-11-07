import { connectDB } from "@/lib/db";
import { UserModel } from "@/lib/models";
import { registerSchema, globalRoleSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";
import { ApiError, readJson, route } from "@/lib/api";

/** GET /api/users - admin-only directory listing. */
export async function GET() {
  const response = await route(async () => {
    await requireAdmin();
    await connectDB();
    const users = await UserModel.find()
      .select("-passwordHash")
      .sort({ createdAt: 1 })
      .lean();
    return Response.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        globalRole: u.globalRole,
        createdAt: new Date(u.createdAt ?? new Date()).toISOString(),
      })),
    });
  });
  return response;
}

/** POST /api/users - admin creates/invites a user with a global role. */
export async function POST(request: Request) {
  const response = await route(async () => {
    await requireAdmin();
    const raw = (await readJson(request)) as Record<string, unknown>;
    const input = registerSchema.parse(raw);
    const role = globalRoleSchema.safeParse(raw.globalRole);
    await connectDB();
    const email = input.email.toLowerCase().trim();
    const existing = await UserModel.findOne({ email }).lean();
    if (existing) throw new ApiError(409, "An account with this email already exists.");
    const doc = await UserModel.create({
      name: input.name,
      email,
      passwordHash: await hashPassword(input.password),
      globalRole: role.success ? role.data : "team",
    });
    return Response.json(
      {
        user: {
          id: doc.id,
          name: doc.name,
          email: doc.email,
          globalRole: doc.globalRole,
        },
      },
      { status: 201 },
    );
  });
  return response;
}
