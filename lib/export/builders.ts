import type { Space, Collection, Resource, Tag } from "@/lib/validation/schemas";

export interface ExportScope {
  spaces: Space[];
  collections: Collection[];
  resources: Resource[];
  tags: Tag[];
}

export function buildJsonExport(scope: ExportScope): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: 1,
      spaces: scope.spaces,
      collections: scope.collections,
      resources: scope.resources,
      tags: scope.tags,
    },
    null,
    2
  );
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsvExport(scope: ExportScope): string {
  const collectionsById = new Map(scope.collections.map((c) => [c.id, c]));
  const spacesById = new Map(scope.spaces.map((s) => [s.id, s]));
  const tagsById = new Map(scope.tags.map((t) => [t.id, t]));

  const header = [
    "title",
    "url",
    "space",
    "collection",
    "tags",
    "favorite",
    "pinned",
    "archived",
    "notes",
    "createdAt",
  ];
  const rows = scope.resources.map((r) => [
    r.title,
    r.url,
    spacesById.get(r.spaceId)?.name ?? "",
    collectionsById.get(r.collectionId)?.name ?? "",
    r.tags.map((tid) => tagsById.get(tid)?.name).filter(Boolean).join("; "),
    String(r.favorite),
    String(r.pinned),
    String(r.archived),
    r.notes,
    r.createdAt,
  ]);

  return [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");
}

/** Netscape Bookmark File Format — the standard export/import format browsers use. */
export function buildBookmarkHtml(scope: ExportScope): string {
  const collectionsBySpace = new Map<string, Collection[]>();
  for (const collection of scope.collections) {
    const list = collectionsBySpace.get(collection.spaceId) ?? [];
    list.push(collection);
    collectionsBySpace.set(collection.spaceId, list);
  }
  const resourcesByCollection = new Map<string, Resource[]>();
  for (const resource of scope.resources) {
    const list = resourcesByCollection.get(resource.collectionId) ?? [];
    list.push(resource);
    resourcesByCollection.set(resource.collectionId, list);
  }

  const lines: string[] = [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>",
    "<H1>Bookmarks</H1>",
    "<DL><p>",
  ];

  for (const space of scope.spaces) {
    lines.push(`  <DT><H3>${escapeHtml(space.name)}</H3>`);
    lines.push("  <DL><p>");
    for (const collection of collectionsBySpace.get(space.id) ?? []) {
      lines.push(`    <DT><H3>${escapeHtml(collection.name)}</H3>`);
      lines.push("    <DL><p>");
      for (const resource of resourcesByCollection.get(collection.id) ?? []) {
        const addDate = Math.floor(new Date(resource.createdAt).getTime() / 1000);
        lines.push(
          `      <DT><A HREF="${escapeHtml(resource.url)}" ADD_DATE="${addDate}">${escapeHtml(
            resource.title || resource.url
          )}</A>`
        );
      }
      lines.push("    </DL><p>");
    }
    lines.push("  </DL><p>");
  }

  lines.push("</DL><p>");
  return lines.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
