import { describe, it, expect } from "vitest";
import { buildJsonExport, buildCsvExport, buildBookmarkHtml } from "@/lib/export/builders";
import { makeResource, makeSpace, makeCollection, makeTag } from "./factories";

describe("export builders", () => {
  const space = makeSpace({ name: "KDP" });
  const collection = makeCollection({ name: "Research", spaceId: space.id });
  const tag = makeTag({ name: "important" });
  const resource = makeResource({
    title: "A great resource",
    url: "https://example.com/",
    spaceId: space.id,
    collectionId: collection.id,
    tags: [tag.id],
  });
  const scope = { spaces: [space], collections: [collection], resources: [resource], tags: [tag] };

  it("buildJsonExport round-trips through JSON.parse", () => {
    const json = buildJsonExport(scope);
    const parsed = JSON.parse(json);
    expect(parsed.spaces).toHaveLength(1);
    expect(parsed.resources[0].url).toBe("https://example.com/");
  });

  it("buildCsvExport includes header and resolves space/collection/tag names", () => {
    const csv = buildCsvExport(scope);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("title");
    expect(lines[1]).toContain("A great resource");
    expect(lines[1]).toContain("KDP");
    expect(lines[1]).toContain("Research");
    expect(lines[1]).toContain("important");
  });

  it("escapes commas and quotes in CSV fields", () => {
    const withComma = makeResource({ title: 'Title, with "quotes"', spaceId: space.id, collectionId: collection.id });
    const csv = buildCsvExport({ ...scope, resources: [withComma] });
    expect(csv).toContain('"Title, with ""quotes"""');
  });

  it("buildBookmarkHtml nests resources under space and collection headings", () => {
    const html = buildBookmarkHtml(scope);
    expect(html).toContain("NETSCAPE-Bookmark-file-1");
    expect(html).toContain("KDP");
    expect(html).toContain("Research");
    expect(html).toContain('HREF="https://example.com/"');
  });

  it("escapes HTML in bookmark export", () => {
    const dangerous = makeResource({ title: '<script>alert(1)</script>', spaceId: space.id, collectionId: collection.id });
    const html = buildBookmarkHtml({ ...scope, resources: [dangerous] });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
