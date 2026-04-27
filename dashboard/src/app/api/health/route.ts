import { NextResponse } from "next/server";

/**
 * Lightweight health proxy used to pre-warm the Modal container.
 * Fires while the user is on a public page so the next real request
 * hits an already-running container.
 */
export async function GET() {
  try {
    // 2.5s soft cap — if Modal is asleep we still return fast and let the
    // background request finish warming the container on its own.
    const ctrl = AbortSignal.timeout(2500);
    const res = await fetch(`${process.env.MODAL_BASE_URL}/health`, {
      cache: "no-store",
      signal: ctrl,
    });
    const data = await res.json().catch(() => ({ status: "unknown" }));
    return NextResponse.json(data, { status: res.ok ? 200 : 200 });
  } catch {
    // Don't surface errors — this is best-effort warming
    return NextResponse.json({ status: "warming" });
  }
}
