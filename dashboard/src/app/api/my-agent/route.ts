import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/jwt";

export async function GET() {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json(
      { status: "unauthenticated" },
      { status: 401 },
    );
  }

  const res = await fetch(
    `${process.env.MODAL_BASE_URL}/admin/my-agent?email=${encodeURIComponent(email)}`,
    {
      headers: { "X-Sofia-User": email },
      cache: "no-store",
    },
  );
  const data = await res.json();
  return NextResponse.json(data);
}
