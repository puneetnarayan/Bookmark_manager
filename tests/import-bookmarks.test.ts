import { describe, it, expect } from "vitest";
import { parseBookmarkHtml } from "@/lib/import/bookmarks";

const SAMPLE = `
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><H3>KDP</H3>
  <DL><p>
    <DT><H3>Keyword Research</H3>
    <DL><p>
      <DT><A HREF="https://example.com/one">Example One</A>
      <DT><A HREF="https://example.com/two">Example Two</A>
    </DL><p>
    <DT><A HREF="https://example.com/top-level">Top Level Bookmark</A>
  </DL><p>
</DL><p>
`;

describe("parseBookmarkHtml", () => {
  it("extracts all bookmarks with titles and URLs", () => {
    const results = parseBookmarkHtml(SAMPLE);
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.url)).toEqual([
      "https://example.com/one",
      "https://example.com/two",
      "https://example.com/top-level",
    ]);
  });

  it("associates nested bookmarks with their full folder path", () => {
    const results = parseBookmarkHtml(SAMPLE);
    const nested = results.find((r) => r.url === "https://example.com/one")!;
    expect(nested.folderPath).toEqual(["KDP", "Keyword Research"]);
  });

  it("associates a bookmark at the space level with just that folder", () => {
    const results = parseBookmarkHtml(SAMPLE);
    const topLevel = results.find((r) => r.url === "https://example.com/top-level")!;
    expect(topLevel.folderPath).toEqual(["KDP"]);
  });

  it("decodes HTML entities in titles", () => {
    const html = `<DL><p><DT><A HREF="https://example.com">Fish &amp; Chips</A></DL><p>`;
    const results = parseBookmarkHtml(html);
    expect(results[0].title).toBe("Fish & Chips");
  });

  it("returns an empty array for content with no bookmarks", () => {
    expect(parseBookmarkHtml("<DL><p></DL><p>")).toEqual([]);
  });
});
