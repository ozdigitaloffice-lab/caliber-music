"use client";

import { useEffect, useRef, useState } from "react";

type Manifest = {
  frameCount: number;
  width: number;
  height: number;
  fps: number;
  filenamePattern: string;
};

/**
 * Scroll-driven envelope animation. Sits between the song grid and the
 * "מי אנחנו" section as a visual transition.
 *
 * Loading strategy — optimized for "load as fast as possible without
 * sacrificing quality" while staying invisible to users not scrolling:
 *
 * 1. **Last frame loads immediately at high priority**. Drawn to the canvas
 *    as a static placeholder so the section always shows something (the
 *    end state of the animation — "the envelope is open").
 * 2. **All other frames load lazily** via IntersectionObserver. The
 *    download is kicked off only when the section is within 1.5 viewports
 *    of being on-screen, so visitors who never reach this section never
 *    pay the bytes.
 * 3. **Background loads run at low fetchpriority** so they don't compete
 *    with hero frames or other critical resources.
 * 4. **Nearest-loaded fallback** as in HeroSequence — if scroll asks for
 *    a frame that hasn't downloaded yet, the renderer picks the closest
 *    one that has. So scrub never "skips" — it just gets smoother as
 *    more frames land.
 *
 * No blocking UI: the section just shows its placeholder while loading,
 * and the scrub becomes interactive when frames arrive.
 */
export function EnvelopeSequence({ manifest }: { manifest: Manifest }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | undefined)[]>(
    new Array(manifest.frameCount),
  );
  const [hasPlaceholder, setHasPlaceholder] = useState(false);

  const buildUrl = (n: number) =>
    `/envelope-seq/${manifest.filenamePattern.replace("{n:03d}", String(n).padStart(3, "0"))}`;

  useEffect(() => {
    let cancelled = false;
    let scrollHandler: (() => void) | null = null;
    let resizeHandler: (() => void) | null = null;
    let observer: IntersectionObserver | null = null;
    let rafId = 0;
    let backgroundStarted = false;

    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
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

    // Cover-fit so the 16:9 source fills any viewport aspect. Centered.
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

    const nearestLoaded = (target: number): HTMLImageElement | undefined => {
      const frames = framesRef.current;
      if (frames[target]) return frames[target];
      for (let off = 1; off < frames.length; off++) {
        const lo = target - off;
        const hi = target + off;
        if (lo >= 0 && frames[lo]) return frames[lo];
        if (hi < frames.length && frames[hi]) return frames[hi];
      }
      return undefined;
    };

    setCanvasSize();

    // ────── Step 1: high-priority load of the LAST frame for the placeholder ──────
    const lastIdx = manifest.frameCount - 1;
    const lastImg = new Image();
    lastImg.decoding = "async";
    (lastImg as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "high";
    lastImg.onload = () => {
      if (cancelled) return;
      framesRef.current[lastIdx] = lastImg;
      // Draw it immediately so the section never looks empty.
      drawFrame(lastImg);
      setHasPlaceholder(true);
    };
    lastImg.src = buildUrl(manifest.frameCount);

    // ────── Step 2: scroll handler with lerp (always wired up) ──────
    let displayedProgress = -1;
    let targetProgress = 0;
    let currentIndex = -1;
    const SCRUB_VH = 100;
    const LERP = 0.14;
    const EPS = 0.0008;

    const computeProgress = () => {
      const rect = section.getBoundingClientRect();
      const scrubPx = window.innerHeight * (SCRUB_VH / 100);
      if (scrubPx <= 0) return 0;
      const scrolled = -rect.top;
      return Math.max(0, Math.min(1, scrolled / scrubPx));
    };

    const render = (p: number) => {
      const target = Math.min(
        manifest.frameCount - 1,
        Math.floor(p * (manifest.frameCount - 1)),
      );
      if (target !== currentIndex) {
        currentIndex = target;
        const f = nearestLoaded(target);
        if (f) drawFrame(f);
      }
      displayedProgress = p;
    };

    const animate = () => {
      const diff = targetProgress - displayedProgress;
      if (Math.abs(diff) < EPS) {
        render(targetProgress);
        rafId = 0;
        return;
      }
      render(displayedProgress + diff * LERP);
      rafId = requestAnimationFrame(animate);
    };

    scrollHandler = () => {
      targetProgress = computeProgress();
      if (!rafId) rafId = requestAnimationFrame(animate);
    };
    targetProgress = computeProgress();
    displayedProgress = targetProgress;
    window.addEventListener("scroll", scrollHandler, { passive: true });

    resizeHandler = () => {
      setCanvasSize();
      const f = nearestLoaded(currentIndex >= 0 ? currentIndex : lastIdx);
      if (f) drawFrame(f);
    };
    window.addEventListener("resize", resizeHandler);

    // ────── Step 3: lazy-load everything else once we approach the section ──────
    const startBackgroundLoad = () => {
      if (backgroundStarted) return;
      backgroundStarted = true;
      for (let i = 1; i <= manifest.frameCount; i++) {
        if (i === manifest.frameCount) continue; // already loaded
        const img = new Image();
        img.decoding = "async";
        (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "low";
        img.onload = () => {
          if (cancelled) return;
          framesRef.current[i - 1] = img;
        };
        img.src = buildUrl(i);
      }
    };

    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            startBackgroundLoad();
            observer?.disconnect();
            break;
          }
        }
      },
      // Start loading when the section is 1.5 viewports below the fold —
      // by the time the user scrolls into it, frames are usually ready.
      { rootMargin: "150% 0% 50% 0%", threshold: 0 },
    );
    observer.observe(section);

    return () => {
      cancelled = true;
      if (scrollHandler) window.removeEventListener("scroll", scrollHandler);
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (rafId) cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest.frameCount]);

  return (
    <section
      ref={sectionRef}
      className="relative h-[200vh] w-full"
      aria-label="קליפ מעבר"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[var(--color-bg)]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          aria-hidden
        />
        {!hasPlaceholder && (
          // Tiny brand-tinted shimmer while the placeholder frame downloads
          // (usually <500ms on broadband). Subtle so it doesn't compete with
          // the eventual image.
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(223,225,4,0.04),transparent_60%)]"
          />
        )}
      </div>
    </section>
  );
}
