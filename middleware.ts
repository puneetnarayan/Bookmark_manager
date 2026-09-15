import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, isAccessControlEnabled, isValidToken } from "@/lib/auth/access-token";

// Always public, regardless of access control: the read-only share view and its API,
// the login page and its submit endpoint, and Next's own static assets.
const PUBLIC_PATH_PREFIXES = ["/share/", "/api/share/", "/login", "/api/auth/login", "/_next/", "/favicon.ico"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  if (!isAccessControlEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;

  if (isValidToken(bearerToken) || isValidToken(cookieToken)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
