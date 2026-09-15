import { NextRequest, NextResponse } from "next/server";
import { resourceSchema } from "@/lib/validation/schemas";
import { updateEntity, deleteEntityHard, listEntities } from "@/lib/data/entity-crud";
import { toErrorResponse, badRequest, notFound } from "@/lib/api-utils";
import { validateAndNormalizeUrl, extractDomain } from "@/lib/urls/normalize";
import { createBackup } from "@/lib/backup/backup";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (typeof body.url === "string") {
      const { valid, normalized, error } = validateAndNormalizeUrl(body.url);
      if (!valid) return badRequest(error || "Invalid URL");
      body.url = normalized;
      body.domain = extractDomain(normalized!);
    }

    const partialSchema = resourceSchema.partial().omit({ id: true, createdAt: true });
    const parsed = partialSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid resource patch", parsed.error.issues);
    }
    const updated = await updateEntity("resources", id, parsed.data, `Update resource ${id}`);
    if (!updated) return notFound("Resource not found");
    return NextResponse.json({ resource: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const hard = new URL(request.url).searchParams.get("hard") === "true";

    if (hard) {
      const resources = await listEntities("resources");
      const target = resources.find((r) => r.id === id);
      if (target) {
        await createBackup(`before permanently deleting resource "${target.title || target.url}"`);
      }
      const removed = await deleteEntityHard("resources", id, `Permanently delete resource ${id}`);
      if (!removed) return notFound("Resource not found");
      return NextResponse.json({ deleted: true });
    }

    const updated = await updateEntity(
      "resources",
      id,
      { deletedAt: new Date().toISOString() },
      `Move resource ${id} to trash`
    );
    if (!updated) return notFound("Resource not found");
    return NextResponse.json({ resource: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}
