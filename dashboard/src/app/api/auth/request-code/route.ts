import { NextResponse } from "next/server";

// Request-code calls Modal which calls Resend. On cold start this can
// approach the 10s Vercel default — bump to 30s for safety.
export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const res = await fetch(`${process.env.MODAL_BASE_URL}/auth/request-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        message:
          e instanceof Error
            ? `No se pudo enviar el código: ${e.message}`
            : "Error de red",
      },
      { status: 504 },
    );
  }
}
