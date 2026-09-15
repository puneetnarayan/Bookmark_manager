import { NextRequest, NextResponse } from "next/server";
import { nextItemSchema } from "@/lib/validation/schemas";
import { updateEntity, deleteEntityHard } from "@/lib/data/entity-crud";
import { toErrorResponse, badRequest, notFound } from "@/lib/api-utils";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const partialSchema = nextItemSchema.partial().omit({ id: true, createdAt: true });
    const parsed = partialSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid Next item patch", parsed.error.issues);
    }
    const patch = { ...parsed.data } as Record<string, unknown>;
    if (parsed.data.completed === true) {
      patch.completedAt = new Date().toISOString();
    } else if (parsed.data.completed === false) {
      patch.completedAt = null;
    }
    const updated = await updateEntity("tasks", id, patch, `Update Next item ${id}`);
    if (!updated) return notFound("Next item not found");
    return NextResponse.json({ task: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const removed = await deleteEntityHard("tasks", id, `Remove Next item ${id}`);
    if (!removed) return notFound("Next item not found");
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
