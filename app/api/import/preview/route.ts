import { NextRequest, NextResponse } from "next/server";
import { parseBookmarkHtml } from "@/lib/import/bookmarks";
import { validateJsonImport } from "@/lib/import/json-import";
import { listEntities } from "@/lib/data/entity-crud";
import { normalizeUrlForComparison } from "@/lib/urls/normalize";
import { toErrorResponse, badRequest } from "@/lib/api-utils";
import type { Resource } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = body.type as "bookmark-html" | "json";
    const existingResources = (await listEntities("resources")) as unknown as Resource[];
    const existingUrls = new Set(
      existingResources.filter((r) => !r.deletedAt).map((r) => normalizeUrlForComparison(r.url))
    );

    if (type === "bookmark-html") {
      if (typeof body.html !== "string") return badRequest("html is required");
      const bookmarks = parseBookmarkHtml(body.html);

      const folderGroups = new Map<string, { space: string; collection: string; count: number; duplicates: number }>();
      for (const bookmark of bookmarks) {
        const space = bookmark.folderPath[0] || "Imported";
        const collection = bookmark.folderPath.slice(1).join(" / ") || "Imported";
        const key = `${space}|||${collection}`;
        const entry = folderGroups.get(key) ?? { space, collection, count: 0, duplicates: 0 };
        entry.count++;
        if (existingUrls.has(normalizeUrlForComparison(bookmark.url))) entry.duplicates++;
        folderGroups.set(key, entry);
      }

      return NextResponse.json({
        type,
        totalBookmarks: bookmarks.length,
        totalDuplicates: bookmarks.filter((b) => existingUrls.has(normalizeUrlForComparison(b.url))).length,
        groups: Array.from(folderGroups.values()),
      });
    }

    if (type === "json") {
      const parsed = validateJsonImport(body.payload);
      if (!parsed.success) {
        return badRequest("Invalid export file — schema validation failed", parsed.error.issues);
      }
      const duplicates = parsed.data.resources.filter((r) =>
        existingUrls.has(normalizeUrlForComparison(r.url))
      ).length;

      return NextResponse.json({
        type,
        counts: {
          spaces: parsed.data.spaces.length,
          collections: parsed.data.collections.length,
          resources: parsed.data.resources.length,
          tags: parsed.data.tags.length,
        },
        totalDuplicates: duplicates,
      });
    }

    return badRequest('type must be "bookmark-html" or "json"');
  } catch (err) {
    return toErrorResponse(err);
  }
}
