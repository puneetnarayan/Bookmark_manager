import { NextRequest, NextResponse } from "next/server";
import { quickLinkSchema } from "@/lib/validation/schemas";
import { updateEntity, deleteEntityHard } from "@/lib/data/entity-crud";
import { toErrorResponse, badRequest, notFound } from "@/lib/api-utils";
import { validateAndNormalizeUrl } from "@/lib/urls/normalize";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (typeof body.url === "string") {
      const { valid, normalized, error } = validateAndNormalizeUrl(body.url);
      if (!valid) return badRequest(error || "Invalid URL");
      body.url = normalized;
    }
    const partialSchema = quickLinkSchema.partial().omit({ id: true, createdAt: true });
    const parsed = partialSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid quick link patch", parsed.error.issues);
    }
    const updated = await updateEntity("quick-links", id, parsed.data, `Update quick link ${id}`);
    if (!updated) return notFound("Quick link not found");
    return NextResponse.json({ quickLink: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const removed = await deleteEntityHard("quick-links", id, `Delete quick link ${id}`);
    if (!removed) return notFound("Quick link not found");
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
