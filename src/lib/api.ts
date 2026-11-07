import { ZodError } from "zod";

/**
 * Stable machine codes carried by every ApiError -> client i18n maps them to
 * the active UI language (EN/JA) while the human message stays the server's
 * English fallback detail.
 */
export type ApiErrorCode =
  | "VALIDATION"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "AI_MAINTENANCE"
  | "PROJECT_NAME_TAKEN"
  | "TICKET_NAME_TAKEN"
  | "MEMBER_ALREADY"
  | "USER_NOT_FOUND"
  | "INTERNAL";

const DEFAULT_CODE: Record<number, ApiErrorCode> = {
  400: "VALIDATION",
  401: "AUTH_REQUIRED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
  503: "SERVICE_UNAVAILABLE",
};

/** Typed error thrown by guards/services, mapped to a JSON response. */
export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;

  constructor(status: number, message: string, code?: ApiErrorCode) {
    super(message);
    this.status = status;
    this.code = code ?? DEFAULT_CODE[status] ?? "INTERNAL";
    this.name = "ApiError";
  }
}

export const unauthorized = (msg = "You must be signed in.") =>
  new ApiError(401, msg);
export const forbidden = (msg = "You do not have access to this resource.") =>
  new ApiError(403, msg);
export const notFound = (msg = "Resource not found.") => new ApiError(404, msg);
export const badRequest = (msg = "Invalid request.") => new ApiError(400, msg);

/** Parse a JSON body with a guaranteed object result (throws ApiError otherwise). */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
}

function zodMessage(error: ZodError): string {
  const issue = error.issues[0];
  const path = issue?.path.filter((p) => typeof p === "string").join(".");
  return issue ? `${path ? `${path}: ` : ""}${issue.message}` : "Validation failed.";
}

/**
 * Wrap a route handler: converts ApiError/ZodError into clean JSON errors
 * (message + stable code for client-side i18n) and logs unexpected failures.
 */
export async function route(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: zodMessage(error), code: "VALIDATION" },
        { status: 400 },
      );
    }
    console.error("[api] unhandled error:", error);
    return Response.json(
      { error: "Internal server error.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
