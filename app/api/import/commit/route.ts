import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { parseBookmarkHtml } from "@/lib/import/bookmarks";
import { validateJsonImport } from "@/lib/import/json-import";
import { readDataFile, writeDataFile } from "@/lib/data/store";
import { createBackup } from "@/lib/backup/backup";
import { toErrorResponse, badRequest } from "@/lib/api-utils";
import { validateAndNormalizeUrl, extractDomain } from "@/lib/urls/normalize";
import type { Space, Collection, Resource, Tag } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = body.type as "bookmark-html" | "json";
    if (type !== "bookmark-html" && type !== "json") {
      return badRequest('type must be "bookmark-html" or "json"');
    }

    await createBackup(`before importing (${type})`);

    const now = new Date().toISOString();
    const [spacesRead, collectionsRead] = await Promise.all([
      readDataFile("spaces"),
      readDataFile("collections"),
    ]);

    const newSpaces: Space[] = [];
    const newCollections: Collection[] = [];
    const newResources: Resource[] = [];
    const newTags: Tag[] = [];

    if (type === "bookmark-html") {
      if (typeof body.html !== "string") return badRequest("html is required");
      const bookmarks = parseBookmarkHtml(body.html);

      const spaceByName = new Map(spacesRead.data.map((s) => [s.name, s]));
      const collectionByKey = new Map(
        collectionsRead.data.map((c) => [`${c.spaceId}|||${c.name}`, c])
      );

      for (const bookmark of bookmarks) {
        const { valid, normalized } = validateAndNormalizeUrl(bookmark.url);
        if (!valid || !normalized) continue;

        const spaceName = bookmark.folderPath[0] || "Imported";
        let space = spaceByName.get(spaceName);
        if (!space) {
          space = {
            id: randomUUID(),
            createdAt: now,
            updatedAt: now,
            name: spaceName,
            icon: "folder",
            color: "#6366f1",
            order: 0,
            pinned: false,
            archived: false,
            deletedAt: null,
            description: "",
            notes: "",
            shareMode: "private",
            shareId: null,
          };
          spaceByName.set(spaceName, space);
          newSpaces.push(space);
        }

        const collectionName = bookmark.folderPath.slice(1).join(" / ") || "Imported";
        const collectionKey = `${space.id}|||${collectionName}`;
        let collection = collectionByKey.get(collectionKey);
        if (!collection) {
          collection = {
            id: randomUUID(),
            createdAt: now,
            updatedAt: now,
            spaceId: space.id,
            name: collectionName,
            icon: "bookmark",
            color: "#6366f1",
            order: 0,
            pinned: false,
            favorite: false,
            archived: false,
            deletedAt: null,
            description: "",
            notes: "",
            shareMode: "private",
            shareId: null,
          };
          collectionByKey.set(collectionKey, collection);
          newCollections.push(collection);
        }

        newResources.push({
          id: randomUUID(),
          createdAt: now,
          updatedAt: now,
          url: normalized,
          title: bookmark.title || normalized,
          description: "",
          favicon: null,
          thumbnail: null,
          collectionId: collection.id,
          spaceId: space.id,
          tags: [],
          favorite: false,
          pinned: false,
          archived: false,
          deletedAt: null,
          createdAtOrder: Date.now(),
          notes: "",
          lastOpenedAt: null,
          domain: extractDomain(normalized),
          resourceType: "website",
          httpStatus: null,
          lastCheckedAt: null,
          linkStatus: "unknown",
          duplicateIgnored: [],
        });
      }
    } else {
      const parsed = validateJsonImport(body.payload);
      if (!parsed.success) {
        return badRequest("Invalid export file — schema validation failed", parsed.error.issues);
      }

      // Re-issue every ID so an imported export can never collide with existing records,
      // remapping foreign keys (space/collection/tag references) to the new IDs.
      const spaceIdMap = new Map<string, string>();
      const collectionIdMap = new Map<string, string>();
      const tagIdMap = new Map<string, string>();

      for (const space of parsed.data.spaces) {
        const id = randomUUID();
        spaceIdMap.set(space.id, id);
        newSpaces.push({ ...space, id, createdAt: now, updatedAt: now, shareId: null, shareMode: "private" });
      }
      for (const collection of parsed.data.collections) {
        const id = randomUUID();
        collectionIdMap.set(collection.id, id);
        const spaceId = spaceIdMap.get(collection.spaceId);
        if (!spaceId) continue;
        newCollections.push({
          ...collection,
          id,
          spaceId,
          createdAt: now,
          updatedAt: now,
          shareId: null,
          shareMode: "private",
        });
      }
      for (const tag of parsed.data.tags) {
        const id = randomUUID();
        tagIdMap.set(tag.id, id);
        newTags.push({ ...tag, id, createdAt: now, updatedAt: now });
      }
      for (const resource of parsed.data.resources) {
        const spaceId = spaceIdMap.get(resource.spaceId);
        const collectionId = collectionIdMap.get(resource.collectionId);
        if (!spaceId || !collectionId) continue;
        newResources.push({
          ...resource,
          id: randomUUID(),
          spaceId,
          collectionId,
          tags: resource.tags.map((t) => tagIdMap.get(t)).filter((t): t is string => Boolean(t)),
          createdAt: now,
          updatedAt: now,
          duplicateIgnored: [],
        });
      }
    }

    if (newSpaces.length > 0) {
      await writeDataFile(
        "spaces",
        [...spacesRead.data, ...newSpaces],
        { message: `Import: add ${newSpaces.length} space(s)`, expectedSha: spacesRead.sha }
      );
    }
    const collectionsAfterSpaces = newSpaces.length > 0 ? await readDataFile("collections") : collectionsRead;
    if (newCollections.length > 0) {
      await writeDataFile(
        "collections",
        [...collectionsAfterSpaces.data, ...newCollections],
        { message: `Import: add ${newCollections.length} collection(s)`, expectedSha: collectionsAfterSpaces.sha }
      );
    }
    if (newTags.length > 0) {
      const tagsCurrent = await readDataFile("tags");
      await writeDataFile(
        "tags",
        [...tagsCurrent.data, ...newTags],
        { message: `Import: add ${newTags.length} tag(s)`, expectedSha: tagsCurrent.sha }
      );
    }
    if (newResources.length > 0) {
      const resourcesCurrent = await readDataFile("resources");
      await writeDataFile(
        "resources",
        [...resourcesCurrent.data, ...newResources],
        { message: `Import: add ${newResources.length} resource(s)`, expectedSha: resourcesCurrent.sha }
      );
    }

    return NextResponse.json({
      spacesAdded: newSpaces.length,
      collectionsAdded: newCollections.length,
      resourcesAdded: newResources.length,
      tagsAdded: newTags.length,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
