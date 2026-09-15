import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse, badRequest } from "@/lib/api-utils";
import { validateAndNormalizeUrl } from "@/lib/urls/normalize";
import { fetchUrlMetadata } from "@/lib/urls/metadata";

/** Preview-only metadata fetch for the Add Resource form. Never persists anything. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.url !== "string") return badRequest("url is required");
    const { valid, normalized, error } = validateAndNormalizeUrl(body.url);
    if (!valid || !normalized) return badRequest(error || "Invalid URL");

    const metadata = await fetchUrlMetadata(normalized);
    return NextResponse.json({ url: normalized, metadata });
  } catch (err) {
    return toErrorResponse(err);
  }
}
