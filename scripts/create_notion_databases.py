"""Crea las 3 bases de datos del CRM en Notion (Propiedades, Leads, Llamadas).

Uso:
    python scripts/create_notion_databases.py

Lee NOTION_API_KEY y NOTION_PARENT_PAGE_ID del .env.
Imprime los DB IDs para que los pegues en el .env.
"""

import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

API_KEY = os.environ["NOTION_API_KEY"]
PARENT_PAGE_ID = os.environ["NOTION_PARENT_PAGE_ID"]

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
}


def create_database(title: str, properties: dict) -> dict:
    body = {
        "parent": {"type": "page_id", "page_id": PARENT_PAGE_ID},
        "title": [{"type": "text", "text": {"content": title}}],
        "properties": properties,
    }
    resp = requests.post("https://api.notion.com/v1/databases", headers=HEADERS, json=body)
    if not resp.ok:
        print(f"ERROR creando '{title}': {resp.status_code} {resp.text}", file=sys.stderr)
        resp.raise_for_status()
    return resp.json()


# ── Propiedades ─────────────────────────────────────────────────────────────
propiedades_props = {
    "Propiedad": {"title": {}},
    "Tipo": {"select": {"options": [
        {"name": "Casa", "color": "blue"},
        {"name": "Departamento", "color": "purple"},
        {"name": "Terreno", "color": "green"},
        {"name": "Oficina", "color": "orange"},
        {"name": "Local", "color": "pink"},
    ]}},
    "Operación": {"select": {"options": [
        {"name": "Venta", "color": "green"},
        {"name": "Renta", "color": "yellow"},
    ]}},
    "Precio": {"number": {"format": "dollar"}},
    "Zona": {"select": {"options": [
        {"name": "Centro", "color": "gray"},
        {"name": "Norte", "color": "blue"},
        {"name": "Sur", "color": "red"},
        {"name": "Poniente", "color": "yellow"},
        {"name": "Oriente", "color": "purple"},
    ]}},
    "Recámaras": {"number": {"format": "number"}},
    "Baños": {"number": {"format": "number"}},
    "m²": {"number": {"format": "number"}},
    "Amenidades": {"multi_select": {"options": [
        {"name": "Alberca", "color": "blue"},
        {"name": "Gimnasio", "color": "red"},
        {"name": "Seguridad 24h", "color": "gray"},
        {"name": "Estacionamiento", "color": "orange"},
        {"name": "Jardín", "color": "green"},
        {"name": "Roof garden", "color": "purple"},
    ]}},
    "Dirección": {"rich_text": {}},
    "Disponible": {"checkbox": {}},
}

# ── Leads ───────────────────────────────────────────────────────────────────
leads_props = {
    "Nombre": {"title": {}},
    "Teléfono": {"phone_number": {}},
    "Email": {"email": {}},
    "Estatus": {"select": {"options": [
        {"name": "En proceso", "color": "yellow"},
        {"name": "Pendiente de llamar", "color": "orange"},
        {"name": "Contactado", "color": "blue"},
        {"name": "Cita agendada", "color": "green"},
        {"name": "No contactable", "color": "gray"},
        {"name": "Cerrado - Ganado", "color": "green"},
        {"name": "Cerrado - Perdido", "color": "red"},
    ]}},
    "Temperatura": {"select": {"options": [
        {"name": "Hot", "color": "red"},
        {"name": "Warm", "color": "orange"},
        {"name": "Cold", "color": "blue"},
    ]}},
    "Fuente": {"select": {"options": [
        {"name": "Llamada entrante", "color": "blue"},
        {"name": "Llamada saliente", "color": "purple"},
        {"name": "Formulario web", "color": "green"},
        {"name": "Facebook", "color": "pink"},
        {"name": "Referido", "color": "yellow"},
    ]}},
    "Presupuesto": {"number": {"format": "dollar"}},
    "Zona de interés": {"multi_select": {"options": [
        {"name": "Centro", "color": "gray"},
        {"name": "Norte", "color": "blue"},
        {"name": "Sur", "color": "red"},
        {"name": "Poniente", "color": "yellow"},
        {"name": "Oriente", "color": "purple"},
    ]}},
    "Tipo buscado": {"multi_select": {"options": [
        {"name": "Casa", "color": "blue"},
        {"name": "Departamento", "color": "purple"},
        {"name": "Terreno", "color": "green"},
        {"name": "Oficina", "color": "orange"},
        {"name": "Local", "color": "pink"},
    ]}},
    "Operación buscada": {"select": {"options": [
        {"name": "Venta", "color": "green"},
        {"name": "Renta", "color": "yellow"},
    ]}},
    "Notas": {"rich_text": {}},
    "Intentos de contacto": {"number": {"format": "number"}},
    "Siguiente acción": {"rich_text": {}},
    "Resumen IA": {"rich_text": {}},
}

# ── Llamadas (Historial) ────────────────────────────────────────────────────
llamadas_props = {
    "Llamada": {"title": {}},
    "Tipo": {"select": {"options": [
        {"name": "Entrante", "color": "blue"},
        {"name": "Saliente", "color": "purple"},
    ]}},
    "Resultado": {"select": {"options": [
        {"name": "Exitosa", "color": "green"},
        {"name": "Sin respuesta", "color": "gray"},
        {"name": "Buzón", "color": "yellow"},
        {"name": "Colgada", "color": "red"},
        {"name": "Cita agendada", "color": "green"},
    ]}},
    "Teléfono": {"phone_number": {}},
    "Sentimiento": {"select": {"options": [
        {"name": "Positivo", "color": "green"},
        {"name": "Neutral", "color": "gray"},
        {"name": "Negativo", "color": "red"},
    ]}},
    "Cita Agendada": {"checkbox": {}},
    "Nombre Lead": {"rich_text": {}},
    "Duración (seg)": {"number": {"format": "number"}},
    "Resumen": {"rich_text": {}},
    "Retell Call ID": {"rich_text": {}},
}


def main() -> None:
    print("Creando bases de datos en Notion...\n")

    print("[1/3] Propiedades...")
    p = create_database("Sofia - Propiedades", propiedades_props)
    prop_db_id = p["id"]
    prop_ds_id = p.get("data_sources", [{}])[0].get("id", "")
    print(f"      DB ID: {prop_db_id}")

    print("[2/3] Leads...")
    l = create_database("Sofia - Leads", leads_props)
    leads_db_id = l["id"]
    leads_ds_id = l.get("data_sources", [{}])[0].get("id", "")
    print(f"      DB ID: {leads_db_id}")

    print("[3/3] Historial de Llamadas...")
    c = create_database("Sofia - Historial de Llamadas", llamadas_props)
    calls_db_id = c["id"]
    calls_ds_id = c.get("data_sources", [{}])[0].get("id", "")
    print(f"      DB ID: {calls_db_id}")

    print("\n" + "=" * 60)
    print("PEGA ESTO EN TU .env (reemplaza las líneas vacías):")
    print("=" * 60)
    print(f"NOTION_PROPIEDADES_DB_ID={prop_db_id}")
    print(f"NOTION_LEADS_DB_ID={leads_db_id}")
    print(f"NOTION_LLAMADAS_DB_ID={calls_db_id}")
    print(f"NOTION_PROPIEDADES_DS_ID={prop_ds_id}")
    print(f"NOTION_LEADS_DS_ID={leads_ds_id}")
    print(f"NOTION_LLAMADAS_DS_ID={calls_ds_id}")


if __name__ == "__main__":
    main()
