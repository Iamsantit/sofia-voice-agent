import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/jwt";

/**
 * Returns the current user's email if their cookie is valid.
 * Resolves locally — no Modal round-trip required.
 */
export async function GET() {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ status: "anonymous" });
  }
  return NextResponse.json({ status: "ok", email });
}
