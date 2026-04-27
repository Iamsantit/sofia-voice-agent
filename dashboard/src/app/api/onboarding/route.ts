import { NextResponse } from "next/server";

// Onboarding triggers Retell's create-LLM + create-Agent (two sequential
// external API calls) on top of any Modal cold-start. That can take
// 12-18s in the worst case, well past the 10s default Vercel limit.
// Bumped to 60s so the function never gets killed mid-flight.
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const res = await fetch(`${process.env.MODAL_BASE_URL}/admin/onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // 55s — leave a couple seconds for response serialization
      signal: AbortSignal.timeout(55_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        message:
          e instanceof Error
            ? `No se pudo crear el agente: ${e.message}`
            : "Error de red",
      },
      { status: 504 },
    );
  }
}
