import { NextResponse } from "next/server";
import { signSessionToken } from "@/lib/jwt";

const SESSION_COOKIE = "sofia_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Quick sign-in:
 *  - Generates the JWT locally with the shared JWT_SECRET so the
 *    response is sub-100ms regardless of Modal cold-start.
 *  - Token format is a standard HS256 JWT compatible with the Python
 *    backend (same secret) — any future authenticated Modal endpoint
 *    can verify it without changes.
 *  - Fires a fire-and-forget signin notification to Modal for
 *    analytics, but never blocks the response on it.
 */
export async function POST(request: Request) {
  let email = "";
  try {
    const body = await request.json();
    email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
  } catch {}

  if (!email || !email.includes("@") || !email.includes(".")) {
    return NextResponse.json(
      { status: "error", message: "Email inválido" },
      { status: 400 },
    );
  }

  let token: string;
  try {
    token = signSessionToken(email, MAX_AGE);
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        message:
          e instanceof Error ? e.message : "No se pudo firmar el token",
      },
      { status: 500 },
    );
  }

  // Fire-and-forget analytics ping — never await, never surface error
  if (process.env.MODAL_BASE_URL) {
    void fetch(`${process.env.MODAL_BASE_URL}/auth/quick-signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      keepalive: true,
    }).catch(() => {});
  }

  const response = NextResponse.json({ status: "ok", email });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
  return response;
}
