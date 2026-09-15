import "server-only";
import { updateDataFile, readDataFile } from "@/lib/data/store";
import type { DataFileName } from "@/lib/validation/schemas";
import type { GitHubConfig } from "@/lib/github/client";

interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export async function listEntities<K extends DataFileName>(name: K, config?: GitHubConfig) {
  const { data } = await readDataFile(name, config);
  return data as unknown as BaseEntity[];
}

export async function createEntity<K extends DataFileName>(
  name: K,
  entity: BaseEntity,
  message: string,
  config?: GitHubConfig
) {
  await updateDataFile(
    name,
    (current) => [...(current as unknown as BaseEntity[]), entity] as never,
    message,
    config
  );
  return entity;
}

export async function updateEntity<K extends DataFileName>(
  name: K,
  id: string,
  patch: Partial<BaseEntity>,
  message: string,
  config?: GitHubConfig
): Promise<BaseEntity | null> {
  let updated: BaseEntity | null = null;
  await updateDataFile(
    name,
    (current) => {
      const list = current as unknown as BaseEntity[];
      const next = list.map((item) => {
        if (item.id !== id) return item;
        updated = { ...item, ...patch, id: item.id, createdAt: item.createdAt, updatedAt: new Date().toISOString() };
        return updated;
      });
      return next as never;
    },
    message,
    config
  );
  return updated;
}

export async function updateManyEntities<K extends DataFileName>(
  name: K,
  ids: string[],
  patch: Partial<BaseEntity> | ((item: BaseEntity) => Partial<BaseEntity>),
  message: string,
  config?: GitHubConfig
): Promise<BaseEntity[]> {
  const idSet = new Set(ids);
  const updatedItems: BaseEntity[] = [];
  await updateDataFile(
    name,
    (current) => {
      const list = current as unknown as BaseEntity[];
      const next = list.map((item) => {
        if (!idSet.has(item.id)) return item;
        const p = typeof patch === "function" ? patch(item) : patch;
        const merged = { ...item, ...p, id: item.id, createdAt: item.createdAt, updatedAt: new Date().toISOString() };
        updatedItems.push(merged);
        return merged;
      });
      return next as never;
    },
    message,
    config
  );
  return updatedItems;
}

export async function deleteEntityHard<K extends DataFileName>(
  name: K,
  id: string,
  message: string,
  config?: GitHubConfig
): Promise<boolean> {
  let removed = false;
  await updateDataFile(
    name,
    (current) => {
      const list = current as unknown as BaseEntity[];
      const next = list.filter((item) => {
        if (item.id === id) {
          removed = true;
          return false;
        }
        return true;
      });
      return next as never;
    },
    message,
    config
  );
  return removed;
}

export async function deleteManyEntitiesHard<K extends DataFileName>(
  name: K,
  ids: string[],
  message: string,
  config?: GitHubConfig
): Promise<number> {
  const idSet = new Set(ids);
  let count = 0;
  await updateDataFile(
    name,
    (current) => {
      const list = current as unknown as BaseEntity[];
      const next = list.filter((item) => {
        if (idSet.has(item.id)) {
          count++;
          return false;
        }
        return true;
      });
      return next as never;
    },
    message,
    config
  );
  return count;
}
