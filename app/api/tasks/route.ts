import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { nextItemSchema } from "@/lib/validation/schemas";
import { listEntities, createEntity } from "@/lib/data/entity-crud";
import { toErrorResponse, badRequest } from "@/lib/api-utils";

export async function GET() {
  try {
    const tasks = await listEntities("tasks");
    return NextResponse.json({ tasks });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const now = new Date().toISOString();
    const parsed = nextItemSchema.safeParse({
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...body,
    });
    if (!parsed.success) {
      return badRequest("Invalid Next item", parsed.error.issues);
    }
    const task = await createEntity("tasks", parsed.data, `Add to Next: ${parsed.data.title}`);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
