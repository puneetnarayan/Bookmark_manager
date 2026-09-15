import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { resourceSchema } from "@/lib/validation/schemas";
import { listEntities, createEntity } from "@/lib/data/entity-crud";
import { toErrorResponse, badRequest } from "@/lib/api-utils";
import { validateAndNormalizeUrl } from "@/lib/urls/normalize";
import { extractDomain } from "@/lib/urls/normalize";
import { fetchUrlMetadata } from "@/lib/urls/metadata";

export async function GET() {
  try {
    const resources = await listEntities("resources");
    return NextResponse.json({ resources });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    if (typeof body.url !== "string") {
      return badRequest("url is required");
    }
    const { valid, normalized, error } = validateAndNormalizeUrl(body.url);
    if (!valid || !normalized) {
      return badRequest(error || "Invalid URL");
    }

    // Metadata retrieval is best-effort and time-boxed; it must never block or fail the save.
    let fetched: Awaited<ReturnType<typeof fetchUrlMetadata>> = {
      title: null,
      description: null,
      favicon: null,
      image: null,
    };
    if (!body.title || body.fetchMetadata !== false) {
      fetched = await fetchUrlMetadata(normalized).catch(() => fetched);
    }

    const now = new Date().toISOString();
    const parsed = resourceSchema.safeParse({
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...body,
      url: normalized,
      title: body.title || fetched.title || normalized,
      description: body.description || fetched.description || "",
      favicon: body.favicon ?? fetched.favicon ?? null,
      thumbnail: body.thumbnail ?? fetched.image ?? null,
      domain: extractDomain(normalized),
      createdAtOrder: Date.now(),
    });
    if (!parsed.success) {
      return badRequest("Invalid resource", parsed.error.issues);
    }

    const resource = await createEntity(
      "resources",
      parsed.data,
      `Add resource: ${parsed.data.title || parsed.data.url}`
    );
    return NextResponse.json({ resource }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
