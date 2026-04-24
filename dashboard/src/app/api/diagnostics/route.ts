import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch(`${process.env.MODAL_BASE_URL}/diagnostics`, {
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
