import type { Tag } from "@/types";
import { api } from "./api";

/**
 * Resolves a comma-separated tag input into tag IDs, creating any tag names
 * that don't already exist (case-insensitive match) and appending them via setTags.
 */
export async function resolveTagIds(
  input: string,
  existingTags: Tag[],
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>
): Promise<string[]> {
  const names = Array.from(
    new Set(
      input
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)
    )
  );
  if (names.length === 0) return [];

  const ids: string[] = [];
  for (const name of names) {
    const existing = existingTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    try {
      const { tag } = await api.tags.create(name);
      existingTags = [...existingTags, tag];
      setTags((prev) => [...prev, tag]);
      ids.push(tag.id);
    } catch {
      // A duplicate-name race or transient failure just skips that tag rather than failing the save.
    }
  }
  return ids;
}
