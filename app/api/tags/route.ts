import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { tagSchema } from "@/lib/validation/schemas";
import { listEntities, createEntity } from "@/lib/data/entity-crud";
import { toErrorResponse, badRequest } from "@/lib/api-utils";

export async function GET() {
  try {
    const tags = await listEntities("tags");
    return NextResponse.json({ tags });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const now = new Date().toISOString();
    const parsed = tagSchema.safeParse({ id: randomUUID(), createdAt: now, updatedAt: now, ...body });
    if (!parsed.success) {
      return badRequest("Invalid tag", parsed.error.issues);
    }
    const existing = await listEntities("tags");
    if (existing.some((t) => (t.name as string).toLowerCase() === parsed.data.name.toLowerCase())) {
      return badRequest("A tag with this name already exists");
    }
    const tag = await createEntity("tags", parsed.data, `Create tag: ${parsed.data.name}`);
    return NextResponse.json({ tag }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
