"use client";

import { useEffect, useRef } from "react";

/**
 * Cursor-following spotlight glow.
 * - Pure CSS radial gradient driven by --cursor-x / --cursor-y vars.
 * - mousemove throttled with rAF so we never repaint more than once per frame.
 * - Fades in on first move, fades out when leaving the window.
 * - Hidden on touch devices (no real cursor).
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Touch devices: don't render the glow at all
    if (window.matchMedia("(hover: none)").matches) {
      el.style.display = "none";
      return;
    }

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      el.style.display = "none";
      return;
    }

    let pending = false;
    let lastX = window.innerWidth / 2;
    let lastY = window.innerHeight / 2;

    function flush() {
      pending = false;
      el!.style.setProperty("--cursor-x", `${lastX}px`);
      el!.style.setProperty("--cursor-y", `${lastY}px`);
    }

    function onMove(e: MouseEvent) {
      lastX = e.clientX;
      lastY = e.clientY;
      el!.style.opacity = "1";
      if (!pending) {
        pending = true;
        requestAnimationFrame(flush);
      }
    }

    function onLeave() {
      el!.style.opacity = "0";
    }

    function onEnter() {
      el!.style.opacity = "1";
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    // initial
    flush();

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] cursor-glow opacity-0 transition-opacity duration-300"
    />
  );
}
