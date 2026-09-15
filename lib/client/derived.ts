import type { Resource, NextItem, Space, Collection } from "@/types";

export function isOverdue(task: NextItem): boolean {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

export function activeResources(resources: Resource[]): Resource[] {
  return resources.filter((r) => !r.deletedAt);
}

export function activeSpaces(spaces: Space[]): Space[] {
  return spaces.filter((s) => !s.deletedAt);
}

export function activeCollections(collections: Collection[]): Collection[] {
  return collections.filter((c) => !c.deletedAt);
}

export function sortByRecent<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function sortByRecentlyOpened(items: Resource[]): Resource[] {
  return [...items]
    .filter((r) => r.lastOpenedAt)
    .sort((a, b) => new Date(b.lastOpenedAt!).getTime() - new Date(a.lastOpenedAt!).getTime());
}
