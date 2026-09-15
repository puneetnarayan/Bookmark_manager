import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { quickLinkSchema } from "@/lib/validation/schemas";
import { listEntities, createEntity } from "@/lib/data/entity-crud";
import { toErrorResponse, badRequest } from "@/lib/api-utils";
import { validateAndNormalizeUrl } from "@/lib/urls/normalize";

export async function GET() {
  try {
    const quickLinks = await listEntities("quick-links");
    return NextResponse.json({ quickLinks });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.url === "string") {
      const { valid, normalized, error } = validateAndNormalizeUrl(body.url);
      if (!valid) return badRequest(error || "Invalid URL");
      body.url = normalized;
    }
    const now = new Date().toISOString();
    const parsed = quickLinkSchema.safeParse({
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...body,
    });
    if (!parsed.success) {
      return badRequest("Invalid quick link", parsed.error.issues);
    }
    const quickLink = await createEntity(
      "quick-links",
      parsed.data,
      `Create quick link: ${parsed.data.name}`
    );
    return NextResponse.json({ quickLink }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
