"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import type { Song } from "@/lib/songs";

/**
 * 3D helix of every song's album artwork — section closer placed after the
 * stats strip and before the bottom marquee.
 *
 * The motion is a "screw turning": each cover continuously crawls upward
 * along the helical path, wraps from the top edge back around to the
 * bottom, and re-emerges. Because the y position and the rotation around
 * the Y axis are both derived from a single per-cover `t` value
 * (`angle = t * REV * 2π`, `y = -H/2 + t * H`), one continuously-advancing
 * time offset produces both effects in lockstep — the helix appears to
 * rotate AND translate at exactly the rate of a turning screw.
 *
 * Bouncing-ball pass on top: a glowing yellow sphere walks the discography
 * in order, hopping cover-to-cover. Because the covers themselves are
 * moving, the ball re-samples the target cover's current position every
 * frame during both dwell and hop — so it lands pixel-perfect even when
 * the target has drifted under it.
 *
 * Edge fade: when a cover's `t` is within FADE of either edge, its opacity
 * is linearly faded to 0. The wrap from t≈0 to t≈1 happens while the
 * cover is fully invisible, so the visual is "fades out at top, fades
 * back in at bottom" rather than a teleport. Ball uses the max of source
 * and target cover opacity so it never disappears mid-hop.
 *
 * Architectural split, per cover:
 *   - **outer <div>** — owns position (translate3d) and opacity. Set
 *     imperatively by the rAF loop every frame. No React style for these
 *     after the initial render-time defaults.
 *   - **inner <a>** — owns border / box-shadow / scale, driven by React
 *     state (landedIndex / hoveredIndex). CSS transition makes them
 *     animate smoothly. React re-renders never touch the outer transform
 *     so there's no flash when state changes.
 *
 * Hydration: all transform numbers go through `.toFixed(3)` so the SSR
 * stringification matches what React produces on the client.
 */
export function SongsSpiral({ songs }: { songs: Song[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const coverRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ballRef = useRef<HTMLDivElement>(null);

  // Scroll-driven X-tilt and scale (unchanged from before)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [-30, 0, 30]);
  const containerScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1, 0.85]);
  const smoothRotateX = useSpring(rotateX, { stiffness: 60, damping: 22 });
  const smoothScale = useSpring(containerScale, { stiffness: 60, damping: 22 });

  // ────── Breakpoint detection ──────
  // The spiral was sized for mobile and looked lost on large desktops
  // (a tiny jewel floating in the middle of a 1900px-wide section). At
  // md+ we scale every geometric constant up so the helix fills more of
  // the available canvas without crowding the section padding.
  //
  // Server + first-client render both use the mobile defaults (so SSR
  // hydration matches). The matchMedia listener flips to desktop sizes
  // on mount; subsequent resizes between breakpoints also re-trigger.
  // The render-loop's effect depends on `isDesktop`, so its closure
  // captures the right geometry after each switch.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // ────── Geometry ──────
  // Desktop is intentionally wider and shorter than mobile (RADIUS up,
  // HEIGHT down): on a large monitor the spiral reads better as a
  // landscape-oriented spread than a tall column. The cover/ball/arc
  // sizes stay the same as the previous desktop tuning — only the
  // overall footprint changes shape.
  const N = songs.length;
  const REVOLUTIONS = 1.6;
  const RADIUS = isDesktop ? 280 : 150;
  const HEIGHT = isDesktop ? 420 : 380;
  const COVER = isDesktop ? 128 : 88;
  const BALL = isDesktop ? 26 : 18;
  const ARC_HEIGHT = isDesktop ? 60 : 40;
  // Perspective bumped slightly (1500 → 1600) to keep the front/back
  // size delta similar now that the z-range is wider (±280 vs ±240).
  const PERSPECTIVE = isDesktop ? 1600 : 1100;

  // ────── Timings ──────
  // 75s per full thread cycle = each cover takes 75s to travel from the
  // bottom edge of the helix back around to the bottom edge again. At
  // REVOLUTIONS=1.6 that's a rotation period of 75/1.6 ≈ 47s per full
  // turn around Y — slightly slower than the previous CSS spin (40s),
  // which keeps the helix from feeling rushed now that covers are also
  // translating vertically.
  const SCREW_PERIOD_MS = 75000;
  const HOP_MS = 700;
  const DWELL_MS = 700;
  // Edge fade: 6% of the t-range on each end. Keep small so most of the
  // helix stays at full opacity; large enough that the wrap from t≈0 to
  // t≈1 is invisible.
  const FADE = 0.06;

  const r = (n: number) => n.toFixed(3);

  // Position on the helix at any t ∈ [0,1].
  const positionAt = (t: number) => {
    const angle = t * REVOLUTIONS * Math.PI * 2;
    return {
      x: Math.cos(angle) * RADIUS,
      y: -HEIGHT / 2 + t * HEIGHT,
      z: Math.sin(angle) * RADIUS,
    };
  };

  // Opacity at any t — linear fade in the FADE band at each edge.
  const opacityAt = (t: number) => {
    if (t < FADE) return t / FADE;
    if (t > 1 - FADE) return (1 - t) / FADE;
    return 1;
  };

  // Each cover's current t given the screw offset. Subtracting screwT
  // (rather than adding) makes the covers travel UPWARD as time advances
  // — matches the requested "bottom → top" direction.
  const tForIdx = (i: number, screwT: number) => {
    if (N <= 1) return 0.5;
    return ((i / (N - 1)) - screwT + 1) % 1;
  };

  // ────── React state for visual effects (border / shadow / scale) ──────
  // landedIndex: which cover the ball is currently resting on (-1 = in flight)
  // hoveredIndex: which cover the user is pointing at / focused on (-1 = none)
  // A cover lights up if EITHER is true.
  const [landedIndex, setLandedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  // Mirror hoveredIndex to a ref so the rAF loop can read it without
  // having to re-create the loop on every hover change.
  const hoveredRef = useRef(-1);
  useEffect(() => {
    hoveredRef.current = hoveredIndex;
  }, [hoveredIndex]);

  // ────── The render loop ──────
  useEffect(() => {
    if (N === 0) return;
    let rafId = 0;
    let lastFrame = performance.now();
    let lastBallChange = lastFrame;
    let screwT = 0;
    let stage: "dwell" | "hop" = "dwell";
    let fromIdx = 0;
    let toIdx = 0;
    let arcFromPos = positionAt(tForIdx(0, 0));

    const tick = (t: number) => {
      // Clamp dt so backgrounded tabs don't burst-advance the screw
      const dt = Math.min(50, t - lastFrame);
      lastFrame = t;

      // Pause the screw motion while the user is hovering, so they have
      // time to read the title and click without chasing a moving target.
      if (hoveredRef.current === -1) {
        screwT = (screwT + dt / SCREW_PERIOD_MS) % 1;
      }

      // Position + opacity for every cover
      for (let i = 0; i < N; i++) {
        const el = coverRefs.current[i];
        if (!el) continue;
        const tEff = tForIdx(i, screwT);
        const pos = positionAt(tEff);
        const op = opacityAt(tEff);
        el.style.transform = `translate3d(${r(pos.x)}px, ${r(pos.y)}px, ${r(pos.z)}px)`;
        el.style.opacity = r(op);
      }

      // Ball state machine
      const elapsed = t - lastBallChange;

      if (stage === "dwell") {
        if (elapsed >= DWELL_MS) {
          // Transition: dwell → hop
          stage = "hop";
          lastBallChange = t;
          fromIdx = toIdx;
          toIdx = (toIdx + 1) % N;
          arcFromPos = positionAt(tForIdx(fromIdx, screwT));
          setLandedIndex(-1);
        } else {
          // Follow toIdx's current position (it's moving with the screw)
          const pos = positionAt(tForIdx(toIdx, screwT));
          const op = opacityAt(tForIdx(toIdx, screwT));
          if (ballRef.current) {
            ballRef.current.style.transform = `translate3d(${r(pos.x)}px, ${r(pos.y)}px, ${r(pos.z)}px)`;
            ballRef.current.style.opacity = r(op);
          }
        }
      } else {
        // Hop in flight: lerp source → current target (re-sampled each
        // frame so the ball still lands on the cover after it drifts).
        const progress = Math.min(1, elapsed / HOP_MS);
        const targetNow = positionAt(tForIdx(toIdx, screwT));
        const lerpX = arcFromPos.x + (targetNow.x - arcFromPos.x) * progress;
        const lerpY = arcFromPos.y + (targetNow.y - arcFromPos.y) * progress;
        const lerpZ = arcFromPos.z + (targetNow.z - arcFromPos.z) * progress;
        // Sine bump in screen-Y for the "up and over" parabolic arc
        const arcOff = -ARC_HEIGHT * Math.sin(Math.PI * progress);
        // Ball opacity: max of source/target so it stays visible during
        // a wrap-crossing hop.
        const sourceOp = opacityAt(tForIdx(fromIdx, screwT));
        const targetOp = opacityAt(tForIdx(toIdx, screwT));
        const op = Math.max(sourceOp, targetOp);
        if (ballRef.current) {
          ballRef.current.style.transform = `translate3d(${r(lerpX)}px, ${r(lerpY + arcOff)}px, ${r(lerpZ)}px)`;
          ballRef.current.style.opacity = r(op);
        }
        if (progress >= 1) {
          stage = "dwell";
          lastBallChange = t;
          setLandedIndex(toIdx);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // Re-mount the loop when the breakpoint flips so its closure picks
    // up the new geometry (RADIUS / HEIGHT / etc.). N change is also
    // a re-mount trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N, isDesktop]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center py-16 md:py-20"
      style={{ perspective: `${PERSPECTIVE}px` }}
    >
      <motion.div
        className="relative h-[440px] w-[280px] md:h-[600px] md:w-[720px]"
        style={{
          transformStyle: "preserve-3d",
          rotateX: smoothRotateX,
          scale: smoothScale,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {songs.map((song, i) => {
            // Initial render uses screwT=0 → same positions as the old
            // static helix. The rAF loop takes over from frame 1, so a
            // moment-zero flash, if any, is just the legacy layout.
            const initT = N <= 1 ? 0.5 : i / (N - 1);
            const initPos = positionAt(initT);
            const initOp = opacityAt(initT);
            const isLanded = i === landedIndex;
            const isHovered = i === hoveredIndex;
            const isLit = isLanded || isHovered;
            const scaleAmount = isHovered ? 1.18 : isLanded ? 1.15 : 1;

            return (
              <div
                ref={(el) => {
                  coverRefs.current[i] = el;
                }}
                key={song.title}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: `${COVER}px`,
                  height: `${COVER}px`,
                  marginLeft: `-${COVER / 2}px`,
                  marginTop: `-${COVER / 2}px`,
                  transform: `translate3d(${r(initPos.x)}px, ${r(initPos.y)}px, ${r(initPos.z)}px)`,
                  opacity: r(initOp),
                  willChange: "transform, opacity",
                  transformStyle: "preserve-3d",
                }}
              >
                <a
                  href={song.spotify.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`${song.title} ב-Spotify`}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() =>
                    setHoveredIndex((h) => (h === i ? -1 : h))
                  }
                  onFocus={() => setHoveredIndex(i)}
                  onBlur={() =>
                    setHoveredIndex((h) => (h === i ? -1 : h))
                  }
                  className="block h-full w-full overflow-hidden border-2 transition-[border-color,box-shadow,transform] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  style={{
                    borderColor: isLit
                      ? "var(--color-accent)"
                      : "var(--color-border-strong)",
                    boxShadow: isLit
                      ? "0 12px 32px rgba(0, 0, 0, 0.55), 0 0 36px rgba(223, 225, 4, 0.75)"
                      : "0 12px 32px rgba(0, 0, 0, 0.55), 0 0 16px rgba(223, 225, 4, 0.15)",
                    transform: `scale(${scaleAmount})`,
                  }}
                >
                  <img
                    src={song.artwork}
                    alt={song.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </a>
              </div>
            );
          })}

          {/*
            Bouncing 3D ball. Built to read as a sphere:
              - radial-gradient hotspot at (32%, 28%) suggests a light source
              - inset bottom-right shadow gives the terminator (curved edge)
              - inset top-left highlight makes the bright spot read as raised
              - 14/32/60 px outer halo for emissive glow + cast onto covers
          */}
          <div
            ref={ballRef}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: `${BALL}px`,
              height: `${BALL}px`,
              marginLeft: `-${BALL / 2}px`,
              marginTop: `-${BALL / 2}px`,
              transform: `translate3d(${r(positionAt(0).x)}px, ${r(positionAt(0).y)}px, ${r(positionAt(0).z)}px)`,
              willChange: "transform, opacity",
              background:
                "radial-gradient(circle at 32% 28%, #fffce0 0%, #f6f74a 18%, #DFE104 52%, #8b8c00 100%)",
              boxShadow: [
                "inset -2px -3px 5px rgba(0, 0, 0, 0.45)",
                "inset 1px 2px 3px rgba(255, 255, 255, 0.25)",
                "0 0 14px rgba(223, 225, 4, 0.85)",
                "0 0 32px rgba(223, 225, 4, 0.55)",
                "0 0 60px rgba(223, 225, 4, 0.25)",
              ].join(", "),
            }}
          />
        </div>
      </motion.div>

      {/* Bottom caption — prefers hovered title, falls back to ball's landed */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-1 md:bottom-6">
        <div className="h-5 md:h-6">
          <AnimatePresence mode="wait">
            {(() => {
              const captionIndex =
                hoveredIndex >= 0 ? hoveredIndex : landedIndex;
              if (captionIndex < 0) return null;
              return (
                <motion.span
                  key={songs[captionIndex].title}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="block font-[var(--font-display-he)] text-sm font-black text-[var(--color-accent)] md:text-base"
                  style={{ textShadow: "0 0 18px rgba(223, 225, 4, 0.45)" }}
                >
                  {songs[captionIndex].title}
                </motion.span>
              );
            })()}
          </AnimatePresence>
        </div>
        <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.5em] text-[var(--color-muted-fg)] md:text-xs">
          · CALIBER FAMILY · DISCOGRAPHY ·
        </span>
      </div>
    </div>
  );
}
