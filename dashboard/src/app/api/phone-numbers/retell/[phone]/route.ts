import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  const { phone } = await params;
  const body = await request.json();
  const res = await fetch(
    `${process.env.MODAL_BASE_URL}/admin/phone-numbers/retell/${encodeURIComponent(phone)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  const { phone } = await params;
  const res = await fetch(
    `${process.env.MODAL_BASE_URL}/admin/phone-numbers/retell/${encodeURIComponent(phone)}`,
    { method: "DELETE" }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
