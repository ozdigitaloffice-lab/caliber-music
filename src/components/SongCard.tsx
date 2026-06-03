"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import clsx from "clsx";
import type { Song } from "@/lib/songs";
import { formatDuration } from "@/lib/songs";
import { SpotifyIcon, AppleMusicIcon, YoutubeIcon } from "./PlatformIcons";

/**
 * Song tile with three coordinated motion layers:
 *
 *   1. **Pop-in entrance** — when the card scrolls into view it springs
 *      from scale 0.55 → 1.0 with a slight overshoot, opacity fades in
 *      alongside. "From the inside outward" feel from the scale spring;
 *      no clip-path so the album art is never visually hidden mid-flight.
 *
 *   2. **Scroll-linked parallax** — as the card travels through the
 *      viewport, it translates a few px vertically. Different cards use
 *      different magnitudes (varied by index) so the grid feels like an
 *      unsynchronised crowd, not a rigid sheet.
 *
 *   3. **Existing mouse-tilt + tap** — composed on the inner button via
 *      its own motion values so it doesn't fight the wrapper's parallax.
 *
 * Architecture: outer `<motion.div>` owns the parallax y; inner
 * `<motion.button>` owns the entrance + tilt + tap. Separate motion
 * elements means motion values can't collide.
 */
export function SongCard({
  song,
  size = "md",
  index = 0,
  onOpen,
}: {
  song: Song;
  size?: "lg" | "md";
  index?: number;
  onOpen: (s: Song) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // 3D mouse-tilt on hover (unchanged from before)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), {
    stiffness: 220,
    damping: 18,
  });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), {
    stiffness: 220,
    damping: 18,
  });

  // Scroll-linked parallax: tracks the wrapper's position through the
  // viewport. `start end` = wrapper top hits viewport bottom (progress 0);
  // `end start` = wrapper bottom hits viewport top (progress 1).
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start end", "end start"],
  });

  // Per-card parallax magnitude — varied so neighbouring cards drift at
  // different rates, breaking up any sense of grid rigidity. Cycles
  // through three magnitudes via (index % 3).
  const magnitude = 18 + (index % 3) * 7; // 18px, 25px, 32px
  // Cards translate from +mag to -mag as they pass through the viewport
  // (i.e. drift UP a little while the page scrolls down past them).
  const parallaxY = useTransform(scrollYProgress, [0, 1], [magnitude, -magnitude]);
  // Spring-smooth it so wheel-tick jumps don't read as judder.
  const smoothY = useSpring(parallaxY, { stiffness: 80, damping: 24, mass: 0.4 });

  // Staggered entrance delay (within a row of 4, then resets)
  const entryDelay = (index % 4) * 0.085;

  const reset = () => {
    mx.set(0);
    my.set(0);
  };

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <motion.div ref={wrapperRef} style={{ y: smoothY }}>
      <motion.button
        ref={btnRef}
        onMouseMove={onMove}
        onMouseLeave={reset}
        onClick={() => onOpen(song)}
        // Pop-in entrance: scale springs from a tiny size to full with a
        // touch of overshoot. No clip-path — that was making the album
        // art occasionally fail to repaint after the animation ended.
        initial={{ opacity: 0, scale: 0.55 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.15, margin: "0px 0px -10% 0px" }}
        transition={{
          opacity: { duration: 0.5, delay: entryDelay, ease: "easeOut" },
          scale: {
            type: "spring",
            stiffness: 150,
            damping: 16,
            mass: 0.7,
            delay: entryDelay,
          },
        }}
        style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
        whileTap={{ scale: 0.98 }}
        className={clsx(
          "group relative block aspect-square w-full overflow-hidden border-2 border-[var(--color-border-strong)] bg-[var(--color-muted)] text-right transition-colors",
          "hover:border-[var(--color-accent)] focus-visible:border-[var(--color-accent)]",
          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
          size === "lg" ? "" : "",
        )}
        aria-label={`${song.title} — בחר פלטפורמה להשמעה`}
      >
        <Image
          src={song.artwork}
          alt={`עטיפת אלבום: ${song.title}`}
          fill
          sizes={
            size === "lg"
              ? "(max-width: 768px) 90vw, 50vw"
              : "(max-width: 768px) 45vw, 25vw"
          }
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* Bottom gradient + title */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 md:p-4">
          <div className="min-w-0 text-right">
            <p className="font-[var(--font-mono)] text-[9px] uppercase tracking-[0.3em] text-[var(--color-accent)] md:text-[10px]">
              {formatDuration(song.durationSec)} · {song.releaseDate.slice(0, 4)}
            </p>
            <h3
              className={clsx(
                "mt-1 font-[var(--font-display-he)] font-black leading-[0.95] text-[var(--color-fg)] drop-shadow-md",
                size === "lg" ? "text-2xl md:text-4xl" : "text-base md:text-xl",
              )}
            >
              {song.title}
            </h3>
          </div>
        </div>

        {/* Platform icons appear on hover */}
        <div className="absolute left-2 top-2 flex gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="grid h-6 w-6 place-items-center bg-black/70 text-white">
            <SpotifyIcon className="h-3.5 w-3.5" />
          </span>
          <span className="grid h-6 w-6 place-items-center bg-black/70 text-white">
            <AppleMusicIcon className="h-3.5 w-3.5" />
          </span>
          {song.youtube && (
            <span className="grid h-6 w-6 place-items-center bg-black/70 text-white">
              <YoutubeIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </div>

        {/* Acid-yellow flood on hover */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--color-accent)] opacity-0 mix-blend-multiply transition-opacity duration-200 group-hover:opacity-25" />
      </motion.button>
    </motion.div>
  );
}
