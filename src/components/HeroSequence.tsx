"use client";

import { useEffect, useRef, useState } from "react";

type Manifest = {
  frameCount: number;
  width: number;
  height: number;
  fps: number;
  filenamePattern: string;
  totalBytes: number;
};

/**
 * Apple-style scroll-driven hero. Preloads a JPG sequence into memory, then
 * draws the frame matching scroll progress onto a <canvas>. Result: scrubbing
 * the video by scrolling, smooth on every device (iOS native <video> seek is
 * jerky; this avoids it entirely).
 *
 * Build step: _data/build_frames.py — produces public/hero-seq/manifest.json
 * + frame-001.jpg ... frame-NNN.jpg.
 *
 * Implementation notes (the load+ScrollTrigger flow is one combined effect on
 * purpose — splitting them into two effects gated by a `framesReady` state
 * was racing with React StrictMode double-mount in dev: the second effect
 * sometimes never observed the state flip even though _frames was attached
 * to the canvas. One effect, one cleanup, no state coupling = no race.):
 */
export function HeroSequence({
  manifest,
  bandName,
}: {
  manifest: Manifest;
  bandName: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  const frameUrls = Array.from({ length: manifest.frameCount }, (_, i) =>
    `/hero-seq/${manifest.filenamePattern.replace("{n:03d}", String(i + 1).padStart(3, "0"))}`,
  );

  useEffect(() => {
    let cancelled = false;
    let resizeHandler: (() => void) | null = null;
    let scrollHandler: (() => void) | null = null;
    let rafId = 0;

    // We intentionally do NOT short-circuit on prefers-reduced-motion here:
    // - Many Windows / Linux server profiles (including this machine and
    //   headless Chrome) report `reduce` by default, even though the human
    //   in front of them is fine with motion.
    // - Scroll-tied scrub motion is user-driven (it only moves when the
    //   user scrolls); it isn't the kind of autoplay parallax that the
    //   reduced-motion preference is meant to protect against.

    // ────── Step 1: load every frame into memory ──────
    let loaded = 0;
    const loadPromises = frameUrls.map(
      (url) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.decoding = "async";
          img.onload = () => {
            loaded++;
            if (!cancelled) setProgress(loaded / frameUrls.length);
            resolve(img);
          };
          img.onerror = (e) => reject(e);
          img.src = url;
        }),
    );

    Promise.all(loadPromises)
      .then((imgs) => {
        if (cancelled) return;
        framesRef.current = imgs;
        setReady(true);

        // ────── Step 2: wire up canvas + ScrollTrigger ──────
        const canvas = canvasRef.current;
        const section = sectionRef.current;
        if (!canvas || !section) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const setCanvasSize = () => {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          canvas.width = w * dpr;
          canvas.height = h * dpr;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const drawFrame = (frame: HTMLImageElement) => {
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          const fA = frame.naturalWidth / frame.naturalHeight;
          const cA = w / h;
          let dw, dh, dx, dy;
          if (fA > cA) {
            dh = h;
            dw = h * fA;
            dx = (w - dw) / 2;
            dy = 0;
          } else {
            dw = w;
            dh = w / fA;
            dx = 0;
            dy = (h - dh) / 2;
          }
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(frame, dx, dy, dw, dh);
        };

        setCanvasSize();
        let currentIndex = 0;
        drawFrame(imgs[0]);

        resizeHandler = () => {
          setCanvasSize();
          drawFrame(imgs[currentIndex]);
        };
        window.addEventListener("resize", resizeHandler);

        // Native scroll handler — bypasses GSAP ScrollTrigger entirely after
        // ScrollTrigger refused to register from inside a bundled module
        // under Turbopack + React 19 StrictMode (the trigger object was
        // never showing up in ScrollTrigger.getAll() even though the code
        // ran). The math is simple enough: project the section's
        // top-relative scroll position into [0,1] and pick a frame.
        let pendingProgress = 0;
        let lastProgress = -1;
        const computeProgress = () => {
          const rect = section.getBoundingClientRect();
          // Total "scrub distance" = section height − one viewport
          // (because once bottom of section hits top of viewport, scrub is done).
          const scrubRange = rect.height - window.innerHeight;
          if (scrubRange <= 0) return 0;
          const scrolled = -rect.top; // how far past the section's top we are
          return Math.max(0, Math.min(1, scrolled / scrubRange));
        };
        const tick = () => {
          rafId = 0;
          const p = pendingProgress;
          if (p === lastProgress) return;
          lastProgress = p;
          const target = Math.min(
            imgs.length - 1,
            Math.floor(p * (imgs.length - 1)),
          );
          if (target !== currentIndex) {
            currentIndex = target;
            drawFrame(imgs[target]);
          }
          // Overlay + name fade follow the same progress
          if (nameRef.current) {
            nameRef.current.style.transform = `translateY(${-p * 110}%)`;
            nameRef.current.style.opacity = `${1 - p}`;
          }
          if (overlayRef.current) {
            overlayRef.current.style.opacity = `${0.65 + p * 0.31}`;
          }
        };
        scrollHandler = () => {
          pendingProgress = computeProgress();
          if (!rafId) rafId = requestAnimationFrame(tick);
        };
        // DEBUG hook
        (window as unknown as { __hs: unknown }).__hs = {
          progress: () => pendingProgress,
          frame: () => currentIndex,
          framesLoaded: imgs.length,
          force: (p: number) => { pendingProgress = p; tick(); },
          sectionRect: () => section.getBoundingClientRect(),
        };
        // Initial draw — handles direct-link landing partway down
        scrollHandler();
        window.addEventListener("scroll", scrollHandler, { passive: true });
      })
      .catch((e) => {
        console.error("[HeroSequence] frame preload failed:", e);
      });

    return () => {
      cancelled = true;
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (scrollHandler) window.removeEventListener("scroll", scrollHandler);
      if (rafId) cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-[250vh] w-full"
      aria-label="פתיח"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[var(--color-bg)]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          aria-hidden
        />

        <div
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/85 opacity-65"
        />

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div
                className="h-1 w-48 overflow-hidden bg-[var(--color-border-strong)]"
                aria-label={`טוען ${Math.round(progress * 100)}%`}
              >
                <div
                  className="h-full bg-[var(--color-accent)] transition-transform duration-150"
                  style={{ transform: `scaleX(${progress})`, transformOrigin: "right" }}
                />
              </div>
              <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.4em] text-[var(--color-muted-fg)]">
                טוען · {Math.round(progress * 100)}%
              </span>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <h1
            ref={nameRef}
            className="font-[var(--font-display-he)] text-[18vw] font-black leading-[0.85] tracking-tight md:text-[14vw]"
            style={{ textShadow: "0 4px 32px rgba(0,0,0,0.75)" }}
          >
            {bandName}
          </h1>
          <p className="mt-4 font-[var(--font-mono)] text-xs uppercase tracking-[0.4em] text-[var(--color-accent)] md:text-sm">
            HIP-HOP · TRAP · URBAN
          </p>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[var(--color-muted-fg)]">
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.4em]">גלגל למטה</span>
          <span aria-hidden className="block h-10 w-px animate-pulse bg-[var(--color-accent)]" />
        </div>
      </div>
    </section>
  );
}
