"use client";

import { useEffect } from "react";

/**
 * Wake up Modal serverless backend in the background.
 *
 * Modal cold-starts can take 5–15s on the first request after idle.
 * If we ping a cheap endpoint as soon as a public page loads, by the
 * time the user clicks "Entrar" or "Crear mi agente" the container
 * is already warm and the next API call returns in <500ms.
 *
 * Fire-and-forget, no UI, no error surface.
 */
export function ModalPrewarm() {
  useEffect(() => {
    const ctrl = new AbortController();
    // Tiny static endpoint that doesn't touch external services
    fetch("/api/health", {
      cache: "no-store",
      signal: ctrl.signal,
      // low priority so we never block real navigation
      priority: "low" as RequestPriority,
    }).catch(() => {
      // intentionally swallow — this is best-effort warming
    });
    return () => ctrl.abort();
  }, []);
  return null;
}
