import { ZodError } from "zod";

/** Typed error thrown by guards/services, mapped to a JSON response. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
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
 * and logs unexpected failures.
 */
export async function route(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return Response.json({ error: zodMessage(error) }, { status: 400 });
    }
    console.error("[api] unhandled error:", error);
    return Response.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
