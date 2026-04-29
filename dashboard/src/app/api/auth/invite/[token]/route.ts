import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const res = await fetch(
    `${process.env.MODAL_BASE_URL}/auth/invite/${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
