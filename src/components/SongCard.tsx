"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import clsx from "clsx";
import type { Song } from "@/lib/songs";
import { formatDuration } from "@/lib/songs";
import { SpotifyIcon, AppleMusicIcon, YoutubeIcon } from "./PlatformIcons";

/**
 * Song tile with 3D mouse-tilt on hover. On click, calls onOpen(song) which
 * triggers the PlatformPicker modal in the parent.
 *
 * Variants: "lg" (hero tiles, square) and "md" (grid tiles, square). Smaller
 * tiles still get the tilt — only the typography scales.
 */
export function SongCard({
  song,
  size = "md",
  onOpen,
}: {
  song: Song;
  size?: "lg" | "md";
  onOpen: (s: Song) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const mx = useMotionValue(0); // -0.5 ... 0.5
  const my = useMotionValue(0);
  // Spring-smoothed for the rotation; raw for translateZ glow
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 220, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 220, damping: 18 });

  const reset = () => {
    mx.set(0);
    my.set(0);
  };

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onClick={() => onOpen(song)}
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
        sizes={size === "lg" ? "(max-width: 768px) 90vw, 50vw" : "(max-width: 768px) 45vw, 25vw"}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        // Album artwork is non-trivial visual content; mark as priority for the first row only via prop usage outside.
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

      {/* Platform icon strip — top-left corner, shows which platforms the song is on */}
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

      {/* Hover: "Press to choose" overlay flood */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--color-accent)] opacity-0 mix-blend-multiply transition-opacity duration-200 group-hover:opacity-25" />
    </motion.button>
  );
}
