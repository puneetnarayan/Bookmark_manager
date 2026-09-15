import { NextRequest, NextResponse } from "next/server";
import { updateEntity } from "@/lib/data/entity-crud";
import { generateShareId } from "@/lib/sharing/share";
import { toErrorResponse, badRequest, notFound } from "@/lib/api-utils";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const mode = body.mode as "private" | "link" | undefined;
    if (mode !== "private" && mode !== "link") {
      return badRequest('mode must be "private" or "link"');
    }

    const patch =
      mode === "link"
        ? { shareMode: "link" as const, shareId: generateShareId() }
        : { shareMode: "private" as const, shareId: null };

    const updated = await updateEntity("collections", id, patch, `Set sharing mode to ${mode} for collection ${id}`);
    if (!updated) return notFound("Collection not found");
    return NextResponse.json({ collection: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}
