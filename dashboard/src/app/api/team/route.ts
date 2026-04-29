import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/jwt";

export const maxDuration = 30;

export async function GET() {
  const email = await getSessionEmail();
  const headers: Record<string, string> = {};
  if (email) headers["X-Sofia-User"] = email;

  const res = await fetch(`${process.env.MODAL_BASE_URL}/admin/team`, {
    cache: "no-store",
    headers,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}

export async function POST(request: Request) {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json(
      { status: "unauthenticated" },
      { status: 401 },
    );
  }

  const body = await request.json();
  const res = await fetch(`${process.env.MODAL_BASE_URL}/admin/team`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sofia-User": email,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
