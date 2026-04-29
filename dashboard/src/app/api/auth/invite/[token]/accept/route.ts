import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const res = await fetch(
    `${process.env.MODAL_BASE_URL}/auth/invite/${encodeURIComponent(token)}/accept`,
    { method: "POST" },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
