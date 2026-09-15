import { describe, it, expect } from "vitest";
import { globalSearch } from "@/lib/search/search";
import { makeResource, makeSpace, makeCollection, makeTag } from "./factories";

describe("globalSearch", () => {
  const space = makeSpace({ name: "Astrology" });
  const collection = makeCollection({ name: "Charts", spaceId: space.id });
  const tag = makeTag({ name: "reference" });
  const resource = makeResource({
    title: "Natal Chart Calculator",
    url: "https://example.com/natal",
    spaceId: space.id,
    collectionId: collection.id,
    tags: [tag.id],
  });
  const otherResource = makeResource({ title: "Unrelated Tool", url: "https://other.com" });

  const index = {
    spaces: [space],
    collections: [collection],
    resources: [resource, otherResource],
    tasks: [],
    quickLinks: [],
    tags: [tag],
  };

  it("returns nothing for an empty query", () => {
    expect(globalSearch("", index)).toEqual([]);
  });

  it("matches resources by title", () => {
    const results = globalSearch("natal", index);
    expect(results.some((r) => r.id === resource.id)).toBe(true);
  });

  it("matches resources by tag name", () => {
    const results = globalSearch("reference", index);
    expect(results.some((r) => r.id === resource.id && r.type === "resource")).toBe(true);
  });

  it("matches spaces and collections by name", () => {
    const results = globalSearch("astrology", index);
    expect(results.some((r) => r.type === "space")).toBe(true);
  });

  it("ranks exact/prefix matches above substring matches", () => {
    const results = globalSearch("Natal Chart Calculator", index);
    expect(results[0].id).toBe(resource.id);
  });

  it("does not match unrelated content", () => {
    const results = globalSearch("zzz-nonexistent", index);
    expect(results).toEqual([]);
  });
});
