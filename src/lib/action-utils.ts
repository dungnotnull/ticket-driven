import { ApiError } from "@/lib/api";
import { ZodError } from "zod";

/** Shape returned by every server action across the RSC boundary. */
export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

/** Convert any thrown value into a safe, user-facing error string. */
export function toError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return issue ? issue.message : "Validation failed.";
  }
  console.error("[action] unexpected error:", error);
  return "Something went wrong. Please try again.";
}
