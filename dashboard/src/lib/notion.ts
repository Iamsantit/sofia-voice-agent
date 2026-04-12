const NOTION_API = "https://api.notion.com/v1";

function headers() {
  return {
    Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };
}

async function queryDatabase(dbId: string, filter?: object, pageSize = 100) {
  const body: Record<string, unknown> = { page_size: pageSize };
  if (filter) body.filter = filter;

  const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    next: { revalidate: 30 },
  });

  if (!res.ok) throw new Error(`Notion ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Helpers para extraer propiedades ──

function getTitle(prop: any): string {
  return prop?.title?.[0]?.text?.content ?? "";
}
function getRichText(prop: any): string {
  return prop?.rich_text?.[0]?.text?.content ?? "";
}
function getSelect(prop: any): string {
  return prop?.select?.name ?? "";
}
function getMultiSelect(prop: any): string[] {
  return prop?.multi_select?.map((o: any) => o.name) ?? [];
}
function getNumber(prop: any): number | null {
  return prop?.number ?? null;
}
function getCheckbox(prop: any): boolean {
  return prop?.checkbox ?? false;
}
function getPhone(prop: any): string {
  return prop?.phone_number ?? "";
}
function getEmail(prop: any): string {
  return prop?.email ?? "";
}
function getDate(prop: any): string {
  return prop?.date?.start ?? prop?.created_time ?? "";
}

// ── Leads ──

export async function getLeads() {
  const dbId = process.env.NOTION_LEADS_DB_ID!;
  const data = await queryDatabase(dbId);

  return data.results.map((page: any) => {
    const p = page.properties;
    return {
      id: page.id,
      nombre: getTitle(p["Nombre"]),
      telefono: getPhone(p["Teléfono"]),
      email: getEmail(p["Email"]),
      estatus: getSelect(p["Estatus"]),
      temperatura: getSelect(p["Temperatura"]),
      presupuesto: getNumber(p["Presupuesto"]),
      zonaInteres: getMultiSelect(p["Zona de interés"]),
      tipoBuscado: getMultiSelect(p["Tipo buscado"]),
      fuente: getSelect(p["Fuente"]),
      resumenIA: getRichText(p["Resumen IA"]),
      siguienteAccion: getRichText(p["Siguiente acción"]),
      intentos: getNumber(p["Intentos de contacto"]) ?? 0,
      fechaRegistro: getDate(p["Fecha registro"]),
    };
  });
}

// ── Llamadas ──

export async function getCalls() {
  const dbId = process.env.NOTION_LLAMADAS_DB_ID!;
  const data = await queryDatabase(dbId);

  return data.results.map((page: any) => {
    const p = page.properties;
    return {
      id: page.id,
      titulo: getTitle(p["Llamada"]),
      tipo: getSelect(p["Tipo"]),
      resultado: getSelect(p["Resultado"]),
      duracion: getNumber(p["Duración (seg)"]) ?? 0,
      telefono: getPhone(p["Teléfono"]),
      nombreLead: getRichText(p["Nombre Lead"]),
      resumen: getRichText(p["Resumen"]),
      sentimiento: getSelect(p["Sentimiento"]),
      citaAgendada: getCheckbox(p["Cita Agendada"]),
      retellCallId: getRichText(p["Retell Call ID"]),
      fecha: getDate(p["Fecha"]),
    };
  });
}

// ── Stats agregadas ──

export async function getStats() {
  const [leads, calls] = await Promise.all([getLeads(), getCalls()]);

  const totalCalls = calls.length;
  const contestadas = calls.filter((c: any) => c.resultado === "Contestada").length;
  const citasAgendadas = leads.filter((l: any) => l.estatus === "Cita agendada").length;
  const hot = leads.filter((l: any) => l.temperatura === "Hot").length;
  const warm = leads.filter((l: any) => l.temperatura === "Warm").length;
  const cold = leads.filter((l: any) => l.temperatura === "Cold").length;

  const avgDuration =
    contestadas > 0
      ? Math.round(
          calls
            .filter((c: any) => c.resultado === "Contestada")
            .reduce((sum: number, c: any) => sum + c.duracion, 0) / contestadas
        )
      : 0;

  const statusCounts: Record<string, number> = {};
  for (const l of leads) {
    statusCounts[l.estatus] = (statusCounts[l.estatus] || 0) + 1;
  }

  return {
    totalLeads: leads.length,
    totalCalls,
    contestadas,
    citasAgendadas,
    avgDuration,
    temperatura: { hot, warm, cold },
    statusCounts,
    tasaExito: totalCalls > 0 ? Math.round((contestadas / totalCalls) * 100) : 0,
  };
}
