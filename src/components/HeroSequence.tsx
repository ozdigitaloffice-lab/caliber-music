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
}: {
  manifest: Manifest;
  // (bandName kept in the type for parent compatibility but no longer rendered —
  // see the JSX below; left out of the destructure to silence the unused-var lint)
  bandName?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

        // Cover-fit with a TOP bias when the canvas is wider than the source:
        // the source video has the people standing with their heads near the
        // top third of the square frame. Pure center-crop hides the heads on
        // landscape (desktop) viewports. Biasing dy toward 0.35 keeps faces
        // visible while still showing the walker in the lower part.
        const POSITION_Y_BIAS = 0.35;   // 0 = show full top, 0.5 = center, 1 = show full bottom
        const drawFrame = (frame: HTMLImageElement) => {
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          const fA = frame.naturalWidth / frame.naturalHeight;
          const cA = w / h;
          let dw, dh, dx, dy;
          if (fA > cA) {
            // source wider than canvas → height-fit; image overflows horizontally
            dh = h;
            dw = h * fA;
            dx = (w - dw) / 2;
            dy = 0;
          } else {
            // source taller (or square) → width-fit; image overflows vertically
            dw = w;
            dh = w / fA;
            dx = 0;
            // dy ranges from 0 (top of image flush with top of canvas) to
            // (h - dh) which is negative (bottom of image flush with bottom).
            dy = (h - dh) * POSITION_Y_BIAS;
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
        // it refused to register from inside the bundled module under
        // Turbopack + React 19 StrictMode. Simple math: project the
        // section's top-relative scroll position into [0,1] and pick a frame.
        //
        // Smoothing: we keep a separate `targetProgress` (where scroll says
        // we should be) and `currentProgress` (where we're actually rendering).
        // Each rAF tick, current lerps 12% of the way toward target. Result:
        // even a fast wheel-tick that would otherwise jump ~10 frames at once
        // renders as a quick play-through of those 10 frames instead of a
        // visible skip. Apple's iPhone showcase uses the same trick.
        const LERP_FACTOR = 0.12;       // 0.05 = silkier (laggier), 0.2 = snappier (more visible skips)
        const SETTLE_EPSILON = 0.0005;
        let targetProgress = 0;
        let displayedProgress = -1;
        // The scrub uses only the first 150vh of the pinned scroll range.
        // The section is 300vh tall (sticky child 100vh + scrub 150vh + hold
        // 50vh), so after the video reaches its last frame the sticky child
        // stays pinned for another ~50vh of scroll, showing the last frame
        // before the song grid takes over. User-tunable below.
        const SCRUB_VH = 150;
        const computeProgress = () => {
          const rect = section.getBoundingClientRect();
          const scrubPx = window.innerHeight * (SCRUB_VH / 100);
          if (scrubPx <= 0) return 0;
          const scrolled = -rect.top;
          return Math.max(0, Math.min(1, scrolled / scrubPx));
        };
        const render = (p: number) => {
          const target = Math.min(
            imgs.length - 1,
            Math.floor(p * (imgs.length - 1)),
          );
          if (target !== currentIndex) {
            currentIndex = target;
            drawFrame(imgs[target]);
          }
          // Overlay deepens with scroll, no text element to fade — the source
          // video has the band name + branding baked in already, so a CSS
          // overlay would just clash.
          if (overlayRef.current) {
            overlayRef.current.style.opacity = `${0.45 + p * 0.45}`;
          }
          displayedProgress = p;
        };
        const animate = () => {
          const diff = targetProgress - displayedProgress;
          if (Math.abs(diff) < SETTLE_EPSILON) {
            render(targetProgress);
            rafId = 0;
            return;
          }
          render(displayedProgress + diff * LERP_FACTOR);
          rafId = requestAnimationFrame(animate);
        };
        scrollHandler = () => {
          targetProgress = computeProgress();
          if (!rafId) rafId = requestAnimationFrame(animate);
        };
        // DEBUG hook
        (window as unknown as { __hs: unknown }).__hs = {
          target: () => targetProgress,
          displayed: () => displayedProgress,
          frame: () => currentIndex,
          framesLoaded: imgs.length,
          force: (p: number) => { targetProgress = p; displayedProgress = p; render(p); },
          sectionRect: () => section.getBoundingClientRect(),
        };
        // Initial: snap to current scroll without lerp
        targetProgress = computeProgress();
        displayedProgress = targetProgress;
        render(targetProgress);
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
      className="relative h-[300vh] w-full"
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

        {/* Scroll cue only — band name removed so the video's own typography reads cleanly */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[var(--color-muted-fg)]">
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.4em]">גלגל למטה</span>
          <span aria-hidden className="block h-10 w-px animate-pulse bg-[var(--color-accent)]" />
        </div>
      </div>
    </section>
  );
}
