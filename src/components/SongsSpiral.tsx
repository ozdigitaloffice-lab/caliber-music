"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import type { Song } from "@/lib/songs";

/**
 * 3D helix of every song's album artwork — section closer placed after the
 * stats strip and before the bottom marquee. Each cover sits in real 3D
 * space along a vertical helical path, and the whole helix slowly spins
 * around its Y axis (CSS animation, zero JS cost) while also tilting on
 * X based on scroll position through its section (gives it presence as
 * the user enters / leaves the section).
 *
 * The bouncing-ball pass on top: a glowing yellow sphere walks through the
 * discography in order, hopping from cover to cover in a small parabolic
 * arc. While it's resting on a cover, that cover glows yellow and scales
 * up, and the song's title fades in over the static brand caption below.
 * The ball lives *inside* the spinning container so the helix's CSS spin
 * carries it along — the ball never has to compensate for the rotation,
 * it just animates between the local-space positions we pre-computed for
 * the covers.
 *
 * Why album art and not abstract dots: the band has 17 singles with very
 * strong cover art — this is the "career-in-one-frame" punctuation that
 * dots can't deliver.
 *
 * Hydration: all transform numbers go through `.toFixed(3)` so the SSR
 * stringification matches what React produces on the client. Without
 * that, framer-motion's full-precision floats produced a hydration
 * mismatch on every dot/card.
 */
export function SongsSpiral({ songs }: { songs: Song[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll progress through the spiral's section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Tilt forward as it enters (−30°), flat at centre (0°), tilt back leaving (+30°)
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [-30, 0, 30]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1, 0.85]);
  // Spring-smooth so wheel jumps don't judder the helix
  const smoothRotateX = useSpring(rotateX, { stiffness: 60, damping: 22 });
  const smoothScale = useSpring(scale, { stiffness: 60, damping: 22 });

  // ────── Helix geometry ──────
  const N = songs.length;
  const REVOLUTIONS = 1.6; // 1.6 turns spread across the 17 covers
  const RADIUS = 150;      // px (shared mobile + desktop)
  const HEIGHT = 380;      // total vertical span in px
  const COVER = 88;        // cover edge length
  const BALL = 18;         // ball diameter
  const ARC_HEIGHT = 40;   // peak rise (in -Y) at midpoint of each hop
  const HOP_MS = 700;      // arc duration per hop
  const DWELL_MS = 600;    // pause on each cover

  // Round helper: matches SSR/CSR float→string stringification, so React
  // doesn't flag a hydration mismatch on the inline transforms.
  const r = (n: number) => n.toFixed(3);

  // Pre-compute each cover's local-space 3D position once. The ball reuses
  // these same positions as its hop targets, so it always lands exactly on
  // the rendered cover (no drift).
  const positions = useMemo(() => {
    return songs.map((_, i) => {
      const t = N === 1 ? 0.5 : i / (N - 1);
      const angle = t * REVOLUTIONS * Math.PI * 2;
      return {
        x: Math.cos(angle) * RADIUS,
        y: -HEIGHT / 2 + t * HEIGHT,
        z: Math.sin(angle) * RADIUS,
      };
    });
  }, [songs, N]);

  // ────── Bouncing ball state ──────
  // landedIndex: which cover the ball is currently resting on (-1 = in flight)
  const [landedIndex, setLandedIndex] = useState(0);
  const ballX = useMotionValue(positions[0]?.x ?? 0);
  const ballY = useMotionValue(positions[0]?.y ?? 0);
  const ballZ = useMotionValue(positions[0]?.z ?? 0);

  useEffect(() => {
    if (N === 0) return;
    let cancelled = false;
    let timeoutId: number | undefined;
    let i = 0;

    const wait = (ms: number) =>
      new Promise<void>((res) => {
        timeoutId = window.setTimeout(res, ms);
      });

    const hop = async () => {
      while (!cancelled) {
        const next = (i + 1) % N;
        const from = positions[i];
        const to = positions[next];
        // Parabolic arc: rise (-Y in screen space) at the midpoint of the
        // hop, then fall onto the target. The XZ path is a straight lerp;
        // only Y carries the bump. Keeping the arc in screen-Y rather
        // than in radial space means the hop reads as "up and over" from
        // every viewing angle of the spinning helix.
        const midY = (from.y + to.y) / 2 - ARC_HEIGHT;

        setLandedIndex(-1); // in flight — no cover should glow

        await Promise.all([
          animate(ballX, to.x, { duration: HOP_MS / 1000, ease: "easeInOut" }),
          animate(ballY, [from.y, midY, to.y], {
            duration: HOP_MS / 1000,
            times: [0, 0.5, 1],
            ease: "easeInOut",
          }),
          animate(ballZ, to.z, { duration: HOP_MS / 1000, ease: "easeInOut" }),
        ]);

        if (cancelled) return;
        i = next;
        setLandedIndex(next);

        await wait(DWELL_MS);
      }
    };

    hop();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      // Snap the motion values to a stable resting position to avoid
      // a partially-animated state lingering on the next mount.
      ballX.stop();
      ballY.stop();
      ballZ.stop();
    };
    // positions is memoised by [songs, N]; safe to depend on.
  }, [N, positions, ballX, ballY, ballZ]);

  // Compose the ball's translate3d string from the three motion values,
  // .toFixed(3) for hydration stability.
  const ballTransform = useTransform(
    [ballX, ballY, ballZ],
    ([x, y, z]) =>
      `translate3d(${(x as number).toFixed(3)}px, ${(y as number).toFixed(
        3,
      )}px, ${(z as number).toFixed(3)}px)`,
  );

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center py-16 md:py-24"
      style={{ perspective: "1100px" }}
    >
      <motion.div
        className="relative h-[440px] w-[280px] md:w-[360px]"
        style={{
          transformStyle: "preserve-3d",
          rotateX: smoothRotateX,
          scale: smoothScale,
        }}
      >
        {/* Always-on slow Y-axis spin (CSS, no JS state).
            Covers AND the bouncing ball both live inside this rotating
            container, so the CSS spin carries them together — no
            counter-rotation math needed. */}
        <div
          className="absolute inset-0 animate-[spiral-spin_40s_linear_infinite]"
          style={{ transformStyle: "preserve-3d" }}
        >
          {songs.map((song, i) => {
            const { x, y, z } = positions[i];
            const isLanded = i === landedIndex;

            return (
              <a
                key={song.title}
                href={song.spotify.url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${song.title} ב-Spotify`}
                className="absolute left-1/2 top-1/2 block overflow-hidden border-2 transition-[border-color,box-shadow,transform] duration-300 hover:border-[var(--color-accent)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                style={{
                  width: `${COVER}px`,
                  height: `${COVER}px`,
                  marginLeft: `-${COVER / 2}px`,
                  marginTop: `-${COVER / 2}px`,
                  transform: `translate3d(${r(x)}px, ${r(y)}px, ${r(
                    z,
                  )}px)${isLanded ? " scale(1.15)" : ""}`,
                  borderColor: isLanded
                    ? "var(--color-accent)"
                    : "var(--color-border-strong)",
                  boxShadow: isLanded
                    ? "0 12px 32px rgba(0, 0, 0, 0.55), 0 0 36px rgba(223, 225, 4, 0.75)"
                    : "0 12px 32px rgba(0, 0, 0, 0.55), 0 0 16px rgba(223, 225, 4, 0.15)",
                }}
              >
                {/* Plain <img> so we don't pay next/image overhead for a
                    decorative element; lazy-loaded so it doesn't compete
                    with above-the-fold album art. */}
                <img
                  src={song.artwork}
                  alt={song.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </a>
            );
          })}

          {/*
            The bouncing ball. Double-layered shadow: tight inner glow gives
            it the lit-bulb look; wide outer glow leaves a soft halo on
            whatever cover it lands on. Sits inside the spinning container
            so the helix rotation carries it along automatically.
          */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full bg-[var(--color-accent)]"
            style={{
              width: `${BALL}px`,
              height: `${BALL}px`,
              marginLeft: `-${BALL / 2}px`,
              marginTop: `-${BALL / 2}px`,
              transform: ballTransform,
              boxShadow:
                "0 0 14px rgba(223, 225, 4, 0.85), 0 0 32px rgba(223, 225, 4, 0.55), 0 0 60px rgba(223, 225, 4, 0.25)",
            }}
          />
        </div>
      </motion.div>

      {/* Bottom caption strip: dynamic current-song title fades over the
          static brand label so the user gets both context and live state. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-1 md:bottom-6">
        <div className="h-5 md:h-6">
          <AnimatePresence mode="wait">
            {landedIndex >= 0 && (
              <motion.span
                key={songs[landedIndex].title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="block font-[var(--font-display-he)] text-sm font-black text-[var(--color-accent)] md:text-base"
                style={{ textShadow: "0 0 18px rgba(223, 225, 4, 0.45)" }}
              >
                {songs[landedIndex].title}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.5em] text-[var(--color-muted-fg)] md:text-xs">
          · CALIBER FAMILY · DISCOGRAPHY ·
        </span>
      </div>
    </div>
  );
}
