"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Voice = {
  voice_id: string;
  voice_name: string;
  provider: string;
  gender: string;
  accent: string;
  preview_audio_url: string;
  is_custom: boolean;
};

const LANGUAGES = [
  { value: "es-419", label: "Español (Latinoamérica)" },
  { value: "es-ES", label: "Español (España)" },
  { value: "en-US", label: "Inglés (US)" },
  { value: "pt-BR", label: "Portugués (BR)" },
  { value: "fr-FR", label: "Francés" },
  { value: "it-IT", label: "Italiano" },
];

const MODELS = [
  { value: "claude-4.5-sonnet", label: "Claude 4.5 Sonnet (recomendado)" },
  { value: "claude-haiku-4.5", label: "Claude Haiku 4.5 (más rápido)" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o mini" },
];

const TIMEZONES = [
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Buenos_Aires",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
];

export function CreateAgentDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [language, setLanguage] = useState("es-419");
  const [model, setModel] = useState("claude-4.5-sonnet");
  const [timezone, setTimezone] = useState("America/Mexico_City");
  const [beginMessage, setBeginMessage] = useState(
    "Hola, gracias por llamar. ¿En qué puedo ayudarle?",
  );
  const [generalPrompt, setGeneralPrompt] = useState(
    "Eres un asistente profesional, amable y conciso. Atiende llamadas, calificas leads y agendas citas.",
  );
  const [temperature, setTemperature] = useState(0.4);

  useEffect(() => {
    let cancelled = false;
    async function loadVoices() {
      try {
        const res = await fetch("/api/voices", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data.status === "ok" && Array.isArray(data.voices)) {
          setVoices(data.voices);
          // Pre-select default Sofia voice if available
          const def =
            data.voices.find((v: Voice) =>
              v.voice_name?.toLowerCase().includes("sofia"),
            ) ?? data.voices[0];
          if (def) setVoiceId(def.voice_id);
        }
      } finally {
        if (!cancelled) setLoadingVoices(false);
      }
    }
    loadVoices();
    return () => {
      cancelled = true;
    };
  }, []);

  function playPreview(v: Voice) {
    if (!v.preview_audio_url) return;
    if (previewing === v.voice_id) {
      setPreviewing(null);
      return;
    }
    setPreviewing(v.voice_id);
    const audio = new Audio(v.preview_audio_url);
    audio.play().catch(() => {});
    audio.onended = () => setPreviewing(null);
  }

  async function generatePromptWithAI() {
    if (!businessDescription.trim()) {
      setError(
        "Describe tu negocio primero (ej. 'Inmobiliaria que vende casas en Bogotá')",
      );
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_description: businessDescription,
          agent_name: name || "Sofia",
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        if (data.general_prompt) setGeneralPrompt(data.general_prompt);
        if (data.begin_message) setBeginMessage(data.begin_message);
      } else {
        setError(data.message ?? "No se pudo generar el prompt");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error generando prompt");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre del agente es obligatorio");
      return;
    }
    if (!voiceId) {
      setError("Selecciona una voz");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          voice_id: voiceId,
          language,
          model,
          timezone,
          begin_message: beginMessage,
          general_prompt: generalPrompt,
          temperature,
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        onCreated();
      } else {
        setError(data.message ?? "No se pudo crear el agente");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl my-8 rounded-2xl border border-white/[0.08] bg-neutral-950 shadow-2xl"
      >
        <div className="flex items-start justify-between p-6 border-b border-white/[0.06]">
          <div>
            <h2 className="font-heading text-2xl font-bold italic">
              Nuevo agente
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Configura voz, idioma y personalidad. Puedes editarlo después.
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="border-white/[0.1] text-neutral-400 h-7"
          >
            ✕
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nombre */}
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">
              Nombre del agente *
            </Label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sofia, María, Andrés…"
              required
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
            />
          </div>

          {/* Voz */}
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">Voz *</Label>
            {loadingVoices ? (
              <div className="rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-3 text-xs text-neutral-500">
                Cargando voces…
              </div>
            ) : voices.length === 0 ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.04] px-3 py-2 text-xs text-amber-300">
                No se cargaron voces. Verifica RETELL_API_KEY.
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto rounded-md border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.04]">
                {voices.slice(0, 20).map((v) => (
                  <label
                    key={v.voice_id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition ${
                      voiceId === v.voice_id
                        ? "bg-amber-400/[0.06]"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="voice"
                      checked={voiceId === v.voice_id}
                      onChange={() => setVoiceId(v.voice_id)}
                      className="accent-amber-400"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-100">
                        {v.voice_name}
                      </p>
                      <p className="text-[10px] text-neutral-500 font-mono">
                        {v.provider} · {v.gender || "—"} · {v.accent || "neutro"}
                      </p>
                    </div>
                    {v.preview_audio_url && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          playPreview(v);
                        }}
                        className="text-[11px] text-amber-400 hover:text-amber-300"
                      >
                        {previewing === v.voice_id ? "■" : "▶"} Preview
                      </button>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Idioma + Modelo */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">Idioma</Label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value} className="bg-neutral-900">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">Modelo IA</Label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value} className="bg-neutral-900">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">Zona horaria</Label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz} className="bg-neutral-900">
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {/* AI prompt generator */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4">
            <p className="text-xs font-medium text-amber-300 mb-2">
              ✨ Generar personalidad con IA
            </p>
            <p className="text-[11px] text-neutral-400 mb-2">
              Describe tu negocio y Claude redacta el prompt y mensaje inicial
              automáticamente.
            </p>
            <div className="flex gap-2">
              <input
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder="Ej. Clínica dental en CDMX, agendamos citas"
                className="flex-1 rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-xs outline-none focus:border-amber-400/50"
              />
              <Button
                type="button"
                onClick={generatePromptWithAI}
                disabled={generating || !businessDescription.trim()}
                className="bg-amber-400/20 border border-amber-400/40 text-amber-300 hover:bg-amber-400/30 text-xs h-9"
              >
                {generating ? "Generando…" : "Generar"}
              </Button>
            </div>
          </div>

          {/* Mensaje inicial */}
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">
              Mensaje al contestar
            </Label>
            <input
              value={beginMessage}
              onChange={(e) => setBeginMessage(e.target.value)}
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
            />
          </div>

          {/* Prompt general */}
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">
              Personalidad / instrucciones
            </Label>
            <textarea
              value={generalPrompt}
              onChange={(e) => setGeneralPrompt(e.target.value)}
              rows={5}
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50 leading-relaxed"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-neutral-400">
                Creatividad ({temperature.toFixed(1)})
              </Label>
              <span className="text-[10px] text-neutral-500">
                {temperature < 0.3
                  ? "Muy estricto"
                  : temperature < 0.6
                    ? "Balanceado"
                    : "Creativo"}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06] -mx-6 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/[0.1] text-neutral-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || loadingVoices}
              className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
            >
              {submitting ? "Creando agente…" : "Crear agente"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
