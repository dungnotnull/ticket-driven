"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/rbac";
import { globalRoleSchema, registerSchema } from "@/lib/validation";
import { GLOBAL_ROLES, type GlobalRole } from "@/lib/models";
import { changeGlobalRole, createUserByAdmin, deleteUser, type AdminUserDTO } from "@/lib/services/users";
import { toError, type ActionResult } from "@/lib/action-utils";

export async function changeGlobalRoleAction(
  input: { userId: string; globalRole: string },
): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const role = GLOBAL_ROLES.includes(input.globalRole as GlobalRole)
      ? (input.globalRole as GlobalRole)
      : "team";
    await changeGlobalRole({ actorId: actor.id, userId: input.userId, globalRole: role });
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function deleteUserAction(
  input: { userId: string },
): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    await deleteUser(actor.id, input.userId);
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function createUserAction(
  input: Record<string, unknown>,
): Promise<ActionResult<AdminUserDTO>> {
  try {
    await requireAdmin();
    const base = registerSchema.parse(input);
    const role = globalRoleSchema.safeParse(input.globalRole);
    const user = await createUserByAdmin({
      name: base.name,
      email: base.email,
      password: base.password,
      globalRole: role.success ? role.data : "team",
    });
    revalidatePath("/admin");
    return { ok: true, data: user };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
