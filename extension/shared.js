// Shared helpers used by both options.js and popup.js.

const STORAGE_KEY = "workspaceConfig";

/** @returns {Promise<{appUrl: string, accessToken: string}>} */
function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || { appUrl: "", accessToken: "" });
    });
  });
}

function setConfig(config) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: config }, resolve);
  });
}

function normalizeAppUrl(rawUrl) {
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Origin pattern (e.g. "https://your-app.vercel.app/*") for chrome.permissions.request. */
function originPatternFor(appUrl) {
  const url = new URL(appUrl);
  return `${url.protocol}//${url.host}/*`;
}

class WorkspaceApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function apiFetch(config, path, options = {}) {
  if (!config.appUrl) {
    throw new WorkspaceApiError("Set your workspace app URL in the extension options first.", 0);
  }
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (config.accessToken) {
    headers["Authorization"] = `Bearer ${config.accessToken}`;
  }

  let res;
  try {
    res = await fetch(`${config.appUrl}${path}`, { ...options, headers });
  } catch {
    throw new WorkspaceApiError(
      "Could not reach your workspace app. Check the URL in options and that you've granted it permission.",
      0
    );
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new WorkspaceApiError(body?.error || `Request failed (${res.status})`, res.status);
  }
  return body;
}
