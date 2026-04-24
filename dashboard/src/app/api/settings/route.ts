import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sofia_session")?.value;
  if (!token) return NextResponse.json({ status: "unauthenticated" }, { status: 401 });

  const res = await fetch(`${process.env.MODAL_BASE_URL}/admin/my-agent`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (data.status !== "ok" || !data.llm) {
    return NextResponse.json({ status: data.status ?? "error" }, { status: 404 });
  }
  return NextResponse.json({
    beginMessage: data.llm.begin_message ?? "",
    generalPrompt: data.llm.general_prompt ?? "",
    modelTemperature: data.llm.model_temperature ?? 0.4,
    model: data.llm.model ?? "",
  });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sofia_session")?.value;
  if (!token) return NextResponse.json({ status: "unauthenticated" }, { status: 401 });

  const body = await request.json();
  const payload: Record<string, unknown> = {};
  if (body.beginMessage !== undefined) payload.begin_message = body.beginMessage;
  if (body.generalPrompt !== undefined) payload.general_prompt = body.generalPrompt;
  if (body.modelTemperature !== undefined) payload.model_temperature = body.modelTemperature;

  const res = await fetch(`${process.env.MODAL_BASE_URL}/admin/my-agent/llm`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
