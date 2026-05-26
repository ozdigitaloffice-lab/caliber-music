"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Manifest = {
  frameCount: number;
  width: number;
  height: number;
  fps: number;
  filenamePattern: string; // "frame-{n:03d}.jpg"
  totalBytes: number;
};

/**
 * Apple-style scroll-driven hero. Pre-renders a video as a JPG sequence
 * (one frame per file), preloads all of them into memory, then draws the
 * frame matching scroll progress onto a <canvas>. Result: scrubbing the
 * video by scrolling, perfectly smooth on every device including iOS
 * (where native <video> seeking is jerky).
 *
 * The build step is _data/build_frames.py — it produces:
 *   public/hero-seq/manifest.json
 *   public/hero-seq/frame-001.jpg ... frame-NNN.jpg
 *
 * If manifest.json is missing, the parent should render the fallback Hero
 * (album-art backdrop). We don't import or render Hero here — the parent
 * page decides which to show based on availability.
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

  const [framesReady, setFramesReady] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 preload progress

  // Build the array of image URLs once.
  const frameUrls = Array.from({ length: manifest.frameCount }, (_, i) =>
    `/hero-seq/${manifest.filenamePattern.replace("{n:03d}", String(i + 1).padStart(3, "0"))}`,
  );

  // Preload all frames into memory.
  useEffect(() => {
    let cancelled = false;
    const images: HTMLImageElement[] = [];
    let loaded = 0;

    const promises = frameUrls.map((url) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          loaded++;
          if (!cancelled) setProgress(loaded / frameUrls.length);
          resolve(img);
        };
        img.onerror = reject;
        img.src = url;
      });
    });

    Promise.all(promises)
      .then((imgs) => {
        if (cancelled) return;
        images.push(...imgs);
        // Stash on a ref-like for the scroll handler
        (canvasRef.current as unknown as { _frames: HTMLImageElement[] })._frames = imgs;
        setFramesReady(true);
      })
      .catch((e) => console.error("Hero frames failed to load:", e));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wire scroll-tied frame rendering once frames are ready.
  useEffect(() => {
    if (!framesReady) return;
    if (!sectionRef.current || !canvasRef.current) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const frames = (canvas as unknown as { _frames: HTMLImageElement[] })._frames;
    if (!ctx || !frames || frames.length === 0) return;

    // High-DPI canvas — match device pixel ratio for crisp render.
    const setCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Cover-fit each frame so it fills the viewport regardless of aspect.
    const drawFrame = (frame: HTMLImageElement) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const frameAspect = frame.naturalWidth / frame.naturalHeight;
      const canvasAspect = w / h;
      let dw, dh, dx, dy;
      if (frameAspect > canvasAspect) {
        dh = h;
        dw = h * frameAspect;
        dx = (w - dw) / 2;
        dy = 0;
      } else {
        dw = w;
        dh = w / frameAspect;
        dx = 0;
        dy = (h - dh) / 2;
      }
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(frame, dx, dy, dw, dh);
    };

    setCanvasSize();
    drawFrame(frames[0]);

    const onResize = () => {
      setCanvasSize();
      drawFrame(frames[currentIndex]);
    };
    window.addEventListener("resize", onResize);

    let currentIndex = 0;

    if (reducedMotion) {
      // Reduced motion: just draw a representative mid frame and skip the scrub.
      drawFrame(frames[Math.floor(frames.length / 2)]);
      return () => window.removeEventListener("resize", onResize);
    }

    const ctxGsap = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current!,
          start: "top top",
          end: "bottom top",
          scrub: 0.5,
          onUpdate: (self) => {
            const target = Math.min(
              frames.length - 1,
              Math.floor(self.progress * (frames.length - 1)),
            );
            if (target !== currentIndex) {
              currentIndex = target;
              drawFrame(frames[target]);
            }
          },
        },
      });

      // Band name pushes up + fades as you scroll past
      tl.to(nameRef.current, { yPercent: -110, opacity: 0, ease: "none" }, 0);
      tl.to(overlayRef.current, { opacity: 0.96, ease: "none" }, 0);
    }, sectionRef);

    return () => {
      window.removeEventListener("resize", onResize);
      ctxGsap.revert();
    };
  }, [framesReady]);

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

        {/* Darkening + vignette overlay — scrubs with scroll */}
        <div
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/85 opacity-65"
        />

        {/* Loading state — visible while frames preload */}
        {!framesReady && (
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

        {/* Band name big — scrubs */}
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

        {/* Scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[var(--color-muted-fg)]">
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.4em]">גלגל למטה</span>
          <span aria-hidden className="block h-10 w-px animate-pulse bg-[var(--color-accent)]" />
        </div>
      </div>
    </section>
  );
}
