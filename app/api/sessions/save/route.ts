import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { updateDataFile, readDataFile } from "@/lib/data/store";
import { toErrorResponse, badRequest } from "@/lib/api-utils";
import { validateAndNormalizeUrl, extractDomain } from "@/lib/urls/normalize";
import type { Resource, Collection } from "@/lib/validation/schemas";

interface SaveSessionBody {
  spaceId: string;
  collectionId?: string;
  newCollectionName?: string;
  urls: string[];
}

/** Saves a pasted list of URLs (a "browser session") into a new or existing collection, preserving order. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<SaveSessionBody>;
    const spaceId = body.spaceId;
    const urls = Array.isArray(body.urls) ? body.urls : [];

    if (!spaceId) return badRequest("spaceId is required");
    if (urls.length === 0) return badRequest("At least one URL is required");
    if (!body.collectionId && !body.newCollectionName) {
      return badRequest("Either collectionId or newCollectionName is required");
    }

    const normalizedUrls: string[] = [];
    for (const raw of urls) {
      const { valid, normalized } = validateAndNormalizeUrl(raw);
      if (valid && normalized) normalizedUrls.push(normalized);
    }
    if (normalizedUrls.length === 0) {
      return badRequest("None of the provided URLs were valid");
    }

    const now = new Date().toISOString();
    let collectionId = body.collectionId ?? "";

    if (!collectionId) {
      const newCollection: Collection = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        spaceId,
        name: body.newCollectionName!,
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
      await updateDataFile(
        "collections",
        (current) => [...current, newCollection],
        `Create collection from saved session: ${newCollection.name}`
      );
      collectionId = newCollection.id;
    } else {
      const { data: collections } = await readDataFile("collections");
      if (!collections.some((c) => c.id === collectionId)) {
        return badRequest("collectionId does not exist");
      }
    }

    const resources: Resource[] = normalizedUrls.map((url, index) => ({
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      url,
      title: url,
      description: "",
      favicon: null,
      thumbnail: null,
      collectionId,
      spaceId,
      tags: [],
      favorite: false,
      pinned: false,
      archived: false,
      deletedAt: null,
      createdAtOrder: Date.now() + index,
      notes: "",
      lastOpenedAt: null,
      domain: extractDomain(url),
      resourceType: "website",
      httpStatus: null,
      lastCheckedAt: null,
      linkStatus: "unknown",
      duplicateIgnored: [],
    }));

    await updateDataFile(
      "resources",
      (current) => [...current, ...resources],
      `Save session: ${resources.length} tab(s) into collection ${collectionId}`
    );

    return NextResponse.json({ collectionId, savedCount: resources.length, resources });
  } catch (err) {
    return toErrorResponse(err);
  }
}
