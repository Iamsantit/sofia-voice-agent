import { NextResponse } from "next/server";

export async function POST() {
  const res = await fetch(
    `${process.env.MODAL_BASE_URL}/trigger-outbound`,
    { method: "POST", headers: { "Content-Type": "application/json" } }
  );
  const data = await res.json();
  return NextResponse.json(data);
}
