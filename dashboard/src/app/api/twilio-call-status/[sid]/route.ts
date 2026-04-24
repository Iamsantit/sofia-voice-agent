import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sid: string }> }
) {
  const { sid } = await params;
  const res = await fetch(
    `${process.env.MODAL_BASE_URL}/twilio-call-status/${encodeURIComponent(sid)}`,
    { cache: "no-store" }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
