export interface ParsedBookmark {
  title: string;
  url: string;
  folderPath: string[];
}

/**
 * Parses a Netscape Bookmark File Format export (the format Chrome/Firefox/Edge produce)
 * into a flat list of bookmarks with their folder path, by walking <DL>/<DT> nesting.
 */
export function parseBookmarkHtml(html: string): ParsedBookmark[] {
  const results: ParsedBookmark[] = [];
  const folderStack: string[] = [];

  // Tokenize on the tags we care about, in document order.
  const tokenPattern = /<(DL|\/DL|DT)[^>]*>|<H3[^>]*>([^<]*)<\/H3>|<A\s+([^>]*)>([^<]*)<\/A>/gi;
  let match: RegExpExecArray | null;
  let pendingFolderName: string | null = null;

  while ((match = tokenPattern.exec(html)) !== null) {
    const [full, tag, h3Text, aAttrs, aText] = match;

    if (/^<DL/i.test(full)) {
      if (pendingFolderName !== null) {
        folderStack.push(pendingFolderName);
        pendingFolderName = null;
      }
      continue;
    }
    if (/^<\/DL/i.test(full)) {
      folderStack.pop();
      continue;
    }
    if (h3Text !== undefined) {
      pendingFolderName = decodeHtmlEntities(h3Text.trim());
      continue;
    }
    if (aAttrs !== undefined) {
      const hrefMatch = aAttrs.match(/href=["']([^"']*)["']/i);
      if (hrefMatch) {
        results.push({
          title: decodeHtmlEntities(aText.trim()) || hrefMatch[1],
          url: hrefMatch[1],
          folderPath: [...folderStack],
        });
      }
    }
  }

  return results;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}
