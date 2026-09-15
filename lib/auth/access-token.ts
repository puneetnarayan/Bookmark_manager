import "server-only";

export const SESSION_COOKIE_NAME = "workspace_session";

/** Auth is opt-in: if unset, the app behaves exactly as before (open, single-user, no gate). */
export function isAccessControlEnabled(): boolean {
  return Boolean(process.env.APP_ACCESS_TOKEN);
}

export function getConfiguredToken(): string | null {
  return process.env.APP_ACCESS_TOKEN || null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function isValidToken(candidate: string | null | undefined): boolean {
  const configured = getConfiguredToken();
  if (!configured) return true; // access control disabled
  if (!candidate) return false;
  return timingSafeEqual(candidate, configured);
}
