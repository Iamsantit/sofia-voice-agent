const RETELL_API = "https://api.retellai.com";

function headers() {
  return {
    Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function getAgent() {
  const res = await fetch(
    `${RETELL_API}/get-agent/${process.env.RETELL_AGENT_ID}`,
    { headers: headers(), next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`Retell ${res.status}`);
  return res.json();
}

export async function getLlm() {
  const res = await fetch(
    `${RETELL_API}/get-retell-llm/${process.env.RETELL_LLM_ID}`,
    { headers: headers(), next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`Retell ${res.status}`);
  return res.json();
}

export async function updateLlm(updates: {
  begin_message?: string;
  general_prompt?: string;
  model_temperature?: number;
}) {
  const res = await fetch(
    `${RETELL_API}/update-retell-llm/${process.env.RETELL_LLM_ID}`,
    {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(updates),
    }
  );
  if (!res.ok) throw new Error(`Retell ${res.status}: ${await res.text()}`);
  return res.json();
}
