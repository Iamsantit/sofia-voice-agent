import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/jwt";

export const maxDuration = 60;

export async function POST() {
  const email = await getSessionEmail();
  if (!email)
    return NextResponse.json({ status: "unauthenticated" }, { status: 401 });
  const res = await fetch(`${process.env.MODAL_BASE_URL}/admin/kyc/analyze`, {
    method: "POST",
    headers: { "X-Sofia-User": email },
    signal: AbortSignal.timeout(55_000),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
