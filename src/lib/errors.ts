import { ZodError } from "zod";
export class ApiError extends Error { constructor(public status: number, message: string, public code = "REQUEST_FAILED") { super(message); } }
export function setupRequired(service: string): never { throw new ApiError(503, `${service} is not connected yet. Add the project settings to enable this feature.`, "SETUP_REQUIRED"); }
export function errorResponse(error: unknown) {
  if (error instanceof ApiError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
  if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message ?? "Invalid input", code: "INVALID_INPUT" }, { status: 400 });
  if (error && typeof error === "object" && "code" in error && error.code === "P2025") return Response.json({ error: "Record not found.", code: "NOT_FOUND" }, { status: 404 });
  if (error && typeof error === "object" && "code" in error && error.code === "P2002") return Response.json({ error: "This record already exists.", code: "CONFLICT" }, { status: 409 });
  if (error && typeof error === "object" && "code" in error && ["P1000", "P1001", "P1002", "P2021", "P2022"].includes(String(error.code))) return Response.json({ error: "The database is unavailable or needs its migrations applied.", code: "DATABASE_UNAVAILABLE" }, { status: 503 });
  console.error("ShelfWatch request failed", error instanceof Error ? error.name : "UnknownError");
  return Response.json({ error: "We could not complete this request. Please try again.", code: "INTERNAL_ERROR" }, { status: 500 });
}
