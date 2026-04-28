import { Shell } from "@/components/shell";
import { getSessionEmail } from "@/lib/jwt";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

type MyAgent = {
  status: string;
  link?: {
    agent_id: string;
    llm_id: string;
    business_name: string;
    industry: string;
    agent_name: string;
    city?: string;
  };
  llm?: {
    begin_message?: string;
    general_prompt?: string;
    model_temperature?: number;
    model?: string;
  };
  agent?: {
    agent_name?: string;
  };
};

async function fetchMyAgent(): Promise<MyAgent> {
  // Decode email locally (Next.js signs the cookie with its own secret,
  // so we don't need to share JWT_SECRET with Modal). The Modal endpoint
  // accepts X-Sofia-User from this trusted proxy layer.
  const email = await getSessionEmail();
  if (!email) return { status: "unauthenticated" };

  const res = await fetch(
    `${process.env.MODAL_BASE_URL}/admin/my-agent?email=${encodeURIComponent(email)}`,
    {
      headers: { "X-Sofia-User": email },
      cache: "no-store",
    },
  );
  if (!res.ok) return { status: "error" };
  return res.json();
}

export default async function ConfiguracionPage() {
  const data = await fetchMyAgent();

  // No agent yet — user logged in but didn't complete onboarding
  if (data.status === "no_agent") {
    return (
      <Shell>
        <div className="mb-8">
          <h1 className="font-heading text-4xl font-bold italic tracking-tight">
            Configuración
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Aún no has creado tu agente.
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-6 max-w-lg">
          <p className="text-sm text-neutral-200">
            No encontré un agente asociado a tu cuenta. Necesitas completar el
            registro para generar tu agente personalizado.
          </p>
          <a
            href="/registro"
            className="inline-block mt-4 rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-black hover:bg-amber-300"
          >
            Ir al registro →
          </a>
        </div>
      </Shell>
    );
  }

  if (data.status !== "ok" || !data.llm || !data.link) {
    return (
      <Shell>
        <div className="mb-8">
          <h1 className="font-heading text-4xl font-bold italic tracking-tight">
            Configuración
          </h1>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.04] p-6 max-w-lg">
          <p className="text-sm text-red-300">
            No se pudo cargar tu agente ({data.status}).
          </p>
        </div>
      </Shell>
    );
  }

  const { link, llm, agent } = data;

  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold italic tracking-tight">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {link.agent_name} · {link.business_name}
          {link.city ? ` · ${link.city}` : ""}
        </p>
      </div>

      <SettingsForm
        initialGreeting={llm.begin_message ?? ""}
        initialPrompt={llm.general_prompt ?? ""}
        initialTemperature={llm.model_temperature ?? 0.4}
        model={llm.model ?? ""}
        agentName={agent?.agent_name ?? link.agent_name}
        businessName={link.business_name}
        industry={link.industry}
      />
    </Shell>
  );
}
