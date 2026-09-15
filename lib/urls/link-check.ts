import "server-only";

export type LinkStatus = "healthy" | "redirected" | "warning" | "dead" | "unknown";

export interface LinkCheckResult {
  httpStatus: number | null;
  linkStatus: LinkStatus;
  finalUrl: string | null;
}

/** Checks a single URL's reachability. Time-boxed and follows redirects. */
export async function checkLink(rawUrl: string, timeoutMs = 8000): Promise<LinkCheckResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { httpStatus: null, linkStatus: "unknown", finalUrl: null };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let res = await fetch(url.toString(), {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WorkspaceBot/1.0)" },
    });

    // Some servers reject HEAD; retry with GET before declaring it dead.
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url.toString(), {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WorkspaceBot/1.0)" },
      });
    }

    clearTimeout(timeout);
    const finalUrl = res.url || null;
    const redirected = finalUrl !== null && finalUrl !== url.toString();

    if (res.status >= 200 && res.status < 300) {
      return { httpStatus: res.status, linkStatus: redirected ? "redirected" : "healthy", finalUrl };
    }
    if (res.status >= 300 && res.status < 400) {
      return { httpStatus: res.status, linkStatus: "redirected", finalUrl };
    }
    if (res.status >= 400 && res.status < 500) {
      return { httpStatus: res.status, linkStatus: "dead", finalUrl };
    }
    return { httpStatus: res.status, linkStatus: "warning", finalUrl };
  } catch {
    clearTimeout(timeout);
    return { httpStatus: null, linkStatus: "dead", finalUrl: null };
  }
}
