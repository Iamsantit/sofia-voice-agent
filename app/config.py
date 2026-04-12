import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env for local development
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

# --- Retell AI ---
RETELL_API_KEY = os.environ.get("RETELL_API_KEY", "")
RETELL_OUTBOUND_AGENT_ID = os.environ.get("RETELL_OUTBOUND_AGENT_ID", "")

# --- Twilio ---
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")

# --- Notion ---
NOTION_API_KEY = os.environ.get("NOTION_API_KEY", "")
NOTION_PROPIEDADES_DB_ID = os.environ.get("NOTION_PROPIEDADES_DB_ID", "")
NOTION_LEADS_DB_ID = os.environ.get("NOTION_LEADS_DB_ID", "")
NOTION_LLAMADAS_DB_ID = os.environ.get("NOTION_LLAMADAS_DB_ID", "")
NOTION_PROPIEDADES_DS_ID = os.environ.get("NOTION_PROPIEDADES_DS_ID", "")
NOTION_LEADS_DS_ID = os.environ.get("NOTION_LEADS_DS_ID", "")
NOTION_LLAMADAS_DS_ID = os.environ.get("NOTION_LLAMADAS_DS_ID", "")

# --- Cal.com ---
CAL_API_KEY = os.environ.get("CAL_API_KEY", "")

# --- Anthropic ---
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
