import { NextResponse } from "next/server";

export const maxDuration = 15;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "";

  try {
    const res = await fetch(`${process.env.MODAL_BASE_URL}/public/lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": ip,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    const data = await res.json();
    // CORS headers so the form can be embedded on any origin
    const response = NextResponse.json(data, {
      status: res.ok ? 200 : res.status,
    });
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return response;
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        message:
          e instanceof Error ? e.message : "No se pudo enviar el formulario",
      },
      {
        status: 504,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
