import { NextResponse } from "next/server";

export const maxDuration = 15;

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {}

  try {
    const res = await fetch(`${process.env.MODAL_BASE_URL}/auth/check-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    // Soft-fail: pretend email is unknown so the user can attempt registration.
    return NextResponse.json({ status: "ok", exists: false });
  }
}
