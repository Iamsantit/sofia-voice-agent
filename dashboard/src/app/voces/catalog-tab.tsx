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
import { Label } from "@/components/ui/label";

type Voice = {
  voice_id: string;
  voice_name: string;
  provider: string;
  gender: string;
  accent: string;
  preview_audio_url?: string;
  is_custom?: boolean;
};

type Agent = {
  agent_id: string;
  name: string;
  voice_id: string;
};

export function CatalogTab() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("");
  const [accentFilter, setAccentFilter] = useState<string>("");
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
      if (a.agents?.[0] && !selectedAgentId) {
        setSelectedAgentId(a.agents[0].agent_id);
        setSelectedVoiceId(a.agents[0].voice_id ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    load();
  }, [load]);

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

  const accents = Array.from(new Set(voices.map((v) => v.accent).filter(Boolean)));
  const genders = Array.from(new Set(voices.map((v) => v.gender).filter(Boolean)));

  const filtered = voices.filter((v) => {
    if (filter && !v.voice_name.toLowerCase().includes(filter.toLowerCase())) return false;
    if (genderFilter && v.gender !== genderFilter) return false;
    if (accentFilter && v.accent !== accentFilter) return false;
    return true;
  });

  const currentAgent = agents.find((a) => a.agent_id === selectedAgentId);
  const currentVoice = voices.find((v) => v.voice_id === currentAgent?.voice_id);

  return (
    <div className="space-y-5 mt-5">
      {/* Agent + current voice header */}
      <Card className="border-white/[0.06] bg-gradient-to-br from-fuchsia-500/[0.04] via-transparent to-cyan-500/[0.04]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-1">
                Agente seleccionado
              </p>
              {agents.length > 0 ? (
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="bg-transparent border-0 text-xl font-heading italic font-semibold text-white outline-none cursor-pointer"
                >
                  {agents.map((a) => (
                    <option key={a.agent_id} value={a.agent_id} className="bg-neutral-900">
                      {a.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xl font-heading italic text-neutral-500">Sin agentes</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-1">
                Voz actual
              </p>
              <p className="text-xl font-heading italic font-semibold bg-gradient-to-r from-fuchsia-300 to-amber-300 bg-clip-text text-transparent">
                {currentVoice?.voice_name ?? currentAgent?.voice_id ?? "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-neutral-500 text-center py-8">Cargando voces…</p>
      ) : (
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader className="space-y-3">
            <CardTitle className="font-heading text-lg italic">
              Catálogo ({filtered.length} de {voices.length})
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar por nombre…"
                className="flex-1 min-w-[200px] rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
              />
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none"
              >
                <option value="">Cualquier género</option>
                {genders.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <select
                value={accentFilter}
                onChange={(e) => setAccentFilter(e.target.value)}
                className="rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none"
              >
                <option value="">Cualquier acento</option>
                {accents.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-2">
              {filtered.map((v) => {
                const selected = v.voice_id === selectedVoiceId;
                const playing = playingId === v.voice_id;
                return (
                  <div
                    key={v.voice_id}
                    onClick={() => setSelectedVoiceId(v.voice_id)}
                    className={`rounded-xl border p-3 cursor-pointer transition group ${
                      selected
                        ? "border-amber-400/60 bg-amber-400/[0.08] ring-1 ring-amber-400/30"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-neutral-100 truncate">
                            {v.voice_name}
                          </p>
                          {v.is_custom && (
                            <Badge variant="outline" className="border-fuchsia-500/40 text-fuchsia-300 text-[9px] py-0 h-4">
                              Mía
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {v.gender && (
                            <Badge variant="outline" className="border-neutral-700 text-neutral-400 text-[9px] py-0 h-4">
                              {v.gender}
                            </Badge>
                          )}
                          {v.accent && (
                            <Badge variant="outline" className="border-neutral-700 text-neutral-400 text-[9px] py-0 h-4">
                              {v.accent}
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
                          className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-sm transition ${
                            playing
                              ? "bg-amber-400 text-black"
                              : "bg-white/[0.06] hover:bg-amber-400/30 text-amber-400"
                          }`}
                          title="Escuchar"
                        >
                          {playing ? "⏸" : "▶"}
                        </button>
                      )}
                    </div>
                    <p className="text-[9px] text-neutral-600 mt-1 truncate">
                      {v.provider}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-2 px-2">
        <div className="rounded-xl border border-white/[0.08] bg-neutral-950/90 backdrop-blur-md p-4 flex items-center justify-between gap-4">
          <p className="text-xs text-neutral-400">
            {saved ? (
              <span className="text-emerald-400">✓ Voz actualizada</span>
            ) : selectedVoiceId === currentAgent?.voice_id ? (
              "Selecciona una voz diferente para guardar"
            ) : (
              <>
                Vas a cambiar la voz de{" "}
                <span className="text-neutral-200">{currentAgent?.name}</span>
              </>
            )}
          </p>
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              !selectedVoiceId ||
              selectedVoiceId === currentAgent?.voice_id
            }
            className="bg-amber-400 text-black hover:bg-amber-300 font-medium disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Aplicar voz al agente"}
          </Button>
        </div>
      </div>
    </div>
  );
}
