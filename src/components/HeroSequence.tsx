"use client";

import { useEffect, useRef, useState } from "react";
import { SiteLoader } from "./SiteLoader";

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
  mobileTeaser,
}: {
  manifest: Manifest;
  // (bandName kept in the type for parent compatibility but no longer rendered —
  // see the JSX below; left out of the destructure to silence the unused-var lint)
  bandName?: string;
  // Optional content rendered at the bottom of the sticky area on mobile only
  // — locked in place alongside the video for the entire sticky pin range,
  // exits with the video. Used to show the next section's title/teaser so
  // the user always sees what's coming.
  mobileTeaser?: React.ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  // Loader visibility:
  // - Starts true (covers the page from initial SSR markup so there's no flash
  //   of the un-hydrated site).
  // - Hides automatically when ALL frames finish loading.
  // - Hides immediately if user clicks the Skip button (visible after 15s).
  // After hide → nearest-loaded fallback handles any frames that weren't ready.
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [skipVisible, setSkipVisible] = useState(false);

  const frameUrls = Array.from({ length: manifest.frameCount }, (_, i) =>
    `/hero-seq/${manifest.filenamePattern.replace("{n:03d}", String(i + 1).padStart(3, "0"))}`,
  );

  useEffect(() => {
    let cancelled = false;
    let resizeHandler: (() => void) | null = null;
    let scrollHandler: (() => void) | null = null;
    let rafId = 0;
    // framesRef is a sparse array — entries fill in as each background load
    // resolves. We render the nearest-loaded frame to whatever scroll wants,
    // so the user can start scrolling before all frames are present.

    // We intentionally do NOT short-circuit on prefers-reduced-motion here:
    // - Many Windows / Linux server profiles (including this machine and
    //   headless Chrome) report `reduce` by default, even though the human
    //   in front of them is fine with motion.
    // - Scroll-tied scrub motion is user-driven (it only moves when the
    //   user scrolls); it isn't the kind of autoplay parallax that the
    //   reduced-motion preference is meant to protect against.

    // ────── Progressive loading ──────
    // Strategy: load frame 1 with high priority first, render it immediately
    // (no waiting for the rest), then background-load all other frames at
    // low priority. As frames arrive they fill into framesRef. The render
    // path uses the nearest-loaded frame, so the user can start scrolling
    // within ~500ms of opening the page even on slow connections.
    const frames: (HTMLImageElement | undefined)[] = new Array(frameUrls.length);
    framesRef.current = frames as HTMLImageElement[];
    let loaded = 0;
    const totalToLoad = frameUrls.length;

    const loadOne = (i: number, priority: "high" | "low" | "auto" = "auto") => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        // fetchPriority isn't in the standard typings yet in some setups;
        // assigning the property works regardless and modern browsers honor it.
        (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = priority;
        img.onload = () => {
          frames[i] = img;
          loaded++;
          if (!cancelled) setProgress(loaded / totalToLoad);
          resolve(img);
        };
        img.onerror = reject;
        img.src = frameUrls[i];
      });
    };

    // Kick off frame-1 right away with HIGH priority so it lands first.
    loadOne(0, "high")
      .then((firstFrame) => {
        if (cancelled) return;
        setReady(true);

        // Schedule the Skip-button reveal at 15s — only if frames haven't
        // already finished by then (the recommendation is "wait", but for
        // users on terrible connections we don't want to hold them hostage).
        const skipTimer = window.setTimeout(() => {
          if (loaded < totalToLoad) setSkipVisible(true);
        }, 15_000);

        // ────── Wire up canvas + scroll handler the moment frame 1 lands ──────
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
        const POSITION_Y_BIAS = 0.35;
        const drawFrame = (frame: HTMLImageElement, progress = 0) => {
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          const fA = frame.naturalWidth / frame.naturalHeight;
          const cA = w / h;
          let dw, dh, dx, dy;

          // Cover-fit on both breakpoints (image always fills the whole
          // canvas).
          //
          // Desktop vertical anchor is a *scroll-linked pan* across the
          // taller-than-canvas image:
          //     dy = (h − dh) × progress
          //   progress = 0  →  dy = 0          (top of frame at top of
          //                                     canvas — sky visible)
          //   progress = 1  →  dy = h − dh     (bottom of frame at
          //                                     bottom of canvas —
          //                                     continuation visible)
          //   Anything in-between is a smooth pan down through the
          //   image as the user scrubs. So the scroll drives BOTH the
          //   frame index AND a camera-style vertical pan, doubling
          //   the sense of motion through the hero.
          //
          // Mobile keeps POSITION_Y_BIAS (0.35) — the canvas is only
          // 65 vh tall and the scrub-linked pan reads as jitter at
          // that height.
          const isDesktop = window.innerWidth >= 768;
          if (fA > cA) {
            dh = h;
            dw = h * fA;
            dx = (w - dw) / 2;
            dy = 0;
          } else {
            dw = w;
            dh = w / fA;
            dx = 0;
            dy = isDesktop
              ? (h - dh) * progress
              : (h - dh) * POSITION_Y_BIAS;
          }

          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(frame, dx, dy, dw, dh);
        };

        setCanvasSize();
        let currentIndex = 0;
        drawFrame(firstFrame);

        // Background-load the rest at low priority. As frames arrive, the
        // scroll handler picks them up via nearest-loaded fallback. When the
        // final one lands we automatically dismiss the loader.
        const restPromises: Promise<HTMLImageElement>[] = [];
        for (let i = 1; i < totalToLoad; i++) {
          restPromises.push(loadOne(i, "low").catch(() => firstFrame));
        }
        Promise.all(restPromises).then(() => {
          if (cancelled) return;
          window.clearTimeout(skipTimer);
          setLoaderVisible(false);
        });

        // Nearest-loaded fallback: when the scroll handler wants frame N
        // but it hasn't arrived yet, find the closest one that has.
        const nearestLoaded = (target: number): HTMLImageElement | undefined => {
          if (frames[target]) return frames[target];
          for (let off = 1; off < totalToLoad; off++) {
            const lo = target - off;
            const hi = target + off;
            if (lo >= 0 && frames[lo]) return frames[lo];
            if (hi < totalToLoad && frames[hi]) return frames[hi];
          }
          return frames[0]; // ultimate fallback
        };

        resizeHandler = () => {
          setCanvasSize();
          const f = nearestLoaded(currentIndex);
          // Pass current displayedProgress so the bottom-anchor pan
          // stays put across resizes instead of snapping to top.
          if (f) drawFrame(f, displayedProgress);
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
            totalToLoad - 1,
            Math.floor(p * (totalToLoad - 1)),
          );
          // Re-draw every tick — even when the frame index hasn't
          // changed — because the desktop pan needs to update with
          // sub-frame progress (dy depends on p continuously).
          currentIndex = target;
          const f = nearestLoaded(target);
          if (f) drawFrame(f, p);
          // Overlay deepens with scroll. No text element to fade — the source
          // video has the band name + branding baked in already.
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
          framesLoadedSoFar: () => loaded,
          framesTotal: totalToLoad,
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
        console.error("[HeroSequence] frame-1 load failed:", e);
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
      {/*
        Sticky child is full viewport on every breakpoint, so the canvas
        AND the mobile teaser strip below it are pinned together for the
        entire scrub. On mobile the canvas occupies the top 65% of the
        sticky area; the bottom 35% holds the teaser content, both
        locked in place — they enter together when the hero starts
        pinning, and exit together when it unpins ("locked in the video
        area + a little pull").
        Desktop fills the canvas to full viewport (no teaser shown).
      */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[var(--color-bg)]">
        <canvas
          ref={canvasRef}
          className="absolute inset-x-0 top-0 h-[65vh] w-full md:h-full"
          aria-hidden
        />
        <div
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/85 opacity-65"
        />

        {/*
          Teaser is rendered AFTER the dimming overlay so it paints on top
          of it. With explicit z-10 too in case any future ref styling on
          the overlay changes stacking. Why this matters: the overlay's
          to-black/85 bottom-stop was darkening the teaser text (turning
          "כל השירים" muddy at end-of-scrub). The overlay still does its
          job — dimming the canvas underneath the text for legibility —
          but no longer washes the text itself.
        */}
        {mobileTeaser && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-[35vh] flex-col items-end justify-center px-5 pb-8 text-right md:hidden"
            aria-hidden
          >
            {mobileTeaser}
          </div>
        )}

        {/*
          Full-page loading overlay — covers the entire site (including Nav,
          sections below) via fixed inset-0 + high z-index. Fades out the
          moment all frames are loaded, or when the user clicks Skip after
          the 15-second mark.

          Rendered inside HeroSequence (rather than at the layout level) so
          it only exists for users actually doing the heavy hero load —
          fallback Hero users never see it.

          AnimatePresence handles the fade-out animation; framer-motion
          inside <SiteLoader/> handles body scroll-lock + content.
        */}
        <SiteLoader
          visible={loaderVisible}
          progress={progress}
          showSkip={skipVisible}
          onSkip={() => setLoaderVisible(false)}
        />

        {/* Scroll cue only — band name removed so the video's own typography reads cleanly */}
        {/* Scroll cue — hidden on mobile when teaser takes the bottom area */}
        <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[var(--color-muted-fg)] md:flex">
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.4em]">גלגל למטה</span>
          <span aria-hidden className="block h-10 w-px animate-pulse bg-[var(--color-accent)]" />
        </div>
      </div>
    </section>
  );
}
