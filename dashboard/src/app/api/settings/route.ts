import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/jwt";

export async function GET() {
  const email = await getSessionEmail();
  if (!email)
    return NextResponse.json(
      { status: "unauthenticated" },
      { status: 401 },
    );

  const res = await fetch(
    `${process.env.MODAL_BASE_URL}/admin/my-agent?email=${encodeURIComponent(email)}`,
    {
      headers: { "X-Sofia-User": email },
      cache: "no-store",
    },
  );
  const data = await res.json();
  if (data.status !== "ok" || !data.llm) {
    return NextResponse.json(
      { status: data.status ?? "error" },
      { status: 404 },
    );
  }
  return NextResponse.json({
    beginMessage: data.llm.begin_message ?? "",
    generalPrompt: data.llm.general_prompt ?? "",
    modelTemperature: data.llm.model_temperature ?? 0.4,
    model: data.llm.model ?? "",
  });
}

export async function PATCH(request: Request) {
  const email = await getSessionEmail();
  if (!email)
    return NextResponse.json(
      { status: "unauthenticated" },
      { status: 401 },
    );

  const body = await request.json();
  const payload: Record<string, unknown> = {};
  if (body.beginMessage !== undefined)
    payload.begin_message = body.beginMessage;
  if (body.generalPrompt !== undefined)
    payload.general_prompt = body.generalPrompt;
  if (body.modelTemperature !== undefined)
    payload.model_temperature = body.modelTemperature;

  const res = await fetch(
    `${process.env.MODAL_BASE_URL}/admin/my-agent/llm?email=${encodeURIComponent(email)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Sofia-User": email,
      },
      body: JSON.stringify(payload),
    },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
