import os

import requests

NOTION_BASE_URL = "https://api.notion.com/v1"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {os.environ['NOTION_API_KEY']}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }


def _post(path: str, body: dict) -> dict:
    resp = requests.post(f"{NOTION_BASE_URL}{path}", headers=_headers(), json=body)
    resp.raise_for_status()
    return resp.json()


def _patch(path: str, body: dict) -> dict:
    resp = requests.patch(f"{NOTION_BASE_URL}{path}", headers=_headers(), json=body)
    resp.raise_for_status()
    return resp.json()


# ── Propiedades ──────────────────────────────────────────────

def search_properties(
    zona: str | None = None,
    presupuesto_max: float | None = None,
    recamaras_min: int | None = None,
    tipo: str | None = None,
    operacion: str | None = None,
) -> list[dict]:
    """Busca propiedades disponibles aplicando filtros opcionales."""
    db_id = os.environ["NOTION_PROPIEDADES_DB_ID"]

    filters: list[dict] = [
        {"property": "Disponible", "checkbox": {"equals": True}},
    ]
    if zona:
        filters.append({"property": "Zona", "select": {"equals": zona}})
    if presupuesto_max:
        filters.append({"property": "Precio", "number": {"less_than_or_equal_to": presupuesto_max}})
    if recamaras_min:
        filters.append({"property": "Recámaras", "number": {"greater_than_or_equal_to": recamaras_min}})
    if tipo:
        filters.append({"property": "Tipo", "select": {"equals": tipo}})
    if operacion:
        filters.append({"property": "Operación", "select": {"equals": operacion}})

    result = _post(f"/databases/{db_id}/query", {
        "filter": {"and": filters},
        "page_size": 10,
    })

    properties = []
    for page in result.get("results", []):
        props = page["properties"]
        properties.append({
            "id": page["id"],
            "nombre": _get_title(props.get("Propiedad", {})),
            "tipo": _get_select(props.get("Tipo", {})),
            "operacion": _get_select(props.get("Operación", {})),
            "precio": _get_number(props.get("Precio", {})),
            "zona": _get_select(props.get("Zona", {})),
            "recamaras": _get_number(props.get("Recámaras", {})),
            "banos": _get_number(props.get("Baños", {})),
            "m2": _get_number(props.get("m²", {})),
            "amenidades": _get_multi_select(props.get("Amenidades", {})),
            "direccion": _get_rich_text(props.get("Dirección", {})),
        })

    return properties


# ── Leads ────────────────────────────────────────────────────

def create_lead(
    name: str,
    phone: str,
    email: str = "",
    presupuesto: float | None = None,
    zona_interes: list[str] | None = None,
    tipo_buscado: list[str] | None = None,
    operacion_buscada: str | None = None,
    fuente: str = "Llamada entrante",
    notas: str = "",
) -> dict:
    """Crea un nuevo lead en Notion. Retorna id y nombre."""
    db_id = os.environ["NOTION_LEADS_DB_ID"]

    props: dict = {
        "Nombre": {"title": [{"text": {"content": name}}]},
        "Teléfono": {"phone_number": phone},
        "Estatus": {"select": {"name": "En proceso"}},
        "Temperatura": {"select": {"name": "Warm"}},
        "Fuente": {"select": {"name": fuente}},
        "Intentos de contacto": {"number": 1},
    }

    if email:
        props["Email"] = {"email": email}
    if presupuesto:
        props["Presupuesto"] = {"number": presupuesto}
    if zona_interes:
        props["Zona de interés"] = {"multi_select": [{"name": z} for z in zona_interes]}
    if tipo_buscado:
        props["Tipo buscado"] = {"multi_select": [{"name": t} for t in tipo_buscado]}
    if operacion_buscada:
        props["Operación buscada"] = {"select": {"name": operacion_buscada}}
    if notas:
        props["Notas"] = {"rich_text": [{"text": {"content": notas}}]}

    page = _post("/pages", {
        "parent": {"database_id": db_id},
        "properties": props,
    })
    return {"id": page["id"], "nombre": name}


def get_pending_leads() -> list[dict]:
    """Obtiene todos los leads con estatus 'Pendiente de llamar'."""
    db_id = os.environ["NOTION_LEADS_DB_ID"]

    result = _post(f"/databases/{db_id}/query", {
        "filter": {
            "property": "Estatus",
            "select": {"equals": "Pendiente de llamar"},
        },
        "page_size": 20,
    })

    leads = []
    for page in result.get("results", []):
        props = page["properties"]
        leads.append({
            "id": page["id"],
            "nombre": _get_title(props.get("Nombre", {})),
            "telefono": props.get("Teléfono", {}).get("phone_number", ""),
            "email": props.get("Email", {}).get("email", ""),
            "zona_interes": _get_multi_select(props.get("Zona de interés", {})),
            "tipo_buscado": _get_multi_select(props.get("Tipo buscado", {})),
            "presupuesto": _get_number(props.get("Presupuesto", {})),
            "notas": _get_rich_text(props.get("Notas", {})),
            "intentos": _get_number(props.get("Intentos de contacto", {})) or 0,
        })

    return leads


def find_lead_by_phone(phone: str) -> dict | None:
    """Busca un lead por teléfono. Retorna el primero o None."""
    db_id = os.environ["NOTION_LEADS_DB_ID"]

    result = _post(f"/databases/{db_id}/query", {
        "filter": {"property": "Teléfono", "phone_number": {"equals": phone}},
        "page_size": 1,
    })

    pages = result.get("results", [])
    if not pages:
        return None

    page = pages[0]
    props = page["properties"]
    return {
        "id": page["id"],
        "nombre": _get_title(props.get("Nombre", {})),
        "telefono": phone,
        "estatus": _get_select(props.get("Estatus", {})),
        "temperatura": _get_select(props.get("Temperatura", {})),
    }


def update_lead(
    page_id: str,
    estatus: str | None = None,
    temperatura: str | None = None,
    siguiente_accion: str | None = None,
    resumen_ia: str | None = None,
    intentos: int | None = None,
) -> dict:
    """Actualiza campos de un lead existente."""
    props: dict = {}
    if estatus:
        props["Estatus"] = {"select": {"name": estatus}}
    if temperatura:
        props["Temperatura"] = {"select": {"name": temperatura}}
    if siguiente_accion:
        props["Siguiente acción"] = {"rich_text": [{"text": {"content": siguiente_accion}}]}
    if resumen_ia:
        props["Resumen IA"] = {"rich_text": [{"text": {"content": resumen_ia[:2000]}}]}
    if intentos is not None:
        props["Intentos de contacto"] = {"number": intentos}

    _patch(f"/pages/{page_id}", {"properties": props})
    return {"id": page_id, "updated_fields": list(props.keys())}


# ── Historial de Llamadas ────────────────────────────────────

def create_call_record(
    titulo: str,
    tipo: str,
    resultado: str,
    telefono: str,
    nombre_lead: str = "",
    duracion_seg: int = 0,
    resumen: str = "",
    sentimiento: str = "Neutral",
    cita_agendada: bool = False,
    retell_call_id: str = "",
) -> dict:
    """Registra una llamada en el historial de Notion."""
    db_id = os.environ["NOTION_LLAMADAS_DB_ID"]

    props: dict = {
        "Llamada": {"title": [{"text": {"content": titulo}}]},
        "Tipo": {"select": {"name": tipo}},
        "Resultado": {"select": {"name": resultado}},
        "Teléfono": {"phone_number": telefono},
        "Sentimiento": {"select": {"name": sentimiento}},
        "Cita Agendada": {"checkbox": cita_agendada},
    }

    if nombre_lead:
        props["Nombre Lead"] = {"rich_text": [{"text": {"content": nombre_lead}}]}
    if duracion_seg:
        props["Duración (seg)"] = {"number": duracion_seg}
    if resumen:
        props["Resumen"] = {"rich_text": [{"text": {"content": resumen[:2000]}}]}
    if retell_call_id:
        props["Retell Call ID"] = {"rich_text": [{"text": {"content": retell_call_id}}]}

    page = _post("/pages", {
        "parent": {"database_id": db_id},
        "properties": props,
    })
    return {"id": page["id"], "titulo": titulo}


# ── Helpers ──────────────────────────────────────────────────

def _get_title(prop: dict) -> str:
    items = prop.get("title", [])
    return items[0]["text"]["content"] if items else ""

def _get_rich_text(prop: dict) -> str:
    items = prop.get("rich_text", [])
    return items[0]["text"]["content"] if items else ""

def _get_select(prop: dict) -> str:
    sel = prop.get("select")
    return sel["name"] if sel else ""

def _get_multi_select(prop: dict) -> list[str]:
    return [opt["name"] for opt in prop.get("multi_select", [])]

def _get_number(prop: dict) -> float | None:
    return prop.get("number")
