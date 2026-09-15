import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse, badRequest, notFound } from "@/lib/api-utils";
import { updateDataFile } from "@/lib/data/store";
import { createBackup } from "@/lib/backup/backup";
import type { Resource } from "@/lib/validation/schemas";

const ACTIONS = ["ignore", "delete", "merge"] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action as (typeof ACTIONS)[number];
    const keepId = body.keepId as string | undefined;
    const duplicateId = body.duplicateId as string | undefined;

    if (!ACTIONS.includes(action) || !keepId || !duplicateId) {
      return badRequest("action (ignore|delete|merge), keepId and duplicateId are required");
    }

    if (action === "delete" || action === "merge") {
      await createBackup(`before resolving duplicate: ${action}`);
    }

    let notFoundFlag = false;
    await updateDataFile(
      "resources",
      (current) => {
        const keep = current.find((r) => r.id === keepId);
        const dup = current.find((r) => r.id === duplicateId);
        if (!keep || !dup) {
          notFoundFlag = true;
          return current;
        }

        if (action === "ignore") {
          return current.map((r) => {
            if (r.id === keepId) {
              return { ...r, duplicateIgnored: Array.from(new Set([...r.duplicateIgnored, duplicateId])) };
            }
            if (r.id === duplicateId) {
              return { ...r, duplicateIgnored: Array.from(new Set([...r.duplicateIgnored, keepId])) };
            }
            return r;
          });
        }

        if (action === "delete") {
          return current.map((r) =>
            r.id === duplicateId ? { ...r, deletedAt: new Date().toISOString() } : r
          );
        }

        // merge: fold duplicate's metadata into keep (fill gaps only), then trash duplicate.
        const merged: Resource = {
          ...keep,
          description: keep.description || dup.description,
          notes: keep.notes ? `${keep.notes}\n\n${dup.notes}`.trim() : dup.notes,
          tags: Array.from(new Set([...keep.tags, ...dup.tags])),
          favorite: keep.favorite || dup.favorite,
          pinned: keep.pinned || dup.pinned,
          favicon: keep.favicon || dup.favicon,
          thumbnail: keep.thumbnail || dup.thumbnail,
          updatedAt: new Date().toISOString(),
        };
        return current.map((r) => {
          if (r.id === keepId) return merged;
          if (r.id === duplicateId) return { ...r, deletedAt: new Date().toISOString() };
          return r;
        });
      },
      `Resolve duplicate (${action}): keep ${keepId}, ${action === "ignore" ? "ignore" : "trash"} ${duplicateId}`
    );

    if (notFoundFlag) return notFound("One of the resources was not found");
    return NextResponse.json({ resolved: true, action });
  } catch (err) {
    return toErrorResponse(err);
  }
}
