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
 * Scroll-driven envelope animation between the song grid and "מי אנחנו".
 *
 * Loading strategy:
 * 1. **Frame 1 loads first** at high fetchpriority and is drawn as the
 *    static placeholder. The user always sees the envelope at its
 *    starting state, even if they jump to this section before the rest
 *    has downloaded.
 * 2. **All other frames are loaded** — but deferred via
 *    requestIdleCallback (with setTimeout fallback). This means the
 *    page's critical resources (hero frames, album art, fonts, JS)
 *    finish first, *then* the envelope frames stream in in the
 *    background. Every frame uses fetchpriority="low" so the browser
 *    pushes them behind everything else regardless of when requested.
 * 3. **Nearest-loaded fallback**: if scroll asks for a frame that
 *    hasn't downloaded yet, the renderer walks outward to find the
 *    nearest one that has. Scrub gets smoother as more frames arrive.
 *
 * No blocking UI; the section just shows frame-1 as a static image and
 * upgrades to interactive scrub as frames land.
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
    let rafId = 0;
    let idleHandle: number | null = null;
    let idleTimeout: number | null = null;

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

    // ────── Step 1: load FRAME 1 first for the placeholder ──────
    const firstImg = new Image();
    firstImg.decoding = "async";
    (firstImg as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "high";
    firstImg.onload = () => {
      if (cancelled) return;
      framesRef.current[0] = firstImg;
      drawFrame(firstImg); // static placeholder — envelope at its starting state
      setHasPlaceholder(true);
    };
    firstImg.src = buildUrl(1);

    // ────── Step 2: scroll handler with lerp (always wired up) ──────
    let displayedProgress = -1;
    let targetProgress = 0;
    let currentIndex = -1;
    // The scrub finishes in the first 100vh of pinned scroll. Because the
    // outer section is h-[350vh] (= 250vh sticky-pinned), the last 150vh
    // of pinned scroll holds the final frame in view before the next
    // section takes over — about 1.5 viewports of "look at the open
    // envelope" so the moment lands before the page moves on.
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
      const f = nearestLoaded(currentIndex >= 0 ? currentIndex : 0);
      if (f) drawFrame(f);
    };
    window.addEventListener("resize", resizeHandler);

    // ────── Step 3: load the rest in the background, deferred until idle ──────
    //
    // We always load every frame (never want a user reaching this section
    // and seeing only a static image), but we defer kicking it off until
    // the browser reports idle time. That way the hero loader, hero
    // frames, album art, fonts, and JS all finish first — the envelope
    // sequence trickles in *after* everything else is settled.
    //
    // Each request is also marked fetchpriority="low" so the browser
    // pushes them behind anything else still in flight, regardless of
    // when they're requested.
    const startBackgroundLoad = () => {
      for (let i = 2; i <= manifest.frameCount; i++) {
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

    // requestIdleCallback isn't on every browser (notably Safari); the
    // setTimeout fallback gives the page a 2s head start to settle.
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      idleHandle = w.requestIdleCallback(() => {
        if (!cancelled) startBackgroundLoad();
      }, { timeout: 4000 });
    } else {
      idleTimeout = window.setTimeout(() => {
        if (!cancelled) startBackgroundLoad();
      }, 2000);
    }

    return () => {
      cancelled = true;
      if (scrollHandler) window.removeEventListener("scroll", scrollHandler);
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (rafId) cancelAnimationFrame(rafId);
      if (idleHandle != null && typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(idleHandle);
      }
      if (idleTimeout != null) window.clearTimeout(idleTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest.frameCount]);

  return (
    <section
      ref={sectionRef}
      className="relative h-[350vh] w-full"
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
