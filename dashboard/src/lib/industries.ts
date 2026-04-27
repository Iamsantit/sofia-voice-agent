/**
 * Static industries catalog mirrored from app/industries/__init__.py.
 *
 * Used by the registration wizard to render instantly without waiting
 * for a Modal cold start. Backend is still the source of truth for
 * prompt/voice/tools metadata — these labels are just for the picker UI.
 */

export type Industry = {
  key: string;
  label: string;
  icon: string;
  description: string;
  default_agent_name: string;
};

export const INDUSTRIES: Industry[] = [
  {
    key: "inmobiliaria",
    label: "Inmobiliaria",
    icon: "🏠",
    description:
      "Asistente que califica leads, busca propiedades y agenda visitas.",
    default_agent_name: "Sofía",
  },
  {
    key: "dental",
    label: "Clínica Dental",
    icon: "🦷",
    description:
      "Asistente que agenda citas, informa tratamientos y da seguimiento.",
    default_agent_name: "Ana",
  },
  {
    key: "gimnasio",
    label: "Gimnasio / Fitness",
    icon: "💪",
    description:
      "Asistente que vende membresías, agenda pruebas gratis y resuelve dudas.",
    default_agent_name: "Carlos",
  },
  {
    key: "restaurante",
    label: "Restaurante",
    icon: "🍽️",
    description:
      "Asistente que toma reservaciones, informa del menú y atiende eventos.",
    default_agent_name: "María",
  },
  {
    key: "clinica",
    label: "Clínica Médica",
    icon: "🏥",
    description:
      "Asistente que programa citas, canaliza por especialidad y atiende urgencias.",
    default_agent_name: "Sofía",
  },
  {
    key: "abogados",
    label: "Bufete de Abogados",
    icon: "⚖️",
    description:
      "Asistente que recoge consultas, canaliza por área y agenda asesorías.",
    default_agent_name: "Lucía",
  },
  {
    key: "salon-belleza",
    label: "Salón de Belleza / Barbería",
    icon: "💇",
    description:
      "Asistente que agenda servicios, sugiere estilistas y describe tratamientos.",
    default_agent_name: "Valeria",
  },
  {
    key: "veterinaria",
    label: "Veterinaria",
    icon: "🐾",
    description:
      "Asistente que agenda citas, atiende urgencias de mascotas y da seguimiento.",
    default_agent_name: "Luna",
  },
  {
    key: "custom",
    label: "Crea tu prompt",
    icon: "✍️",
    description: "Describe tu negocio y la IA genera el prompt a tu medida.",
    default_agent_name: "Sofía",
  },
];
