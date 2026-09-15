import { normalizeUrlForComparison } from "./normalize";
import type { Resource } from "@/lib/validation/schemas";

export interface DuplicateGroup {
  normalizedUrl: string;
  resources: Resource[];
}

/** Groups active (non-trashed) resources that normalize to the same URL, excluding ignored pairs. */
export function findDuplicateGroups(resources: Resource[]): DuplicateGroup[] {
  const active = resources.filter((r) => !r.deletedAt);
  const groups = new Map<string, Resource[]>();

  for (const resource of active) {
    const key = normalizeUrlForComparison(resource.url);
    const list = groups.get(key) ?? [];
    list.push(resource);
    groups.set(key, list);
  }

  const result: DuplicateGroup[] = [];
  for (const [normalizedUrl, list] of groups) {
    if (list.length < 2) continue;
    const filtered = list.filter((resource) =>
      list.some(
        (other) =>
          other.id !== resource.id && !resource.duplicateIgnored.includes(other.id)
      )
    );
    if (filtered.length >= 2) {
      result.push({ normalizedUrl, resources: filtered });
    }
  }

  return result;
}
