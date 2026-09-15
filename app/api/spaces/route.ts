import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { spaceSchema } from "@/lib/validation/schemas";
import { listEntities, createEntity } from "@/lib/data/entity-crud";
import { toErrorResponse, badRequest } from "@/lib/api-utils";

export async function GET() {
  try {
    const spaces = await listEntities("spaces");
    return NextResponse.json({ spaces });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const now = new Date().toISOString();
    const parsed = spaceSchema.safeParse({
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...body,
    });
    if (!parsed.success) {
      return badRequest("Invalid space", parsed.error.issues);
    }
    const space = await createEntity("spaces", parsed.data, `Create space: ${parsed.data.name}`);
    return NextResponse.json({ space }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
