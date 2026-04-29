"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Voice = {
  voice_id: string;
  voice_name: string;
  provider: string;
  gender: string;
  accent: string;
  preview_audio_url?: string;
};

type Agent = {
  agent_id: string;
  name: string;
  voice_id: string;
};

export function VoiceSelector() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [v, a] = await Promise.all([
        fetch("/api/voices", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/agents", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setVoices(v.voices ?? []);
      setAgents(a.agents ?? []);
      if (a.agents?.[0]) {
        setSelectedAgentId(a.agents[0].agent_id);
        setSelectedVoiceId(a.agents[0].voice_id ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Cuando cambia el agente seleccionado, sincroniza voice_id
  useEffect(() => {
    const ag = agents.find((a) => a.agent_id === selectedAgentId);
    if (ag) setSelectedVoiceId(ag.voice_id ?? "");
  }, [selectedAgentId, agents]);

  async function play(voice: Voice) {
    if (!voice.preview_audio_url) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingId === voice.voice_id) {
      setPlayingId(null);
      return;
    }
    const audio = new Audio(voice.preview_audio_url);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(voice.voice_id);
    try {
      await audio.play();
    } catch {
      setPlayingId(null);
    }
  }

  async function handleSave() {
    if (!selectedAgentId || !selectedVoiceId) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(selectedAgentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: selectedVoiceId }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  const filtered = filter
    ? voices.filter(
        (v) =>
          v.voice_name.toLowerCase().includes(filter.toLowerCase()) ||
          v.accent?.toLowerCase().includes(filter.toLowerCase()) ||
          v.gender?.toLowerCase().includes(filter.toLowerCase())
      )
    : voices;

  const currentAgent = agents.find((a) => a.agent_id === selectedAgentId);

  return (
    <Card className="border-white/[0.06] bg-white/[0.02]">
      <CardHeader>
        <CardTitle className="font-heading text-lg italic">Voz del agente</CardTitle>
        <p className="text-xs text-neutral-500">
          Cambia la voz con la que tu agente habla por teléfono. El cambio se
          aplica a la <strong>siguiente llamada</strong>.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <p className="text-sm text-neutral-500">Cargando voces…</p>
        ) : (
          <>
            {/* Agent selector (si hay varios) */}
            {agents.length > 1 && (
              <div className="space-y-1">
                <label className="text-xs text-neutral-400">Agente</label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none"
                >
                  {agents.map((a) => (
                    <option key={a.agent_id} value={a.agent_id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter + count */}
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrar por nombre, acento, género…"
                className="flex-1 rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
              />
              <span className="text-xs text-neutral-500">
                {filtered.length} de {voices.length}
              </span>
            </div>

            {/* Voice grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-2">
              {filtered.map((v) => {
                const selected = v.voice_id === selectedVoiceId;
                const playing = playingId === v.voice_id;
                return (
                  <div
                    key={v.voice_id}
                    onClick={() => setSelectedVoiceId(v.voice_id)}
                    className={`rounded-lg border p-3 cursor-pointer transition ${
                      selected
                        ? "border-amber-400/60 bg-amber-400/[0.08]"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-100 truncate">
                          {v.voice_name}
                        </p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {v.gender && (
                            <Badge
                              variant="outline"
                              className="border-neutral-700 text-neutral-400 text-[9px] h-4 py-0"
                            >
                              {v.gender}
                            </Badge>
                          )}
                          {v.accent && (
                            <Badge
                              variant="outline"
                              className="border-neutral-700 text-neutral-400 text-[9px] h-4 py-0"
                            >
                              {v.accent}
                            </Badge>
                          )}
                          {v.provider && (
                            <Badge
                              variant="outline"
                              className="border-neutral-800 text-neutral-500 text-[9px] h-4 py-0"
                            >
                              {v.provider}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {v.preview_audio_url && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            play(v);
                          }}
                          className="shrink-0 h-8 w-8 rounded-full bg-white/[0.06] hover:bg-amber-400/20 flex items-center justify-center text-xs"
                          title="Escuchar muestra"
                        >
                          {playing ? "⏸" : "▶"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
              <div className="text-xs text-neutral-500">
                {currentAgent && (
                  <>
                    Voz actual:{" "}
                    <span className="text-neutral-300 font-mono">
                      {currentAgent.voice_id || "—"}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                {saved && (
                  <span className="text-xs text-emerald-400">✓ Voz actualizada</span>
                )}
                <Button
                  onClick={handleSave}
                  disabled={
                    saving ||
                    !selectedVoiceId ||
                    selectedVoiceId === currentAgent?.voice_id
                  }
                  className="bg-amber-400 text-black hover:bg-amber-300 font-medium disabled:opacity-40"
                >
                  {saving ? "Guardando…" : "Guardar voz"}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
