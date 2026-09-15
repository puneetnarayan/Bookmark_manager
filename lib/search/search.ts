import type { Space, Collection, Resource, NextItem, QuickLink, Tag } from "@/types";

export interface SearchResultItem {
  type: "space" | "collection" | "resource" | "next" | "quick-link";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export interface SearchIndexes {
  spaces: Space[];
  collections: Collection[];
  resources: Resource[];
  tasks: NextItem[];
  quickLinks: QuickLink[];
  tags: Tag[];
}

function score(haystack: string, query: string): number {
  const h = haystack.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return 0;
  if (h === q) return 100;
  if (h.startsWith(q)) return 80;
  if (h.includes(q)) return 50;
  return 0;
}

export function globalSearch(query: string, data: SearchIndexes, limit = 30): SearchResultItem[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results: Array<SearchResultItem & { score: number }> = [];
  const collectionsById = new Map(data.collections.map((c) => [c.id, c]));
  const spacesById = new Map(data.spaces.map((s) => [s.id, s]));
  const tagsById = new Map(data.tags.map((t) => [t.id, t]));

  for (const space of data.spaces) {
    if (space.deletedAt) continue;
    const s = Math.max(score(space.name, trimmed), score(space.description ?? "", trimmed) * 0.6);
    if (s > 0) {
      results.push({ type: "space", id: space.id, title: space.name, href: `/spaces/${space.id}`, score: s });
    }
  }

  for (const collection of data.collections) {
    if (collection.deletedAt) continue;
    const s = Math.max(
      score(collection.name, trimmed),
      score(collection.description ?? "", trimmed) * 0.6,
      score(collection.notes ?? "", trimmed) * 0.4
    );
    if (s > 0) {
      results.push({
        type: "collection",
        id: collection.id,
        title: collection.name,
        subtitle: spacesById.get(collection.spaceId)?.name,
        href: `/collections/${collection.id}`,
        score: s,
      });
    }
  }

  for (const resource of data.resources) {
    if (resource.deletedAt) continue;
    const tagNames = resource.tags.map((tid) => tagsById.get(tid)?.name ?? "").join(" ");
    const s = Math.max(
      score(resource.title, trimmed),
      score(resource.url, trimmed) * 0.7,
      score(resource.description ?? "", trimmed) * 0.5,
      score(resource.notes ?? "", trimmed) * 0.4,
      score(tagNames, trimmed) * 0.6
    );
    if (s > 0) {
      results.push({
        type: "resource",
        id: resource.id,
        title: resource.title || resource.url,
        subtitle: collectionsById.get(resource.collectionId)?.name,
        href: `/collections/${resource.collectionId}?highlight=${resource.id}`,
        score: s,
      });
    }
  }

  for (const task of data.tasks) {
    const s = Math.max(score(task.title, trimmed), score(task.note ?? "", trimmed) * 0.5);
    if (s > 0) {
      results.push({ type: "next", id: task.id, title: task.title, href: `/next`, score: s });
    }
  }

  for (const link of data.quickLinks) {
    const s = Math.max(score(link.name, trimmed), score(link.url, trimmed) * 0.6);
    if (s > 0) {
      results.push({ type: "quick-link", id: link.id, title: link.name, subtitle: link.url, href: `/quick-links`, score: s });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
