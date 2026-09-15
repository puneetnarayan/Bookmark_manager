import { NextRequest, NextResponse } from "next/server";
import { listEntities } from "@/lib/data/entity-crud";
import { toErrorResponse, notFound } from "@/lib/api-utils";
import type { Collection, Resource, Space } from "@/lib/validation/schemas";

/**
 * Public, unauthenticated read-only endpoint for a shared collection.
 * Only returns the shared collection's own fields plus its non-trashed resources —
 * never the wider workspace, other collections, or any credentials.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  try {
    const { shareId } = await params;
    const collections = (await listEntities("collections")) as unknown as Collection[];
    const collection = collections.find((c) => c.shareId === shareId && c.shareMode === "link");
    if (!collection || collection.deletedAt || collection.archived) {
      return notFound("This shared collection is not available");
    }

    const space = ((await listEntities("spaces")) as unknown as Space[]).find(
      (s) => s.id === collection.spaceId
    );
    const resources = ((await listEntities("resources")) as unknown as Resource[]).filter(
      (r) => r.collectionId === collection.id && !r.deletedAt && !r.archived
    );

    return NextResponse.json({
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        icon: collection.icon,
        color: collection.color,
      },
      spaceName: space?.name ?? null,
      resources: resources.map((r) => ({
        id: r.id,
        url: r.url,
        title: r.title,
        description: r.description,
        favicon: r.favicon,
        domain: r.domain,
      })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
