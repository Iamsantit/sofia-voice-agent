"use client";

import { useEffect, useRef } from "react";

/**
 * Canvas starfield with parallax + occasional shooting stars.
 * - Pauses when tab hidden (visibilitychange).
 * - Respects prefers-reduced-motion (renders a still field).
 * - GPU-friendly: uses requestAnimationFrame, no heavy filters.
 */
export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    type Star = {
      x: number;
      y: number;
      r: number;
      // depth 0..1 (0 = far/slow, 1 = near/fast)
      z: number;
      // base alpha + twinkle
      a: number;
      twinkle: number;
      twinklePhase: number;
      hue: number;
    };

    type Shooting = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number; // 0..1, 1 = just born
    };

    let stars: Star[] = [];
    const shootings: Shooting[] = [];

    function resize() {
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Density scales with area (cap to keep perf good on huge screens)
      const target = Math.min(260, Math.floor((width * height) / 7000));
      stars = new Array(target).fill(0).map(() => makeStar());
    }

    function makeStar(): Star {
      const z = Math.random();
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.4 + z * 1.4,
        z,
        a: 0.35 + z * 0.55,
        twinkle: 0.4 + Math.random() * 0.6,
        twinklePhase: Math.random() * Math.PI * 2,
        // mostly white, occasional warm or cool tint
        hue:
          Math.random() < 0.85
            ? 0
            : Math.random() < 0.5
              ? 40 // warm gold
              : 260, // cool indigo
      };
    }

    function spawnShooting() {
      // spawn from a random edge, fly toward opposite quadrant
      const fromTop = Math.random() < 0.5;
      const startX = Math.random() * width;
      const startY = fromTop ? -20 : Math.random() * height * 0.4;
      const speed = 6 + Math.random() * 6;
      const angle = Math.PI / 4 + (Math.random() * Math.PI) / 6; // 45–75°
      shootings.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
      });
    }

    let last = performance.now();
    let running = true;
    let raf = 0;

    function frame(now: number) {
      if (!running) return;
      const dt = Math.min(40, now - last);
      last = now;

      ctx!.clearRect(0, 0, width, height);

      // Subtle parallax: very slow horizontal drift based on z
      for (const s of stars) {
        if (!reduceMotion) {
          s.x -= s.z * 0.02 * dt;
          if (s.x < -2) s.x = width + 2;
          s.twinklePhase += (0.0015 + s.z * 0.002) * dt;
        }
        const tw = reduceMotion
          ? s.a
          : s.a *
            (0.65 + 0.35 * Math.sin(s.twinklePhase) * s.twinkle);

        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        if (s.hue === 0) {
          ctx!.fillStyle = `rgba(255,255,255,${tw.toFixed(3)})`;
        } else if (s.hue === 40) {
          ctx!.fillStyle = `rgba(251,191,36,${(tw * 0.9).toFixed(3)})`;
        } else {
          ctx!.fillStyle = `rgba(165,180,252,${(tw * 0.85).toFixed(3)})`;
        }
        ctx!.fill();
      }

      // Shooting stars: ~1 every 7s on average
      if (!reduceMotion && Math.random() < dt / 7000) spawnShooting();

      for (let i = shootings.length - 1; i >= 0; i--) {
        const sh = shootings[i];
        sh.x += sh.vx * (dt / 16);
        sh.y += sh.vy * (dt / 16);
        sh.life -= dt / 900;
        if (
          sh.life <= 0 ||
          sh.x > width + 60 ||
          sh.y > height + 60 ||
          sh.x < -60
        ) {
          shootings.splice(i, 1);
          continue;
        }
        // Tail
        const tailLen = 60 + 40 * sh.life;
        const grad = ctx!.createLinearGradient(
          sh.x,
          sh.y,
          sh.x - sh.vx * (tailLen / 6),
          sh.y - sh.vy * (tailLen / 6),
        );
        grad.addColorStop(0, `rgba(255,255,255,${0.9 * sh.life})`);
        grad.addColorStop(0.4, `rgba(251,191,36,${0.5 * sh.life})`);
        grad.addColorStop(1, "rgba(251,191,36,0)");
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 1.4;
        ctx!.beginPath();
        ctx!.moveTo(sh.x, sh.y);
        ctx!.lineTo(
          sh.x - sh.vx * (tailLen / 6),
          sh.y - sh.vy * (tailLen / 6),
        );
        ctx!.stroke();
      }

      raf = requestAnimationFrame(frame);
    }

    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Nebula gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_0%,rgba(99,102,241,0.18),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_85%_15%,rgba(251,191,36,0.12),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_110%,rgba(168,85,247,0.14),transparent_60%)]" />
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_50%,transparent_40%,rgba(0,0,0,0.45))]" />
      {/* Stars canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ display: "block" }}
      />
    </div>
  );
}
