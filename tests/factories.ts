import { randomUUID } from "node:crypto";
import type { Resource, Space, Collection, Tag } from "@/lib/validation/schemas";

export function makeResource(overrides: Partial<Resource> = {}): Resource {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    url: "https://example.com/",
    title: "Example",
    description: "",
    favicon: null,
    thumbnail: null,
    collectionId: randomUUID(),
    spaceId: randomUUID(),
    tags: [],
    favorite: false,
    pinned: false,
    archived: false,
    deletedAt: null,
    createdAtOrder: 0,
    notes: "",
    lastOpenedAt: null,
    domain: "example.com",
    resourceType: "website",
    httpStatus: null,
    lastCheckedAt: null,
    linkStatus: "unknown",
    duplicateIgnored: [],
    ...overrides,
  };
}

export function makeSpace(overrides: Partial<Space> = {}): Space {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    name: "Space",
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
    ...overrides,
  };
}

export function makeCollection(overrides: Partial<Collection> = {}): Collection {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    spaceId: randomUUID(),
    name: "Collection",
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
    ...overrides,
  };
}

export function makeTag(overrides: Partial<Tag> = {}): Tag {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    name: "tag",
    color: "#6366f1",
    ...overrides,
  };
}
