import { NextRequest, NextResponse } from "next/server";
import { collectionSchema } from "@/lib/validation/schemas";
import { updateEntity, deleteEntityHard, listEntities } from "@/lib/data/entity-crud";
import { toErrorResponse, badRequest, notFound } from "@/lib/api-utils";
import { createBackup } from "@/lib/backup/backup";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const partialSchema = collectionSchema.partial().omit({ id: true, createdAt: true });
    const parsed = partialSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid collection patch", parsed.error.issues);
    }
    const updated = await updateEntity("collections", id, parsed.data, `Update collection ${id}`);
    if (!updated) return notFound("Collection not found");
    return NextResponse.json({ collection: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const hard = new URL(request.url).searchParams.get("hard") === "true";

    if (hard) {
      const collections = await listEntities("collections");
      const target = collections.find((c) => c.id === id);
      if (target) {
        await createBackup(`before permanently deleting collection "${target.name}"`);
      }
      const removed = await deleteEntityHard("collections", id, `Permanently delete collection ${id}`);
      if (!removed) return notFound("Collection not found");
      return NextResponse.json({ deleted: true });
    }

    const updated = await updateEntity(
      "collections",
      id,
      { deletedAt: new Date().toISOString() },
      `Move collection ${id} to trash`
    );
    if (!updated) return notFound("Collection not found");
    return NextResponse.json({ collection: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}
