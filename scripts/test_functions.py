"""Test rápido de cada función contra las APIs reales."""

import json
import sys
import os

# Ensure project root is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import *  # noqa: F401,F403 — loads .env


def test_search_properties():
    print("\n═══ 1. BÚSQUEDA DE PROPIEDADES ═══")
    from app.services.notion_service import search_properties

    # Test: buscar departamentos en Polanco
    results = search_properties(zona="Polanco", tipo="Penthouse")
    print(f"  Filtro: zona=Polanco, tipo=Penthouse")
    print(f"  Resultados: {len(results)}")
    for p in results:
        print(f"    → {p['nombre'][:60]}... | ${p['precio']:,.0f} | {p['m2']}m²")

    # Test: buscar por presupuesto
    results2 = search_properties(presupuesto_max=6000000, operacion="Venta")
    print(f"\n  Filtro: presupuesto_max=$6M, operacion=Venta")
    print(f"  Resultados: {len(results2)}")
    for p in results2:
        print(f"    → {p['nombre'][:60]}... | ${p['precio']:,.0f}")

    return len(results) > 0 or len(results2) > 0


def test_create_lead():
    print("\n═══ 2. CREAR LEAD ═══")
    from app.services.notion_service import create_lead

    lead = create_lead(
        name="Carlos Mendoza (TEST)",
        phone="+5215512345678",
        email="carlos.test@ejemplo.com",
        presupuesto=5000000,
        zona_interes=["Condesa", "Roma Norte"],
        tipo_buscado=["Departamento"],
        operacion_buscada="Compra",
        fuente="Llamada entrante",
        notas="Lead de prueba — se puede eliminar",
    )
    print(f"  Lead creado: {lead['id']}")
    print(f"  Nombre: {lead['nombre']}")
    return lead["id"]


def test_update_lead(lead_id: str):
    print("\n═══ 3. ACTUALIZAR LEAD ═══")
    from app.services.notion_service import update_lead

    result = update_lead(
        page_id=lead_id,
        estatus="En proceso",
        temperatura="Hot",
        siguiente_accion="Agendar visita a depa en Condesa esta semana",
    )
    print(f"  Lead actualizado: {result['id']}")
    print(f"  Campos: {result['updated_fields']}")
    return True


def test_find_lead():
    print("\n═══ 4. BUSCAR LEAD POR TELÉFONO ═══")
    from app.services.notion_service import find_lead_by_phone

    lead = find_lead_by_phone("+5215512345678")
    if lead:
        print(f"  Encontrado: {lead['nombre']}")
        print(f"  Estatus: {lead['estatus']} | Temp: {lead['temperatura']}")
    else:
        print("  No encontrado")
    return lead is not None


def test_create_call_record():
    print("\n═══ 5. REGISTRAR LLAMADA ═══")
    from app.services.notion_service import create_call_record

    record = create_call_record(
        titulo="Inbound — Carlos Mendoza (TEST)",
        tipo="Inbound",
        resultado="Contestada",
        telefono="+5215512345678",
        nombre_lead="Carlos Mendoza",
        duracion_seg=185,
        resumen="Cliente interesado en departamentos en Condesa/Roma Norte. Presupuesto de $5M. Quiere agendar visita esta semana.",
        sentimiento="Positivo",
        cita_agendada=False,
        retell_call_id="test_call_123",
    )
    print(f"  Llamada registrada: {record['id']}")
    print(f"  Título: {record['titulo']}")
    return True


def test_analyze_call():
    print("\n═══ 6. ANÁLISIS POST-LLAMADA (Claude Sonnet 4.5) ═══")
    from app.services.anthropic_service import analyze_call

    fake_transcript = """
    Sofía: Buenas tardes, gracias por llamar a Inmobiliaria Horizontes, le atiende Sofía. ¿En qué puedo ayudarle?
    Cliente: Hola Sofía, mi nombre es Roberto García. Estoy buscando un departamento en la zona de Polanco o Condesa, algo de unos 100 metros cuadrados.
    Sofía: Con gusto le ayudo, Roberto. ¿Tiene un presupuesto en mente?
    Cliente: Sí, estoy pensando en algo de entre 6 y 8 millones para compra.
    Sofía: Perfecto. Tenemos varias opciones que podrían interesarle. ¿Le gustaría agendar una visita para ver algunas propiedades esta semana?
    Cliente: Sí, me encantaría. ¿Tienen disponibilidad el jueves por la tarde?
    Sofía: Déjeme revisar... Sí, podemos agendar para el jueves a las 4 de la tarde. ¿Le parece bien?
    Cliente: Perfecto, ahí estaré.
    Sofía: Excelente, Roberto. Le confirmo su cita para el jueves a las 4pm. ¿Algo más en que pueda ayudarle?
    Cliente: No, eso es todo. Muchas gracias, Sofía.
    Sofía: Gracias a usted, Roberto. ¡Que tenga excelente tarde!
    """

    analysis = analyze_call(fake_transcript)
    print(f"  Resumen: {analysis.get('resumen', 'N/A')}")
    print(f"  Cliente: {analysis.get('nombre_cliente', 'N/A')}")
    print(f"  Temperatura: {analysis.get('temperatura', 'N/A')}")
    print(f"  Sentimiento: {analysis.get('sentimiento', 'N/A')}")
    print(f"  Presupuesto: {analysis.get('presupuesto', 'N/A')}")
    print(f"  Zonas: {analysis.get('zonas_interes', [])}")
    print(f"  Cita agendada: {analysis.get('cita_agendada', False)}")
    print(f"  Siguiente acción: {analysis.get('siguiente_accion', 'N/A')}")
    return "resumen" in analysis


if __name__ == "__main__":
    results = {}

    # Tests que tocan Notion
    results["search_properties"] = test_search_properties()

    lead_id = test_create_lead()
    results["create_lead"] = bool(lead_id)

    if lead_id:
        results["update_lead"] = test_update_lead(lead_id)

    results["find_lead"] = test_find_lead()
    results["create_call_record"] = test_create_call_record()

    # Test que toca Anthropic
    results["analyze_call"] = test_analyze_call()

    # Resumen
    print("\n═══ RESUMEN ═══")
    all_pass = True
    for name, passed in results.items():
        status = "✅" if passed else "❌"
        print(f"  {status} {name}")
        if not passed:
            all_pass = False

    print(f"\n{'Todos los tests pasaron.' if all_pass else 'Algunos tests fallaron.'}")
    sys.exit(0 if all_pass else 1)
