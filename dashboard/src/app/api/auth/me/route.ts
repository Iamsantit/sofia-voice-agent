import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sofia_session")?.value;

  if (!token) {
    return NextResponse.json({ status: "anonymous" });
  }

  const res = await fetch(`${process.env.MODAL_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data);
}
