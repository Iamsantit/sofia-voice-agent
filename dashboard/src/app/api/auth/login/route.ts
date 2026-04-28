import { NextResponse } from "next/server";
import { signSessionToken } from "@/lib/jwt";

const SESSION_COOKIE = "sofia_session";
const MAX_AGE = 60 * 60 * 24 * 30;

export const maxDuration = 30;

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {}

  try {
    const res = await fetch(`${process.env.MODAL_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
    const data = await res.json();

    if (data.status === "ok" && data.user?.email) {
      const token = signSessionToken(String(data.user.email));
      const response = NextResponse.json({ status: "ok", user: data.user });
      response.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: MAX_AGE,
        path: "/",
      });
      return response;
    }

    // Pass error code through (frontend uses it to show specific UX)
    return NextResponse.json(data, { status: 401 });
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        message:
          e instanceof Error
            ? `No se pudo iniciar sesión: ${e.message}`
            : "Error de red",
      },
      { status: 504 },
    );
  }
}
