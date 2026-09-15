import { NextRequest, NextResponse } from "next/server";
import { spaceSchema } from "@/lib/validation/schemas";
import { updateEntity, deleteEntityHard, listEntities } from "@/lib/data/entity-crud";
import { toErrorResponse, badRequest, notFound } from "@/lib/api-utils";
import { createBackup } from "@/lib/backup/backup";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const partialSchema = spaceSchema.partial().omit({ id: true, createdAt: true });
    const parsed = partialSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid space patch", parsed.error.issues);
    }
    const updated = await updateEntity("spaces", id, parsed.data, `Update space ${id}`);
    if (!updated) return notFound("Space not found");
    return NextResponse.json({ space: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const hard = new URL(request.url).searchParams.get("hard") === "true";

    if (hard) {
      const spaces = await listEntities("spaces");
      const target = spaces.find((s) => s.id === id);
      if (target) {
        await createBackup(`before permanently deleting space "${target.name}"`);
      }
      const removed = await deleteEntityHard("spaces", id, `Permanently delete space ${id}`);
      if (!removed) return notFound("Space not found");
      return NextResponse.json({ deleted: true });
    }

    const updated = await updateEntity(
      "spaces",
      id,
      { deletedAt: new Date().toISOString() },
      `Move space ${id} to trash`
    );
    if (!updated) return notFound("Space not found");
    return NextResponse.json({ space: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}
