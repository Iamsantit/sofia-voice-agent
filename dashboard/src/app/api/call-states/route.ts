import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit") ?? "50";
  const res = await fetch(
    `${process.env.MODAL_BASE_URL}/call-states?limit=${encodeURIComponent(limit)}`,
    { cache: "no-store" },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
