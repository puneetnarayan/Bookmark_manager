import { NextRequest, NextResponse } from "next/server";
import { listEntities } from "@/lib/data/entity-crud";
import { buildJsonExport, buildCsvExport, buildBookmarkHtml, type ExportScope } from "@/lib/export/builders";
import { toErrorResponse, badRequest } from "@/lib/api-utils";
import type { Space, Collection, Resource, Tag } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const scopeType = url.searchParams.get("scope") ?? "all";
    const scopeId = url.searchParams.get("id");
    const idsParam = url.searchParams.get("ids");

    const [spaces, collections, resources, tags] = await Promise.all([
      listEntities("spaces") as unknown as Promise<Space[]>,
      listEntities("collections") as unknown as Promise<Collection[]>,
      listEntities("resources") as unknown as Promise<Resource[]>,
      listEntities("tags") as unknown as Promise<Tag[]>,
    ]);

    let scope: ExportScope;
    if (scopeType === "space" && scopeId) {
      const scopedCollections = collections.filter((c) => c.spaceId === scopeId);
      const collectionIds = new Set(scopedCollections.map((c) => c.id));
      scope = {
        spaces: spaces.filter((s) => s.id === scopeId),
        collections: scopedCollections,
        resources: resources.filter((r) => collectionIds.has(r.collectionId)),
        tags,
      };
    } else if (scopeType === "collection" && scopeId) {
      const collection = collections.find((c) => c.id === scopeId);
      scope = {
        spaces: collection ? spaces.filter((s) => s.id === collection.spaceId) : [],
        collections: collection ? [collection] : [],
        resources: resources.filter((r) => r.collectionId === scopeId),
        tags,
      };
    } else if (scopeType === "selection" && idsParam) {
      const idSet = new Set(idsParam.split(","));
      const selectedResources = resources.filter((r) => idSet.has(r.id));
      const collectionIds = new Set(selectedResources.map((r) => r.collectionId));
      const spaceIds = new Set(selectedResources.map((r) => r.spaceId));
      scope = {
        spaces: spaces.filter((s) => spaceIds.has(s.id)),
        collections: collections.filter((c) => collectionIds.has(c.id)),
        resources: selectedResources,
        tags,
      };
    } else {
      scope = { spaces, collections, resources, tags };
    }

    if (format === "csv") {
      return new NextResponse(buildCsvExport(scope), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="export.csv"',
        },
      });
    }
    if (format === "html") {
      return new NextResponse(buildBookmarkHtml(scope), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": 'attachment; filename="bookmarks.html"',
        },
      });
    }
    if (format !== "json") {
      return badRequest("format must be json, csv, or html");
    }

    return new NextResponse(buildJsonExport(scope), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="export.json"',
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
