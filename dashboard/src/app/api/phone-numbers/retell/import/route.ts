import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const res = await fetch(
    `${process.env.MODAL_BASE_URL}/admin/phone-numbers/retell/import`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
