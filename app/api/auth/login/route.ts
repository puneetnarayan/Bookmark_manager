import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, isValidToken, isAccessControlEnabled } from "@/lib/auth/access-token";

export async function POST(request: NextRequest) {
  if (!isAccessControlEnabled()) {
    return NextResponse.json({ ok: true });
  }

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";

  if (!isValidToken(token)) {
    return NextResponse.json({ error: "Incorrect access token", code: "invalid_token" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}
