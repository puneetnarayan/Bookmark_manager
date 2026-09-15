const TRACKING_PARAM_PREFIXES = ["utm_", "fbclid", "gclid", "mc_cid", "mc_eid", "igshid"];

export interface UrlValidationResult {
  valid: boolean;
  normalized: string | null;
  error?: string;
}

export function validateAndNormalizeUrl(input: string): UrlValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, normalized: null, error: "URL is required" };
  }

  let candidate = trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { valid: false, normalized: null, error: "Not a valid URL" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { valid: false, normalized: null, error: "Only http/https URLs are supported" };
  }

  return { valid: true, normalized: url.toString() };
}

/**
 * Normalizes a URL for duplicate comparison: lowercases host, strips default ports,
 * drops trailing slash on bare paths, removes known tracking params, and sorts the
 * remaining query params. Meaningful query params are preserved so ?id=1 vs ?id=2
 * are never treated as duplicates.
 */
export function normalizeUrlForComparison(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl.trim().toLowerCase();
  }

  url.hostname = url.hostname.toLowerCase();
  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }

  const params = new URLSearchParams(url.search);
  for (const key of Array.from(params.keys())) {
    if (TRACKING_PARAM_PREFIXES.some((prefix) => key.toLowerCase().startsWith(prefix))) {
      params.delete(key);
    }
  }
  const sortedEntries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  const sortedParams = new URLSearchParams(sortedEntries);
  url.search = sortedParams.toString();

  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  url.pathname = pathname;
  url.hash = "";

  const protocol = url.protocol === "http:" ? "https:" : url.protocol;
  return `${protocol}//${url.host}${url.pathname}${url.search ? "?" + url.search : ""}`;
}

export function extractDomain(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
