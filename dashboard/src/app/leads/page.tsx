import { Shell } from "@/components/shell";
import { getLeads } from "@/lib/notion";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const tempColors: Record<string, string> = {
  Hot: "bg-red-500/20 text-red-400 border-red-500/30",
  Warm: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Cold: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const statusColors: Record<string, string> = {
  "Pendiente de llamar": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "En proceso": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Cita agendada": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "No contestado": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Sin interés": "bg-red-500/20 text-red-400 border-red-500/30",
  Cerrado: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold italic tracking-tight">
          Leads
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {leads.length} prospectos en el CRM
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-neutral-500">Nombre</TableHead>
              <TableHead className="text-neutral-500">Teléfono</TableHead>
              <TableHead className="text-neutral-500">Estatus</TableHead>
              <TableHead className="text-neutral-500">Temp.</TableHead>
              <TableHead className="text-neutral-500">Zona</TableHead>
              <TableHead className="text-neutral-500">Presupuesto</TableHead>
              <TableHead className="text-neutral-500">Intentos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead: any) => (
              <TableRow
                key={lead.id}
                className="border-white/[0.06] hover:bg-white/[0.03]"
              >
                <TableCell className="font-medium">{lead.nombre}</TableCell>
                <TableCell className="text-sm text-neutral-400 font-mono">
                  {lead.telefono}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${statusColors[lead.estatus] || ""}`}
                  >
                    {lead.estatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  {lead.temperatura && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${tempColors[lead.temperatura] || ""}`}
                    >
                      {lead.temperatura}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-neutral-400">
                  {lead.zonaInteres?.join(", ") || "—"}
                </TableCell>
                <TableCell className="text-sm text-neutral-400">
                  {lead.presupuesto
                    ? `$${lead.presupuesto.toLocaleString("es-MX")}`
                    : "—"}
                </TableCell>
                <TableCell className="text-sm text-neutral-500 text-center">
                  {lead.intentos}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Shell>
  );
}
