import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { collectionSchema } from "@/lib/validation/schemas";
import { listEntities, createEntity } from "@/lib/data/entity-crud";
import { toErrorResponse, badRequest } from "@/lib/api-utils";

export async function GET() {
  try {
    const collections = await listEntities("collections");
    return NextResponse.json({ collections });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const now = new Date().toISOString();
    const parsed = collectionSchema.safeParse({
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...body,
    });
    if (!parsed.success) {
      return badRequest("Invalid collection", parsed.error.issues);
    }
    const collection = await createEntity(
      "collections",
      parsed.data,
      `Create collection: ${parsed.data.name}`
    );
    return NextResponse.json({ collection }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
