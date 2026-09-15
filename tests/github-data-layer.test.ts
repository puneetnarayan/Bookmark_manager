import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GitHubConfig } from "@/lib/github/client";
import { GitHubConflictError } from "@/lib/github/client";
import { readDataFile, writeDataFile, updateDataFile, DataValidationError } from "@/lib/data/store";

const config: GitHubConfig = { owner: "test-owner", repo: "test-repo", branch: "main", token: "test-token" };

function githubContentsUrl(path: string) {
  return `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function encode(obj: unknown) {
  return Buffer.from(JSON.stringify(obj), "utf-8").toString("base64");
}

describe("readDataFile", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the default empty shape with a null sha when the file does not exist (404)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Not Found", { status: 404 }))
    );

    const result = await readDataFile("spaces", config);
    expect(result.sha).toBeNull();
    expect(result.data).toEqual([]);
  });

  it("parses and validates an existing file, returning its sha", async () => {
    const now = new Date().toISOString();
    const spaces = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        createdAt: now,
        updatedAt: now,
        name: "KDP",
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
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ content: encode(spaces), sha: "abc123" }))
    );

    const result = await readDataFile("spaces", config);
    expect(result.sha).toBe("abc123");
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe("KDP");
  });

  it("throws DataValidationError when the stored JSON fails schema validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ content: encode([{ notAValidSpace: true }]), sha: "abc123" }))
    );

    await expect(readDataFile("spaces", config)).rejects.toBeInstanceOf(DataValidationError);
  });

  it("throws DataValidationError when the stored content is not valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ content: Buffer.from("{not json", "utf-8").toString("base64"), sha: "abc123" }))
    );

    await expect(readDataFile("spaces", config)).rejects.toBeInstanceOf(DataValidationError);
  });
});

describe("writeDataFile", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the sha it was given and returns the new sha on success", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe(githubContentsUrl("data/spaces.json"));
      const body = JSON.parse(init!.body as string);
      expect(body.sha).toBe("old-sha");
      return jsonResponse({ content: { sha: "new-sha" }, commit: { sha: "commit-sha" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await writeDataFile("spaces", [], { message: "test", expectedSha: "old-sha" }, config);
    expect(result.sha).toBe("new-sha");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws GitHubConflictError on a 409 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("conflict", { status: 409 }))
    );

    await expect(
      writeDataFile("spaces", [], { message: "test", expectedSha: "stale-sha" }, config)
    ).rejects.toBeInstanceOf(GitHubConflictError);
  });

  it("refuses to write data that fails schema validation, without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // @ts-expect-error deliberately invalid shape for the test
    await expect(writeDataFile("spaces", [{ bad: true }], { message: "x", expectedSha: null }, config)).rejects.toBeInstanceOf(
      DataValidationError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("updateDataFile", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("re-reads and retries once when the first write hits a conflict", async () => {
    let readCount = 0;
    let writeCount = 0;

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (!init || init.method === undefined) {
        // GET (read)
        readCount++;
        return jsonResponse({ content: encode([]), sha: `sha-${readCount}` });
      }
      // PUT (write)
      writeCount++;
      if (writeCount === 1) {
        return new Response("conflict", { status: 409 });
      }
      return jsonResponse({ content: { sha: "final-sha" }, commit: { sha: "commit-sha" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateDataFile("spaces", (current) => current, "test update", config);
    expect(readCount).toBe(2); // initial read + re-read after conflict
    expect(writeCount).toBe(2); // failed write + successful retry
    expect(result.sha).toBe("final-sha");
  });

  it("does not silently swallow a second conflict", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (!init || init.method === undefined) {
        return jsonResponse({ content: encode([]), sha: "some-sha" });
      }
      return new Response("conflict", { status: 409 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateDataFile("spaces", (current) => current, "test", config)).rejects.toBeInstanceOf(
      GitHubConflictError
    );
  });
});
