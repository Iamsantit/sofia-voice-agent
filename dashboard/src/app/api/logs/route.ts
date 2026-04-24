import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();

  const res = await fetch(
    `${process.env.MODAL_BASE_URL}/logs${qs ? `?${qs}` : ""}`,
    { cache: "no-store" }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}

export async function DELETE() {
  const res = await fetch(`${process.env.MODAL_BASE_URL}/logs/clear`, {
    method: "POST",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
