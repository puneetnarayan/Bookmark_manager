import { NextResponse } from "next/server";
import { GitHubApiError, GitHubConfigError, GitHubConflictError } from "@/lib/github/client";
import { DataValidationError } from "@/lib/data/store";

export interface ApiErrorBody {
  error: string;
  code: string;
  details?: unknown;
}

/** Maps known error types to a stable {error, code} JSON body + status, for consistent client handling. */
export function toErrorResponse(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof GitHubConflictError) {
    return NextResponse.json(
      { error: "The data changed on GitHub since you loaded it. Please retry.", code: "conflict" },
      { status: 409 }
    );
  }
  if (err instanceof GitHubConfigError) {
    return NextResponse.json(
      { error: err.message, code: "not_configured" },
      { status: 503 }
    );
  }
  if (err instanceof DataValidationError) {
    return NextResponse.json(
      { error: err.message, code: "invalid_data", details: err.issues },
      { status: 422 }
    );
  }
  if (err instanceof GitHubApiError) {
    if (err.status === 404) {
      return NextResponse.json({ error: err.message, code: "not_found" }, { status: 404 });
    }
    if (err.status === 401 || err.status === 403) {
      return NextResponse.json(
        { error: "GitHub authentication failed. Check GITHUB_TOKEN.", code: "auth_failed" },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: err.message, code: "github_error" }, { status: 502 });
  }

  const message = err instanceof Error ? err.message : "Unexpected server error";
  return NextResponse.json({ error: message, code: "internal_error" }, { status: 500 });
}

export function badRequest(message: string, details?: unknown): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: message, code: "bad_request", details }, { status: 400 });
}

export function notFound(message = "Not found"): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: message, code: "not_found" }, { status: 404 });
}
