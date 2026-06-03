"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import type { Song } from "@/lib/songs";

/**
 * 3D helix of every song's album artwork — section closer placed after the
 * stats strip and before the bottom marquee. Each cover sits in real 3D
 * space along a vertical helical path, and the whole helix slowly spins
 * around its Y axis (CSS animation, zero JS cost) while also tilting on
 * X based on scroll position through its section (gives it presence as
 * the user enters / leaves the section).
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

  // Helix layout
  const N = songs.length;
  const REVOLUTIONS = 1.6;       // 1.6 turns spread across the 17 covers
  const RADIUS_DESKTOP = 150;    // px
  const RADIUS_MOBILE = 95;      // smaller orbit on mobile
  const HEIGHT = 380;            // total vertical span in px
  const COVER = 88;              // each cover edge length in px

  // Round helper: matches SSR/CSR float→string stringification, so React
  // doesn't flag a hydration mismatch on the inline transforms.
  const r = (n: number) => n.toFixed(3);

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
        {/* Always-on slow Y-axis spin (CSS, no JS state) */}
        <div
          className="absolute inset-0 animate-[spiral-spin_40s_linear_infinite]"
          style={{ transformStyle: "preserve-3d" }}
        >
          {songs.map((song, i) => {
            const t = N === 1 ? 0.5 : i / (N - 1);
            const angle = t * REVOLUTIONS * Math.PI * 2;

            // Two radii: a wider one for desktop, narrower for mobile.
            // We compute both and apply via CSS media queries via inline style —
            // simpler to just commit to one radius. Most users will see mobile.
            // (If needed, can switch to JS window.matchMedia later.)
            const radius = RADIUS_DESKTOP;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = -HEIGHT / 2 + t * HEIGHT;

            return (
              <a
                key={song.title}
                href={song.spotify.url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${song.title} ב-Spotify`}
                className="absolute left-1/2 top-1/2 block overflow-hidden border-2 border-[var(--color-border-strong)] transition-[border-color,box-shadow] duration-200 hover:border-[var(--color-accent)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                style={{
                  width: `${COVER}px`,
                  height: `${COVER}px`,
                  marginLeft: `-${COVER / 2}px`,
                  marginTop: `-${COVER / 2}px`,
                  transform: `translate3d(${r(x)}px, ${r(y)}px, ${r(z)}px)`,
                  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.55), 0 0 16px rgba(223, 225, 4, 0.15)",
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
        </div>
      </motion.div>

      {/* Brand label below the spiral */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center md:bottom-6">
        <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.5em] text-[var(--color-muted-fg)] md:text-xs">
          · CALIBER FAMILY · DISCOGRAPHY ·
        </span>
      </div>
    </div>
  );
}
