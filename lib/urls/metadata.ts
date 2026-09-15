import "server-only";

export interface UrlMetadata {
  title: string | null;
  description: string | null;
  favicon: string | null;
  image: string | null;
}

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

function isPrivateHostname(hostname: string): boolean {
  return PRIVATE_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname));
}

const MAX_BYTES = 500_000;
const FETCH_TIMEOUT_MS = 5000;

/**
 * Best-effort page metadata fetch. Never throws for network/parse failures —
 * callers should treat a null-filled result as "unavailable" and still save the
 * resource, per spec: saving must never depend on metadata retrieval succeeding.
 */
export async function fetchUrlMetadata(rawUrl: string): Promise<UrlMetadata> {
  const empty: UrlMetadata = { title: null, description: null, favicon: null, image: null };

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return empty;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return empty;
  if (isPrivateHostname(url.hostname)) return empty;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WorkspaceBot/1.0; +https://example.invalid/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return empty;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return empty;

    const reader = res.body?.getReader();
    if (!reader) return empty;
    let received = 0;
    let html = "";
    const decoder = new TextDecoder();
    while (received < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel().catch(() => undefined);

    return parseHtmlMetadata(html, url);
  } catch {
    clearTimeout(timeout);
    return empty;
  }
}

function parseHtmlMetadata(html: string, baseUrl: URL): UrlMetadata {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const ogTitle = matchMetaContent(html, "og:title");
  const ogDescription = matchMetaContent(html, "og:description");
  const description = ogDescription || matchMetaContent(html, "description");
  const ogImage = matchMetaContent(html, "og:image");
  const iconHref = matchIconHref(html);

  const title = decodeHtmlEntities((ogTitle || titleMatch?.[1] || "").trim()) || null;
  const desc = decodeHtmlEntities((description || "").trim()) || null;
  const image = ogImage ? resolveUrl(ogImage, baseUrl) : null;
  const favicon = iconHref ? resolveUrl(iconHref, baseUrl) : resolveUrl("/favicon.ico", baseUrl);

  return { title, description: desc, favicon, image };
}

function matchMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escapeRegex(property)}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escapeRegex(property)}["']`,
      "i"
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function matchIconHref(html: string): string | null {
  const pattern = /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']*)["']/i;
  const match = html.match(pattern);
  return match ? match[1] : null;
}

function resolveUrl(href: string, base: URL): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}
