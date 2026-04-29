import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/jwt";

export const maxDuration = 15;

export async function POST(request: Request) {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json(
      { status: "unauthenticated" },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => ({}));

  const res = await fetch(
    `${process.env.MODAL_BASE_URL}/admin/billing/change-plan`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sofia-User": email,
      },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
