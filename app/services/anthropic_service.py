import json
import os

import anthropic


def get_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def analyze_call(transcript: str) -> dict:
    """Analiza la transcripción y retorna resumen estructurado con lead scoring.

    Returns:
        {
            "resumen": str,
            "nombre_cliente": str,
            "temperatura": "Hot" | "Warm" | "Cold",
            "sentimiento": "Positivo" | "Neutral" | "Negativo",
            "propiedad_interes": str,
            "presupuesto": float | None,
            "zonas_interes": list[str],
            "siguiente_accion": str,
            "cita_agendada": bool,
        }
    """
    client = get_client()
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1500,
        messages=[
            {
                "role": "user",
                "content": f"""Eres un analista CRM de una inmobiliaria en Ciudad de México. Analiza esta transcripción de llamada entre nuestra agente de voz "Sofía" y un cliente.

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks) con esta estructura exacta:

{{
  "resumen": "Resumen de 2-3 oraciones de la llamada",
  "nombre_cliente": "Nombre del cliente si se mencionó, o vacío",
  "temperatura": "Hot si quiere agendar/comprar ya, Warm si muestra interés activo, Cold si solo pregunta sin compromiso",
  "sentimiento": "Positivo, Neutral o Negativo",
  "propiedad_interes": "Descripción breve de lo que busca",
  "presupuesto": null o número sin formato,
  "zonas_interes": ["zona1", "zona2"],
  "siguiente_accion": "Qué hacer después con este lead",
  "cita_agendada": true o false
}}

Transcripción:
{transcript}""",
            }
        ],
    )

    raw = message.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "resumen": raw[:500],
            "nombre_cliente": "",
            "temperatura": "Warm",
            "sentimiento": "Neutral",
            "propiedad_interes": "",
            "presupuesto": None,
            "zonas_interes": [],
            "siguiente_accion": "Revisar transcripción manualmente",
            "cita_agendada": False,
        }
