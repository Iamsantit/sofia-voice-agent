import { NextResponse } from "next/server";

export const maxDuration = 10;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  try {
    const res = await fetch(
      `${process.env.MODAL_BASE_URL}/billing/quote-custom`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8_000),
      },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    // Soft-fail with a local approximation so the slider stays interactive
    // even if Modal is cold-starting. Must match plans.py compute_custom_plan_price.
    const minutes = Math.max(200, Math.min(Number(body?.minutes ?? 1500), 10_000));
    const agents = Math.max(1, Math.min(Number(body?.agents ?? 5), 30));
    const numbers = Math.max(1, Math.min(Number(body?.numbers ?? 3), 20));
    const whatsappAgents = Math.max(0, Math.min(Number(body?.whatsapp_agents ?? 0), 20));
    const voiceClone = !!body?.voice_clone;
    const monthly =
      25 +
      minutes * 0.03 +
      agents * 3 +
      numbers * 3 +
      whatsappAgents * 4 +
      (voiceClone ? 15 : 0);
    const annualTotal = monthly * 12 * 0.8;
    return NextResponse.json({
      status: "ok",
      minutes,
      agents,
      numbers,
      whatsapp_agents: whatsappAgents,
      voice_clone: voiceClone,
      monthly_price_usd: Math.round(monthly * 100) / 100,
      annual_per_month_usd: Math.round((annualTotal / 12) * 100) / 100,
      annual_total_usd: Math.round(annualTotal * 100) / 100,
      annual_savings_usd: Math.round(monthly * 12 * 0.2 * 100) / 100,
      annual_discount_pct: 20,
      limits: {
        min_minutes: 200,
        max_minutes: 10000,
        min_agents: 1,
        max_agents: 30,
        min_numbers: 1,
        max_numbers: 20,
        min_whatsapp: 0,
        max_whatsapp: 20,
      },
    });
  }
}
