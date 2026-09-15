import "server-only";
import type { z } from "zod";
import type { DataFileName } from "@/lib/validation/schemas";
import {
  spacesFileSchema,
  collectionsFileSchema,
  resourcesFileSchema,
  tagsFileSchema,
  tasksFileSchema,
  notesFileSchema,
  quickLinksFileSchema,
  settingsSchema,
  workspaceSchema,
  metadataSchema,
} from "@/lib/validation/schemas";

export const DATA_FILE_PATHS: Record<DataFileName, string> = {
  workspace: "data/workspace.json",
  spaces: "data/spaces.json",
  collections: "data/collections.json",
  resources: "data/resources.json",
  tags: "data/tags.json",
  tasks: "data/tasks.json",
  notes: "data/notes.json",
  "quick-links": "data/quick-links.json",
  settings: "data/settings.json",
  metadata: "data/metadata.json",
};

export const DATA_FILE_SCHEMAS = {
  workspace: workspaceSchema,
  spaces: spacesFileSchema,
  collections: collectionsFileSchema,
  resources: resourcesFileSchema,
  tags: tagsFileSchema,
  tasks: tasksFileSchema,
  notes: notesFileSchema,
  "quick-links": quickLinksFileSchema,
  settings: settingsSchema,
  metadata: metadataSchema,
} satisfies Record<DataFileName, z.ZodTypeAny>;

export type DataFileType<K extends DataFileName> = z.infer<(typeof DATA_FILE_SCHEMAS)[K]>;

export function defaultDataFor<K extends DataFileName>(name: K): DataFileType<K> {
  const now = new Date().toISOString();
  switch (name) {
    case "workspace":
      return {
        id: crypto.randomUUID(),
        name: "My Workspace",
        createdAt: now,
        updatedAt: now,
      } as DataFileType<K>;
    case "settings":
      return DATA_FILE_SCHEMAS.settings.parse({}) as DataFileType<K>;
    case "metadata":
      return DATA_FILE_SCHEMAS.metadata.parse({}) as DataFileType<K>;
    default:
      return [] as DataFileType<K>;
  }
}
