import { NextResponse } from "next/server";

const SESSION_COOKIE = "sofia_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: Request) {
  const body = await request.json();
  const res = await fetch(`${process.env.MODAL_BASE_URL}/auth/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  if (data.status === "ok" && data.token) {
    const response = NextResponse.json({ status: "ok", email: data.email });
    response.cookies.set(SESSION_COOKIE, data.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: MAX_AGE,
      path: "/",
    });
    return response;
  }

  return NextResponse.json(data, { status: 401 });
}
