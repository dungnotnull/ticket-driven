import { connectDB } from "@/lib/db";
import { UserModel, GLOBAL_ROLES, type GlobalRole } from "@/lib/models";
import { ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import type { UserDTO } from "@/lib/types";

export interface AdminUserDTO extends UserDTO {
  createdAt: string;
}

export async function listUsers(): Promise<AdminUserDTO[]> {
  await connectDB();
  const docs = await UserModel.find()
    .select("-passwordHash")
    .sort({ createdAt: 1 })
    .lean();
  return docs.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    globalRole: (GLOBAL_ROLES as readonly string[]).includes(u.globalRole)
      ? (u.globalRole as GlobalRole)
      : "team",
    createdAt: new Date(u.createdAt ?? new Date()).toISOString(),
  }));
}

export async function createUserByAdmin(input: {
  name: string;
  email: string;
  password: string;
  globalRole?: GlobalRole;
}): Promise<AdminUserDTO> {
  await connectDB();
  const email = input.email.toLowerCase().trim();
  const existing = await UserModel.findOne({ email }).lean();
  if (existing) throw new ApiError(409, "An account with this email already exists.");
  const doc = await UserModel.create({
    name: input.name,
    email,
    passwordHash: await hashPassword(input.password),
    globalRole: input.globalRole ?? "team",
  });
  return {
    id: doc.id,
    name: doc.name,
    email: doc.email,
    globalRole: doc.globalRole as GlobalRole,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

export async function changeGlobalRole(input: {
  actorId: string;
  userId: string;
  globalRole: GlobalRole;
}): Promise<void> {
  await connectDB();
  if (input.userId === input.actorId) {
    throw new ApiError(400, "You cannot change your own role.");
  }
  const result = await UserModel.updateOne(
    { _id: input.userId },
    { $set: { globalRole: input.globalRole } },
  );
  if (result.matchedCount === 0) throw new ApiError(404, "User not found.");
}

export async function deleteUser(
  actorId: string,
  userId: string,
): Promise<void> {
  await connectDB();
  if (userId === actorId) throw new ApiError(400, "You cannot delete your own account.");
  await UserModel.deleteOne({ _id: userId });
}
