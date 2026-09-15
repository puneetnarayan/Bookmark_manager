"use client";

import type {
  Space,
  Collection,
  Resource,
  Tag,
  NextItem,
  Note,
  QuickLink,
  Settings,
  Workspace,
} from "@/types";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = body?.error || `Request failed: ${res.status}`;
    throw new ApiError(message, body?.code || "unknown", res.status, body?.details);
  }
  return body as T;
}

export interface WorkspaceReadResponse {
  workspace: Workspace;
  spaces: Space[];
  collections: Collection[];
  resources: Resource[];
  tags: Tag[];
  tasks: NextItem[];
  notes: Note[];
  quickLinks: QuickLink[];
  settings: Settings;
}

export const api = {
  readAll: () => request<WorkspaceReadResponse>("/api/github/read"),
  status: () =>
    request<{
      connected: boolean;
      owner: string;
      repo: string;
      branch: string;
      repoFullName: string;
      lastBackupAt: string | null;
      lastSyncAt: string | null;
    }>("/api/github/status"),

  spaces: {
    create: (input: Partial<Space>) =>
      request<{ space: Space }>("/api/spaces", { method: "POST", body: JSON.stringify(input) }),
    update: (id: string, patch: Partial<Space>) =>
      request<{ space: Space }>(`/api/spaces/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    trash: (id: string) => request<{ space: Space }>(`/api/spaces/${id}`, { method: "DELETE" }),
    deletePermanent: (id: string) =>
      request<{ deleted: true }>(`/api/spaces/${id}?hard=true`, { method: "DELETE" }),
  },

  collections: {
    create: (input: Partial<Collection>) =>
      request<{ collection: Collection }>("/api/collections", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, patch: Partial<Collection>) =>
      request<{ collection: Collection }>(`/api/collections/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    trash: (id: string) =>
      request<{ collection: Collection }>(`/api/collections/${id}`, { method: "DELETE" }),
    deletePermanent: (id: string) =>
      request<{ deleted: true }>(`/api/collections/${id}?hard=true`, { method: "DELETE" }),
    setSharing: (id: string, mode: "private" | "link") =>
      request<{ collection: Collection }>(`/api/collections/${id}/share`, {
        method: "POST",
        body: JSON.stringify({ mode }),
      }),
  },

  resources: {
    create: (input: Partial<Resource> & { url: string; fetchMetadata?: boolean }) =>
      request<{ resource: Resource }>("/api/resources", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, patch: Partial<Resource>) =>
      request<{ resource: Resource }>(`/api/resources/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    trash: (id: string) =>
      request<{ resource: Resource }>(`/api/resources/${id}`, { method: "DELETE" }),
    deletePermanent: (id: string) =>
      request<{ deleted: true }>(`/api/resources/${id}?hard=true`, { method: "DELETE" }),
    previewMetadata: (url: string) =>
      request<{ url: string; metadata: { title: string | null; description: string | null; favicon: string | null; image: string | null } }>(
        "/api/resources/metadata",
        { method: "POST", body: JSON.stringify({ url }) }
      ),
    bulk: (action: string, ids: string[], extra?: Record<string, unknown>) =>
      request<{ action: string; affected: number }>("/api/resources/bulk", {
        method: "POST",
        body: JSON.stringify({ action, ids, ...extra }),
      }),
    duplicates: () =>
      request<{ groups: { normalizedUrl: string; resources: Resource[] }[] }>(
        "/api/resources/duplicates"
      ),
    resolveDuplicate: (action: "ignore" | "delete" | "merge", keepId: string, duplicateId: string) =>
      request<{ resolved: true }>("/api/resources/duplicates/resolve", {
        method: "POST",
        body: JSON.stringify({ action, keepId, duplicateId }),
      }),
  },

  tags: {
    create: (name: string, color?: string) =>
      request<{ tag: Tag }>("/api/tags", { method: "POST", body: JSON.stringify({ name, color }) }),
    update: (id: string, patch: Partial<Tag>) =>
      request<{ tag: Tag }>(`/api/tags/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    remove: (id: string) => request<{ deleted: true }>(`/api/tags/${id}`, { method: "DELETE" }),
  },

  tasks: {
    create: (input: Partial<NextItem> & { title: string }) =>
      request<{ task: NextItem }>("/api/tasks", { method: "POST", body: JSON.stringify(input) }),
    update: (id: string, patch: Partial<NextItem>) =>
      request<{ task: NextItem }>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    remove: (id: string) => request<{ deleted: true }>(`/api/tasks/${id}`, { method: "DELETE" }),
  },

  quickLinks: {
    create: (input: Partial<QuickLink> & { name: string; url: string }) =>
      request<{ quickLink: QuickLink }>("/api/quick-links", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, patch: Partial<QuickLink>) =>
      request<{ quickLink: QuickLink }>(`/api/quick-links/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    remove: (id: string) => request<{ deleted: true }>(`/api/quick-links/${id}`, { method: "DELETE" }),
  },

  notes: {
    save: (targetType: Note["targetType"], targetId: string, content: string) =>
      request<{ note: Note }>("/api/notes", {
        method: "POST",
        body: JSON.stringify({ targetType, targetId, content }),
      }),
  },

  settings: {
    update: (patch: Partial<Settings>) =>
      request<{ settings: Settings }>("/api/settings", { method: "PATCH", body: JSON.stringify(patch) }),
  },

  sessions: {
    save: (input: { spaceId: string; collectionId?: string; newCollectionName?: string; urls: string[] }) =>
      request<{ collectionId: string; savedCount: number; resources: Resource[] }>(
        "/api/sessions/save",
        { method: "POST", body: JSON.stringify(input) }
      ),
  },

  validate: () => request<{ valid: true; checkedFiles: string[] }>("/api/github/validate"),

  backups: {
    list: () =>
      request<{ backups: { path: string; fileName: string; createdAt: string; reason: string }[] }>(
        "/api/github/backup"
      ),
    create: (reason?: string) =>
      request<{ backup: { path: string; fileName: string; createdAt: string; reason: string } }>(
        "/api/github/backup",
        { method: "POST", body: JSON.stringify({ reason }) }
      ),
    restore: (path: string) =>
      request<{ restoredFiles: string[] }>("/api/github/restore", {
        method: "POST",
        body: JSON.stringify({ path }),
      }),
  },

  links: {
    check: (id: string) =>
      request<{ resource: Resource; result: { httpStatus: number | null; linkStatus: string } }>(
        "/api/links/check",
        { method: "POST", body: JSON.stringify({ id }) }
      ),
    checkBatch: (ids: string[]) =>
      request<{ checked: { id: string; httpStatus: number | null; linkStatus: string }[] }>(
        "/api/links/check-batch",
        { method: "POST", body: JSON.stringify({ ids }) }
      ),
  },

  trash: {
    empty: () =>
      request<{ resourcesRemoved: number; collectionsRemoved: number; spacesRemoved: number }>(
        "/api/trash/empty",
        { method: "POST" }
      ),
  },

  importExport: {
    previewBookmarkHtml: (html: string) =>
      request<{ totalBookmarks: number; totalDuplicates: number; groups: { space: string; collection: string; count: number; duplicates: number }[] }>(
        "/api/import/preview",
        { method: "POST", body: JSON.stringify({ type: "bookmark-html", html }) }
      ),
    previewJson: (payload: unknown) =>
      request<{ counts: Record<string, number>; totalDuplicates: number }>("/api/import/preview", {
        method: "POST",
        body: JSON.stringify({ type: "json", payload }),
      }),
    commitBookmarkHtml: (html: string) =>
      request<{ spacesAdded: number; collectionsAdded: number; resourcesAdded: number }>(
        "/api/import/commit",
        { method: "POST", body: JSON.stringify({ type: "bookmark-html", html }) }
      ),
    commitJson: (payload: unknown) =>
      request<{ spacesAdded: number; collectionsAdded: number; resourcesAdded: number; tagsAdded: number }>(
        "/api/import/commit",
        { method: "POST", body: JSON.stringify({ type: "json", payload }) }
      ),
    exportUrl: (format: "json" | "csv" | "html", scope: "all" | "space" | "collection" | "selection", id?: string, ids?: string[]) => {
      const params = new URLSearchParams({ format, scope });
      if (id) params.set("id", id);
      if (ids) params.set("ids", ids.join(","));
      return `/api/export?${params.toString()}`;
    },
  },
};
