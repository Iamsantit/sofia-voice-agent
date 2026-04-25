"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const SCRIPT = `Hola, soy [tu nombre] y esta es una grabación de mi voz para entrenar a mi asistente virtual. Estoy hablando con tono natural, claro y a velocidad normal. Hoy es un día perfecto para crear cosas nuevas con inteligencia artificial. Disfruto de las conversaciones tranquilas, los retos interesantes y las soluciones bien pensadas. Mi voz es única y quiero que mi asistente la represente fielmente.`;

type RecState = "idle" | "recording" | "stopped" | "uploading" | "cloning" | "done";

export function CloneTab() {
  const [voiceName, setVoiceName] = useState("");
  const [recState, setRecState] = useState<RecState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    setError(null);
    setResultMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch (e) {
      setError(
        e instanceof Error
          ? `No se pudo acceder al micrófono: ${e.message}`
          : "No se pudo acceder al micrófono"
      );
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecState("stopped");
  }

  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecState("idle");
    setSeconds(0);
    setError(null);
    setResultMsg(null);
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    setResultMsg(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(f);
    setAudioUrl(URL.createObjectURL(f));
    setRecState("stopped");
  }

  async function handleClone() {
    if (!audioBlob || !voiceName.trim()) {
      setError("Necesitas un nombre y una grabación.");
      return;
    }
    setError(null);
    setRecState("uploading");
    setResultMsg("Preparando audio…");

    // En una versión completa, aquí subiríamos el blob a un storage (S3, Modal Volume público, etc.)
    // y obtendríamos una audio_url accesible desde Retell. Para mantener este MVP simple,
    // creamos un Data URL — si Retell no lo acepta (probable), el endpoint regresa error claro.
    try {
      const reader = new FileReader();
      const base64Url = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      setRecState("cloning");
      setResultMsg("Enviando a Retell para clonar…");

      const res = await fetch("/api/voices/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice_name: voiceName.trim(),
          audio_url: base64Url,
          audio_format: "webm",
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setRecState("done");
        setResultMsg(`✓ Voz "${voiceName}" creada. Aparece en Catálogo > Mías.`);
      } else {
        setRecState("stopped");
        const msg = data.message ?? "Error";
        // Hint friendly cuando el problema es upload de audio_url
        if (msg.toLowerCase().includes("audio_url") || msg.includes("data:")) {
          setError(
            "Retell no acepta audios subidos directamente desde el navegador (necesita una URL pública).\n\n" +
              "Opciones para producción:\n" +
              "• Sube el audio a un servicio de hosting (S3, Cloudinary) y pega la URL\n" +
              "• O usa el panel directo de Retell para clonar voces\n\n" +
              "Mensaje técnico: " + msg
          );
        } else {
          setError(msg);
        }
      }
    } catch (e) {
      setRecState("stopped");
      setError(e instanceof Error ? e.message : "Error de red");
    }
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const tooShort = seconds > 0 && seconds < 30;
  const goodLength = seconds >= 30 && seconds <= 180;
  const tooLong = seconds > 180;

  return (
    <div className="space-y-5 mt-5">
      {/* Hero info */}
      <Card className="border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/[0.06] via-transparent to-amber-500/[0.04]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎙️</span>
            <div>
              <CardTitle className="font-heading text-2xl italic font-bold">
                Clona tu voz
              </CardTitle>
              <p className="text-xs text-neutral-400 mt-1">
                Graba o sube un audio de 30s–3min y usa tu propia voz en el agente.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg bg-black/30 border border-white/[0.06] p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-amber-400/80">
              📜 Lee este texto en voz alta cuando grabes:
            </p>
            <p className="text-sm text-neutral-300 leading-relaxed italic">
              "{SCRIPT}"
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2 text-center">
              <p className="text-neutral-500 mb-1">Duración ideal</p>
              <p className="text-neutral-200 font-medium">30s – 3min</p>
            </div>
            <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2 text-center">
              <p className="text-neutral-500 mb-1">Habla con</p>
              <p className="text-neutral-200 font-medium">Tono natural</p>
            </div>
            <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2 text-center">
              <p className="text-neutral-500 mb-1">Ambiente</p>
              <p className="text-neutral-200 font-medium">Sin ruido</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recorder */}
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="font-heading text-lg italic">
            1. Nombre de tu voz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="Mi voz personal"
            className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
          />
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="font-heading text-lg italic">
            2. Graba o sube tu audio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Recording UI */}
          <div className="rounded-2xl border border-white/[0.08] bg-black/30 p-8 text-center space-y-4">
            <div className="flex flex-col items-center gap-4">
              {recState === "recording" ? (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
                  <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-red-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                    <span className="text-4xl">🎙️</span>
                  </div>
                </div>
              ) : recState === "stopped" || recState === "done" ? (
                <div className="h-24 w-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center">
                  <span className="text-4xl">✓</span>
                </div>
              ) : (
                <div className="h-24 w-24 rounded-full bg-white/[0.04] border-2 border-white/[0.1] flex items-center justify-center">
                  <span className="text-4xl">🎤</span>
                </div>
              )}

              {recState === "recording" && (
                <div>
                  <p className="text-3xl font-mono font-bold text-red-400 tabular-nums">
                    {minutes}:{String(secs).padStart(2, "0")}
                  </p>
                  <div className="flex gap-2 justify-center mt-1">
                    {tooShort && (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px]">
                        Sigue grabando (mín. 30s)
                      </Badge>
                    )}
                    {goodLength && (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-[10px]">
                        Duración OK
                      </Badge>
                    )}
                    {tooLong && (
                      <Badge variant="outline" className="border-red-500/40 text-red-300 text-[10px]">
                        Demasiado largo
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {recState === "stopped" && audioUrl && (
                <div className="w-full max-w-md space-y-2">
                  <p className="text-sm text-neutral-300">
                    Grabación lista — {seconds > 0 ? `${seconds}s` : "subido"}
                  </p>
                  <audio controls src={audioUrl} className="w-full" />
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              {recState === "idle" && (
                <>
                  <Button
                    onClick={startRecording}
                    className="bg-red-500 text-white hover:bg-red-400 font-medium"
                  >
                    🔴 Empezar a grabar
                  </Button>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={onUpload}
                      className="hidden"
                    />
                    <span className="inline-flex items-center px-4 py-2 rounded-md border border-white/[0.1] text-sm text-neutral-300 hover:bg-white/[0.04]">
                      📁 Subir archivo
                    </span>
                  </label>
                </>
              )}

              {recState === "recording" && (
                <Button
                  onClick={stopRecording}
                  className="bg-white text-black hover:bg-neutral-200 font-medium"
                >
                  ⏹ Detener grabación
                </Button>
              )}

              {(recState === "stopped" || recState === "done") && (
                <>
                  <Button
                    onClick={reset}
                    variant="outline"
                    className="border-white/[0.1] text-neutral-300"
                  >
                    Repetir
                  </Button>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3 text-xs text-red-300 whitespace-pre-line">
              {error}
            </div>
          )}

          {resultMsg && !error && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/[0.04] p-3 text-xs text-emerald-300">
              {resultMsg}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clone button */}
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="font-heading text-lg italic">
            3. Clonar
          </CardTitle>
          <p className="text-xs text-neutral-500">
            Crearemos una nueva voz con tu nombre que puedes asignar a cualquier
            agente desde la pestaña <span className="text-amber-400">Catálogo</span>.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleClone}
            disabled={
              !audioBlob ||
              !voiceName.trim() ||
              recState === "uploading" ||
              recState === "cloning" ||
              recState === "done"
            }
            className="bg-gradient-to-r from-fuchsia-500 to-amber-400 text-black hover:opacity-90 font-medium disabled:opacity-40"
          >
            {recState === "uploading" || recState === "cloning"
              ? "Clonando…"
              : recState === "done"
                ? "✓ Voz creada"
                : "🪄 Crear mi voz"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
