import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/jwt";

export const dynamic = "force-dynamic";

export async function GET() {
  const email = await getSessionEmail();
  if (!email)
    return NextResponse.json({ status: "unauthenticated" }, { status: 401 });

  const res = await fetch(`${process.env.MODAL_BASE_URL}/admin/kyc/status`, {
    headers: { "X-Sofia-User": email },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
