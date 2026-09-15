import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GitHubConfig } from "@/lib/github/client";
import { createBackup, listBackups, restoreBackup } from "@/lib/backup/backup";

const config: GitHubConfig = { owner: "test-owner", repo: "test-repo", branch: "main", token: "test-token" };

function encode(obj: unknown) {
  return Buffer.from(JSON.stringify(obj), "utf-8").toString("base64");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("createBackup", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("reads every data file and commits one snapshot file, then updates metadata.lastBackupAt", async () => {
    const putCalls: { path: string; body: unknown }[] = [];

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const path = url.replace(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/`, "").split("?")[0];

      if (!init || init.method === undefined) {
        // Reading a data file: return an empty array/object depending on file.
        if (path === "data/metadata.json") {
          return jsonResponse({ content: encode({ schemaVersion: 1, lastBackupAt: null, lastSyncAt: null }), sha: "meta-sha" });
        }
        if (path === "data/workspace.json") {
          return new Response("Not Found", { status: 404 });
        }
        if (path === "data/settings.json") {
          return new Response("Not Found", { status: 404 });
        }
        return new Response("Not Found", { status: 404 });
      }

      // PUT: capture what's written.
      const body = JSON.parse(init.body as string);
      putCalls.push({ path, body: JSON.parse(Buffer.from(body.content, "base64").toString("utf-8")) });
      return jsonResponse({ content: { sha: "new-sha" }, commit: { sha: "commit-sha" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const summary = await createBackup("test reason", config);

    expect(summary.path).toMatch(/^backups\/\d{4}\/\d{4}-\d{2}-\d{2}\/backup-\d{2}-\d{2}-\d{2}\.json$/);
    expect(summary.reason).toBe("test reason");

    const backupWrite = putCalls.find((c) => c.path.startsWith("backups/"));
    expect(backupWrite).toBeDefined();
    const snapshot = backupWrite!.body as { reason: string; data: Record<string, unknown> };
    expect(snapshot.reason).toBe("test reason");
    expect(snapshot.data).toHaveProperty("spaces");
    expect(snapshot.data).toHaveProperty("resources");

    const metadataWrite = putCalls.find((c) => c.path === "data/metadata.json");
    expect(metadataWrite).toBeDefined();
    expect((metadataWrite!.body as { lastBackupAt: string | null }).lastBackupAt).not.toBeNull();
  });
});

describe("listBackups", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("walks backups/<year>/<date>/ directories and returns them newest-first", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const path = url
        .replace(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/`, "")
        .split("?")[0];

      if (path === "backups") {
        return jsonResponse([{ name: "2026", path: "backups/2026", type: "dir" }]);
      }
      if (path === "backups/2026") {
        return jsonResponse([
          { name: "2026-01-01", path: "backups/2026/2026-01-01", type: "dir" },
          { name: "2026-01-02", path: "backups/2026/2026-01-02", type: "dir" },
        ]);
      }
      if (path === "backups/2026/2026-01-01") {
        return jsonResponse([{ name: "backup-10-00-00.json", path: "backups/2026/2026-01-01/backup-10-00-00.json", type: "file" }]);
      }
      if (path === "backups/2026/2026-01-02") {
        return jsonResponse([{ name: "backup-09-00-00.json", path: "backups/2026/2026-01-02/backup-09-00-00.json", type: "file" }]);
      }
      return new Response("Not Found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const backups = await listBackups(config);
    expect(backups).toHaveLength(2);
    // Newest first: 2026-01-02 before 2026-01-01
    expect(backups[0].createdAt.startsWith("2026-01-02")).toBe(true);
    expect(backups[1].createdAt.startsWith("2026-01-01")).toBe(true);
  });
});

describe("restoreBackup", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("takes a pre-restore backup, then writes back every file present in the snapshot", async () => {
    const snapshot = {
      createdAt: new Date().toISOString(),
      reason: "manual",
      data: {
        spaces: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            name: "Restored Space",
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
          },
        ],
        collections: [],
        resources: [],
      },
    };

    const putPaths: string[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const path = url.replace(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/`, "").split("?")[0];

      if (!init || init.method === undefined) {
        if (path === "backups/2026/2026-01-01/backup-10-00-00.json") {
          return jsonResponse({ content: encode(snapshot), sha: "backup-sha" });
        }
        // All other reads (for the pre-restore backup, and current-file shas): empty/missing.
        return new Response("Not Found", { status: 404 });
      }

      putPaths.push(path);
      return jsonResponse({ content: { sha: "new-sha" }, commit: { sha: "commit-sha" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await restoreBackup("backups/2026/2026-01-01/backup-10-00-00.json", config);

    // A pre-restore safety backup must be written before anything is overwritten.
    expect(putPaths.some((p) => p.startsWith("backups/"))).toBe(true);
    // Every data key present in the snapshot gets written back.
    expect(putPaths).toContain("data/spaces.json");
    expect(result.restoredFiles).toContain("spaces");
  });

  it("throws if the backup file cannot be found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Not Found", { status: 404 }))
    );

    await expect(restoreBackup("backups/2026/2026-01-01/missing.json", config)).rejects.toThrow(/not found/i);
  });
});
