import { describe, it, expect } from "vitest";
import { findDuplicateGroups } from "@/lib/urls/duplicates";
import { makeResource } from "./factories";

describe("findDuplicateGroups", () => {
  it("groups resources with equivalent normalized URLs", () => {
    const a = makeResource({ url: "https://example.com/page" });
    const b = makeResource({ url: "https://example.com/page/" });
    const groups = findDuplicateGroups([a, b]);
    expect(groups).toHaveLength(1);
    expect(groups[0].resources.map((r) => r.id).sort()).toEqual([a.id, b.id].sort());
  });

  it("does not group distinct URLs", () => {
    const a = makeResource({ url: "https://example.com/one" });
    const b = makeResource({ url: "https://example.com/two" });
    expect(findDuplicateGroups([a, b])).toHaveLength(0);
  });

  it("excludes trashed resources", () => {
    const a = makeResource({ url: "https://example.com/page" });
    const b = makeResource({ url: "https://example.com/page/", deletedAt: new Date().toISOString() });
    expect(findDuplicateGroups([a, b])).toHaveLength(0);
  });

  it("respects duplicateIgnored pairs", () => {
    const a = makeResource({ url: "https://example.com/page" });
    const b = makeResource({ url: "https://example.com/page/", duplicateIgnored: [] });
    // Mark them as an ignored pair in both directions.
    const aIgnoring = { ...a, duplicateIgnored: [b.id] };
    const bIgnoring = { ...b, duplicateIgnored: [a.id] };
    expect(findDuplicateGroups([aIgnoring, bIgnoring])).toHaveLength(0);
  });

  it("groups three-way duplicates together", () => {
    const urls = ["https://example.com/x", "https://example.com/x/", "https://EXAMPLE.com/x"];
    const resources = urls.map((url) => makeResource({ url }));
    const groups = findDuplicateGroups(resources);
    expect(groups).toHaveLength(1);
    expect(groups[0].resources).toHaveLength(3);
  });
});
