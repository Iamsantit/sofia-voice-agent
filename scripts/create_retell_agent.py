"""Crea el agente Sofia en Retell AI con prompt, tools y voz."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import RETELL_API_KEY

from retell import Retell

client = Retell(api_key=RETELL_API_KEY)

MODAL_BASE = "https://innovandohorizontes--sofia-voice-agent-api.modal.run"

# ── Prompt del agente ────────────────────────────────────────

SOFIA_PROMPT = """Eres Sofía, recepcionista virtual de Inmobiliaria Horizontes, una agencia de bienes raíces en Ciudad de México.

## Tu personalidad
- Profesional, amable y directa. No das rodeos innecesarios.
- Hablas español mexicano natural — usas "usted" por default pero si el cliente te tutea, tú también lo tuteas.
- Eres eficiente: tu objetivo es entender qué busca el cliente, mostrarle opciones y avanzar hacia una cita.
- Nunca inventas información sobre propiedades. Solo compartes lo que encuentras en el sistema.

## Flujo de la llamada

### 1. Identificar necesidad
Pregunta qué tipo de propiedad busca:
- ¿Compra o renta?
- ¿Qué tipo? (casa, departamento, penthouse, oficina)
- ¿Qué zona de CDMX le interesa?
- ¿Cuántas recámaras necesita?
- ¿Tiene un presupuesto en mente?

No hagas todas las preguntas de golpe. Ve una o dos a la vez, de forma conversacional.

### 2. Buscar propiedades
Cuando tengas al menos 2 criterios (zona, presupuesto, tipo, recámaras u operación), usa la herramienta search_properties para buscar opciones.

Al presentar resultados:
- Menciona máximo 3 propiedades, las más relevantes.
- Di el nombre de la propiedad, la zona, el precio, las recámaras y metros cuadrados.
- Si el precio es de renta mensual (menor a $200,000), di "pesos al mes". Si es de venta (mayor a $200,000), di "millones de pesos" o el monto completo.
- Pregunta si alguna le interesa.

### 3. Registrar como lead
Si el cliente muestra interés real en alguna propiedad o quiere más información:
- Pide su nombre completo.
- Confirma su número de teléfono (ya lo tienes del caller ID pero confírmalo).
- Pregunta si tiene correo electrónico.
- Usa create_lead para registrarlo en el sistema.
- Dile: "Perfecto, ya quedó registrado en nuestro sistema."

### 4. Agendar visita
Si quiere ver una propiedad en persona:
- Pregunta qué día y a qué hora le conviene.
- Usa book_visit para agendar la cita.
- Confirma la fecha, hora y dirección de la propiedad.

### 5. Actualizar estatus
- Si el cliente está muy interesado (quiere agendar ya, tiene presupuesto claro): usa update_lead_status con temperatura "Hot".
- Si muestra interés pero no está listo para agendar: temperatura "Warm".
- Si solo está preguntando sin compromiso: temperatura "Cold".

### 6. Despedida
- Agradece la llamada.
- Si se agendó cita, confirma los detalles.
- Si no, dile que puede volver a llamar cuando guste.
- Termina la llamada con end_call.

## Reglas importantes
- NUNCA inventes propiedades ni precios. Solo di lo que te devuelve el sistema.
- Si no hay resultados para lo que busca, dile honestamente y sugiere ampliar la búsqueda (otra zona, otro presupuesto).
- Si el cliente pregunta algo que no sabes (financiamiento, legales, etc.), dile que un asesor se comunicará con más detalles.
- Sé breve en tus respuestas. Esto es una llamada telefónica, no un correo.
- No repitas información que ya dijiste.
- Si el cliente dice que no le interesa, respeta su decisión y despídete amablemente."""

# ── Tools (funciones de Modal) ───────────────────────────────

TOOLS = [
    {
        "type": "custom",
        "name": "search_properties",
        "url": f"{MODAL_BASE}/search-properties",
        "description": "Busca propiedades disponibles en el inventario de la inmobiliaria. Usa esta herramienta cuando el cliente te diga qué tipo de propiedad busca, en qué zona, con qué presupuesto o cuántas recámaras necesita.",
        "method": "POST",
        "parameters": {
            "type": "object",
            "properties": {
                "zona": {
                    "type": "string",
                    "description": "Zona de CDMX. Opciones: Polanco, Condesa, Roma Norte, Santa Fe, Del Valle, Nápoles, Coyoacán, San Ángel, Interlomas, Lomas de Chapultepec",
                },
                "presupuesto_max": {
                    "type": "number",
                    "description": "Presupuesto máximo en pesos mexicanos",
                },
                "recamaras_min": {
                    "type": "integer",
                    "description": "Número mínimo de recámaras",
                },
                "tipo": {
                    "type": "string",
                    "description": "Tipo de propiedad. Opciones: Casa, Departamento, Penthouse, Oficina, Local Comercial, Terreno",
                },
                "operacion": {
                    "type": "string",
                    "description": "Tipo de operación. Opciones: Venta, Renta",
                },
            },
        },
        "speak_during_execution": True,
        "speak_after_execution": True,
        "execution_message_description": "Déjame buscar en nuestro sistema las opciones que tenemos disponibles.",
        "execution_message_type": "static_text",
        "timeout_ms": 15000,
    },
    {
        "type": "custom",
        "name": "create_lead",
        "url": f"{MODAL_BASE}/create-lead",
        "description": "Registra un nuevo cliente potencial en el CRM. Usa esta herramienta cuando el cliente muestre interés y te dé su información de contacto.",
        "method": "POST",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Nombre completo del cliente",
                },
                "phone": {
                    "type": "string",
                    "description": "Número de teléfono con código de país, ej: +5215512345678",
                },
                "email": {
                    "type": "string",
                    "description": "Correo electrónico del cliente",
                },
                "presupuesto": {
                    "type": "number",
                    "description": "Presupuesto del cliente en pesos",
                },
                "zona_interes": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Zonas de interés del cliente",
                },
                "tipo_buscado": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Tipos de propiedad que busca",
                },
                "operacion_buscada": {
                    "type": "string",
                    "description": "Compra, Renta o Ambas",
                },
            },
            "required": ["name", "phone"],
        },
        "speak_during_execution": True,
        "speak_after_execution": False,
        "execution_message_description": "Un momento, estoy registrando sus datos.",
        "execution_message_type": "static_text",
        "timeout_ms": 15000,
    },
    {
        "type": "custom",
        "name": "book_visit",
        "url": f"{MODAL_BASE}/book-visit",
        "description": "Agenda una visita a una propiedad. Usa esta herramienta cuando el cliente quiera ver una propiedad en persona y te dé fecha y hora.",
        "method": "POST",
        "parameters": {
            "type": "object",
            "properties": {
                "phone": {
                    "type": "string",
                    "description": "Teléfono del cliente",
                },
                "name": {
                    "type": "string",
                    "description": "Nombre del cliente",
                },
                "email": {
                    "type": "string",
                    "description": "Email del cliente",
                },
                "event_type_id": {
                    "type": "integer",
                    "description": "ID del tipo de evento en Cal.com. Usa 1 por default.",
                },
                "preferred_date": {
                    "type": "string",
                    "description": "Fecha preferida en formato YYYY-MM-DD",
                },
                "preferred_time": {
                    "type": "string",
                    "description": "Hora preferida en formato HH:MM",
                },
            },
            "required": ["name", "preferred_date", "preferred_time"],
        },
        "speak_during_execution": True,
        "speak_after_execution": True,
        "execution_message_description": "Perfecto, déjeme agendar su visita.",
        "execution_message_type": "static_text",
        "timeout_ms": 15000,
    },
    {
        "type": "custom",
        "name": "update_lead_status",
        "url": f"{MODAL_BASE}/update-lead-status",
        "description": "Actualiza el nivel de interés y estatus de un lead. Usa esta herramienta para clasificar al cliente según su nivel de interés.",
        "method": "POST",
        "parameters": {
            "type": "object",
            "properties": {
                "phone": {
                    "type": "string",
                    "description": "Teléfono del lead a actualizar",
                },
                "temperatura": {
                    "type": "string",
                    "enum": ["Hot", "Warm", "Cold"],
                    "description": "Hot: quiere comprar/rentar ya. Warm: interés activo. Cold: solo pregunta.",
                },
                "estatus": {
                    "type": "string",
                    "enum": ["Pendiente de llamar", "En proceso", "Cita agendada", "No contestado", "Sin interés", "Cerrado"],
                    "description": "Estatus actual del lead",
                },
                "siguiente_accion": {
                    "type": "string",
                    "description": "Qué hacer después con este lead",
                },
            },
            "required": ["phone"],
        },
        "speak_during_execution": False,
        "speak_after_execution": False,
        "timeout_ms": 10000,
    },
    {
        "type": "end_call",
        "name": "end_call",
        "description": "Termina la llamada. Usa esta herramienta después de despedirte del cliente.",
    },
]

# ── Crear LLM ────────────────────────────────────────────────

print("Creando Retell LLM...")
llm = client.llm.create(
    model="claude-4.5-sonnet",
    begin_message="Buenas tardes, gracias por llamar a Inmobiliaria Horizontes. Soy Sofía, ¿en qué puedo ayudarle?",
    general_prompt=SOFIA_PROMPT,
    general_tools=TOOLS,
    model_temperature=0.4,
)
print(f"  LLM creado: {llm.llm_id}")

# ── Crear Agente ─────────────────────────────────────────────

print("Creando agente Sofia...")
agent = client.agent.create(
    agent_name="Sofía — Inmobiliaria Horizontes",
    voice_id="cartesia-Sofia",
    language="es-419",
    response_engine={
        "type": "retell-llm",
        "llm_id": llm.llm_id,
    },
    webhook_url=f"{MODAL_BASE}/retell-webhook",
    webhook_events=["call_started", "call_ended", "call_analyzed"],
    timezone="America/Mexico_City",
    enable_backchannel=True,
    backchannel_words=["ajá", "claro", "sí", "entiendo", "mmhmm"],
    responsiveness=0.8,
    interruption_sensitivity=0.7,
    voice_speed=1.0,
)

print(f"  Agente creado: {agent.agent_id}")
print(f"  Nombre: Sofía — Inmobiliaria Horizontes")
print(f"  Voz: cartesia-Sofia (mexicana)")
print(f"  Idioma: es-419 (LATAM)")
print(f"  Modelo: claude-4.5-sonnet")
print(f"  Webhook: {MODAL_BASE}/retell-webhook")
print(f"\n  AGENT_ID: {agent.agent_id}")
print(f"  LLM_ID: {llm.llm_id}")
