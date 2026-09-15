import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteSchema, noteTargetEnum } from "@/lib/validation/schemas";
import { listEntities } from "@/lib/data/entity-crud";
import { updateDataFile } from "@/lib/data/store";
import { toErrorResponse, badRequest } from "@/lib/api-utils";
import type { Note } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const targetType = url.searchParams.get("targetType");
    const targetId = url.searchParams.get("targetId");
    let notes = await listEntities("notes");
    if (targetType) notes = notes.filter((n) => n.targetType === targetType);
    if (targetId) notes = notes.filter((n) => n.targetId === targetId);
    return NextResponse.json({ notes });
  } catch (err) {
    return toErrorResponse(err);
  }
}

const upsertSchema = noteSchema.pick({ targetType: true, targetId: true, content: true });

/** Notes are keyed one-per-target: POST creates or overwrites the note for that target. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetTypeParsed = noteTargetEnum.safeParse(body.targetType);
    if (!targetTypeParsed.success) {
      return badRequest("Invalid targetType");
    }
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid note", parsed.error.issues);
    }

    let result: Note | undefined;
    const now = new Date().toISOString();
    await updateDataFile(
      "notes",
      (current) => {
        const existingIndex = current.findIndex(
          (n) => n.targetType === parsed.data.targetType && n.targetId === parsed.data.targetId
        );
        if (existingIndex >= 0) {
          const updatedNote: Note = { ...current[existingIndex], content: parsed.data.content, updatedAt: now };
          result = updatedNote;
          const next = [...current];
          next[existingIndex] = updatedNote;
          return next;
        }
        const created: Note = {
          id: randomUUID(),
          createdAt: now,
          updatedAt: now,
          targetType: parsed.data.targetType,
          targetId: parsed.data.targetId,
          content: parsed.data.content,
        };
        result = created;
        return [...current, created];
      },
      `Save note for ${parsed.data.targetType}:${parsed.data.targetId}`
    );

    return NextResponse.json({ note: result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
