import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sid: string }> }
) {
  const { sid } = await params;
  const res = await fetch(
    `${process.env.MODAL_BASE_URL}/admin/phone-numbers/twilio/${encodeURIComponent(sid)}`,
    { method: "DELETE" }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
