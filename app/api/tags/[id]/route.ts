import { NextRequest, NextResponse } from "next/server";
import { tagSchema } from "@/lib/validation/schemas";
import { updateEntity, deleteEntityHard, listEntities, updateManyEntities } from "@/lib/data/entity-crud";
import { toErrorResponse, badRequest, notFound } from "@/lib/api-utils";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const partialSchema = tagSchema.partial().omit({ id: true, createdAt: true });
    const parsed = partialSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid tag patch", parsed.error.issues);
    }
    const updated = await updateEntity("tags", id, parsed.data, `Update tag ${id}`);
    if (!updated) return notFound("Tag not found");
    return NextResponse.json({ tag: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tags = await listEntities("tags");
    if (!tags.some((t) => t.id === id)) return notFound("Tag not found");

    const removed = await deleteEntityHard("tags", id, `Delete tag ${id}`);
    if (!removed) return notFound("Tag not found");

    // Cascade: strip the deleted tag from every resource that referenced it.
    const resources = await listEntities("resources");
    const affectedIds = resources
      .filter((r) => Array.isArray(r.tags) && (r.tags as string[]).includes(id))
      .map((r) => r.id);
    if (affectedIds.length > 0) {
      await updateManyEntities(
        "resources",
        affectedIds,
        (item) => ({ tags: (item.tags as string[]).filter((t) => t !== id) }),
        `Remove deleted tag ${id} from resources`
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
