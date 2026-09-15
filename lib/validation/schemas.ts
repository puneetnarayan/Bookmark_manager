import { z } from "zod";

export const idSchema = z.string().uuid();
export const isoDateSchema = z.string().datetime({ offset: true }).or(z.string().datetime());

const baseRecord = {
  id: idSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
};

export const priorityEnum = z.enum(["low", "normal", "high", "urgent"]);
export type Priority = z.infer<typeof priorityEnum>;
export const linkStatusEnum = z.enum([
  "healthy",
  "redirected",
  "warning",
  "dead",
  "unknown",
]);
export const resourceTypeEnum = z.enum([
  "website",
  "article",
  "tool",
  "document",
  "video",
  "repository",
  "other",
]);
export const shareModeEnum = z.enum(["private", "link"]);
export const roleEnum = z.enum(["owner", "editor", "viewer"]);
export const themeEnum = z.enum(["light", "dark", "system"]);
export const densityEnum = z.enum(["compact", "comfortable"]);

export const spaceSchema = z.object({
  ...baseRecord,
  name: z.string().min(1).max(200),
  icon: z.string().max(50).default("folder"),
  color: z.string().max(30).default("#6366f1"),
  order: z.number().int().default(0),
  pinned: z.boolean().default(false),
  archived: z.boolean().default(false),
  deletedAt: isoDateSchema.nullable().default(null),
  description: z.string().max(2000).optional().default(""),
  notes: z.string().max(20000).optional().default(""),
  shareMode: shareModeEnum.default("private"),
  shareId: z.string().nullable().default(null),
});
export type Space = z.infer<typeof spaceSchema>;

export const collectionSchema = z.object({
  ...baseRecord,
  spaceId: idSchema,
  name: z.string().min(1).max(200),
  icon: z.string().max(50).default("bookmark"),
  color: z.string().max(30).default("#6366f1"),
  order: z.number().int().default(0),
  pinned: z.boolean().default(false),
  favorite: z.boolean().default(false),
  archived: z.boolean().default(false),
  deletedAt: isoDateSchema.nullable().default(null),
  description: z.string().max(2000).optional().default(""),
  notes: z.string().max(20000).optional().default(""),
  shareMode: shareModeEnum.default("private"),
  shareId: z.string().nullable().default(null),
});
export type Collection = z.infer<typeof collectionSchema>;

export const resourceSchema = z.object({
  ...baseRecord,
  url: z.string().url(),
  title: z.string().max(500).default(""),
  description: z.string().max(5000).optional().default(""),
  favicon: z.string().nullable().default(null),
  thumbnail: z.string().nullable().default(null),
  collectionId: idSchema,
  spaceId: idSchema,
  tags: z.array(idSchema).default([]),
  favorite: z.boolean().default(false),
  pinned: z.boolean().default(false),
  archived: z.boolean().default(false),
  deletedAt: isoDateSchema.nullable().default(null),
  createdAtOrder: z.number().int().default(0),
  notes: z.string().max(20000).optional().default(""),
  lastOpenedAt: isoDateSchema.nullable().default(null),
  domain: z.string().nullable().default(null),
  resourceType: resourceTypeEnum.default("website"),
  httpStatus: z.number().int().nullable().default(null),
  lastCheckedAt: isoDateSchema.nullable().default(null),
  linkStatus: linkStatusEnum.default("unknown"),
  duplicateIgnored: z.array(idSchema).default([]),
});
export type Resource = z.infer<typeof resourceSchema>;

export const tagSchema = z.object({
  ...baseRecord,
  name: z.string().min(1).max(100),
  color: z.string().max(30).default("#6366f1"),
});
export type Tag = z.infer<typeof tagSchema>;

export const nextItemSchema = z.object({
  ...baseRecord,
  resourceId: idSchema.nullable().default(null),
  collectionId: idSchema.nullable().default(null),
  title: z.string().max(500),
  note: z.string().max(20000).optional().default(""),
  priority: priorityEnum.default("normal"),
  dueDate: isoDateSchema.nullable().default(null),
  completed: z.boolean().default(false),
  completedAt: isoDateSchema.nullable().default(null),
  archived: z.boolean().default(false),
  order: z.number().int().default(0),
});
export type NextItem = z.infer<typeof nextItemSchema>;

export const noteTargetEnum = z.enum(["space", "collection", "resource", "next"]);
export const noteSchema = z.object({
  ...baseRecord,
  targetType: noteTargetEnum,
  targetId: idSchema,
  content: z.string().max(50000).default(""),
});
export type Note = z.infer<typeof noteSchema>;

export const quickLinkSchema = z.object({
  ...baseRecord,
  name: z.string().min(1).max(200),
  url: z.string().url(),
  icon: z.string().max(50).default("link"),
  color: z.string().max(30).default("#6366f1"),
  order: z.number().int().default(0),
  pinned: z.boolean().default(false),
});
export type QuickLink = z.infer<typeof quickLinkSchema>;

export const settingsSchema = z.object({
  defaultSpaceId: idSchema.nullable().default(null),
  defaultCollectionId: idSchema.nullable().default(null),
  startupView: z.string().default("dashboard"),
  dateFormat: z.string().default("MMM d, yyyy"),
  timeFormat: z.enum(["12h", "24h"]).default("12h"),
  theme: themeEnum.default("system"),
  density: densityEnum.default("comfortable"),
  linkCheckTimeoutMs: z.number().int().min(1000).max(30000).default(8000),
  linkCheckFollowRedirects: z.boolean().default(true),
  sharingDefaultMode: shareModeEnum.default("private"),
  backupRetentionCount: z.number().int().min(0).default(0),
});
export type Settings = z.infer<typeof settingsSchema>;

export const workspaceSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(200).default("My Workspace"),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});
export type Workspace = z.infer<typeof workspaceSchema>;

export const metadataSchema = z.object({
  schemaVersion: z.number().int().default(1),
  lastBackupAt: isoDateSchema.nullable().default(null),
  lastSyncAt: isoDateSchema.nullable().default(null),
});
export type Metadata = z.infer<typeof metadataSchema>;

export const spacesFileSchema = z.array(spaceSchema);
export const collectionsFileSchema = z.array(collectionSchema);
export const resourcesFileSchema = z.array(resourceSchema);
export const tagsFileSchema = z.array(tagSchema);
export const tasksFileSchema = z.array(nextItemSchema);
export const notesFileSchema = z.array(noteSchema);
export const quickLinksFileSchema = z.array(quickLinkSchema);

export type DataFileName =
  | "workspace"
  | "spaces"
  | "collections"
  | "resources"
  | "tags"
  | "tasks"
  | "notes"
  | "quick-links"
  | "settings"
  | "metadata";
