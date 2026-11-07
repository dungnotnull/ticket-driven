import { ApiError } from "@/lib/api";
import { ZodError } from "zod";

/** Shape returned by every server action across the RSC boundary. */
export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  /** Stable machine code so the client can localize the message. */
  code?: string;
  data?: T;
}

/** Convert any thrown value into a safe, user-facing error + i18n code. */
export function toError(
  error: unknown,
): { message: string; code: string } {
  if (error instanceof ApiError) {
    return { message: error.message, code: error.code };
  }
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return {
      message: issue ? issue.message : "Validation failed.",
      code: "VALIDATION",
    };
  }
  console.error("[action] unexpected error:", error);
  return {
    message: "Something went wrong. Please try again.",
    code: "INTERNAL",
  };
}
