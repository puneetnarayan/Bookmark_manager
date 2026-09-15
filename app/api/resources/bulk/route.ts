import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { updateDataFile, readDataFile } from "@/lib/data/store";
import { toErrorResponse, badRequest } from "@/lib/api-utils";
import { createBackup } from "@/lib/backup/backup";
import type { NextItem } from "@/lib/validation/schemas";

const DESTRUCTIVE_ACTIONS = new Set(["trash", "delete-permanent"]);

type BulkAction =
  | "trash"
  | "restore"
  | "delete-permanent"
  | "archive"
  | "unarchive"
  | "favorite"
  | "unfavorite"
  | "pin"
  | "unpin"
  | "add-tag"
  | "remove-tag"
  | "add-to-next"
  | "remove-from-next"
  | "move-collection";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action as BulkAction;
    const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
    if (!action || ids.length === 0) {
      return badRequest("action and a non-empty ids array are required");
    }

    if (DESTRUCTIVE_ACTIONS.has(action)) {
      await createBackup(`before bulk ${action} of ${ids.length} resource(s)`);
    }

    const idSet = new Set(ids);
    const now = new Date().toISOString();
    let affected = 0;

    if (action === "add-to-next") {
      const { data: resources } = await readDataFile("resources");
      const targets = resources.filter((r) => idSet.has(r.id));
      await updateDataFile(
        "tasks",
        (current) => {
          const created: NextItem[] = targets.map((r, i) => ({
            id: randomUUID(),
            createdAt: now,
            updatedAt: now,
            resourceId: r.id,
            collectionId: r.collectionId,
            title: r.title || r.url,
            note: "",
            priority: "normal",
            dueDate: null,
            completed: false,
            completedAt: null,
            archived: false,
            order: current.length + i,
          }));
          affected = created.length;
          return [...current, ...created];
        },
        `Add ${targets.length} resource(s) to Next`
      );
      return NextResponse.json({ action, affected });
    }

    if (action === "remove-from-next") {
      await updateDataFile(
        "tasks",
        (current) => {
          const next = current.filter((t) => !(t.resourceId && idSet.has(t.resourceId)));
          affected = current.length - next.length;
          return next;
        },
        `Remove ${ids.length} resource(s) from Next`
      );
      return NextResponse.json({ action, affected });
    }

    if (action === "move-collection") {
      const collectionId = body.collectionId as string | undefined;
      const spaceId = body.spaceId as string | undefined;
      if (!collectionId || !spaceId) {
        return badRequest("collectionId and spaceId are required for move-collection");
      }
      await updateDataFile(
        "resources",
        (current) =>
          current.map((r) => {
            if (!idSet.has(r.id)) return r;
            affected++;
            return { ...r, collectionId, spaceId, updatedAt: now };
          }),
        `Move ${ids.length} resource(s) to another collection`
      );
      return NextResponse.json({ action, affected });
    }

    if (action === "add-tag" || action === "remove-tag") {
      const tagId = body.tagId as string | undefined;
      if (!tagId) return badRequest("tagId is required");
      await updateDataFile(
        "resources",
        (current) =>
          current.map((r) => {
            if (!idSet.has(r.id)) return r;
            affected++;
            const tags =
              action === "add-tag"
                ? Array.from(new Set([...r.tags, tagId]))
                : r.tags.filter((t) => t !== tagId);
            return { ...r, tags, updatedAt: now };
          }),
        `${action === "add-tag" ? "Add" : "Remove"} tag on ${ids.length} resource(s)`
      );
      return NextResponse.json({ action, affected });
    }

    const patchFor: Partial<Record<BulkAction, Record<string, unknown>>> = {
      trash: { deletedAt: now },
      restore: { deletedAt: null },
      archive: { archived: true },
      unarchive: { archived: false },
      favorite: { favorite: true },
      unfavorite: { favorite: false },
      pin: { pinned: true },
      unpin: { pinned: false },
    };

    if (action === "delete-permanent") {
      await updateDataFile(
        "resources",
        (current) => {
          const next = current.filter((r) => !idSet.has(r.id));
          affected = current.length - next.length;
          return next;
        },
        `Permanently delete ${ids.length} resource(s)`
      );
      return NextResponse.json({ action, affected });
    }

    const patch = patchFor[action];
    if (!patch) return badRequest(`Unknown action: ${action}`);

    await updateDataFile(
      "resources",
      (current) =>
        current.map((r) => {
          if (!idSet.has(r.id)) return r;
          affected++;
          return { ...r, ...patch, updatedAt: now };
        }),
      `Bulk ${action} on ${ids.length} resource(s)`
    );

    return NextResponse.json({ action, affected });
  } catch (err) {
    return toErrorResponse(err);
  }
}
