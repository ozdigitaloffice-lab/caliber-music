"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

/**
 * 3D helical spiral closer for the songs section. 72 acid-yellow dots
 * arranged in a vertical helix (3 full revolutions, ±90px radius), each
 * positioned with a `translate3d` so it sits in real 3D space. The
 * parent uses `perspective` + `transform-style: preserve-3d` so the
 * compositor renders the helix with depth — dots in the back of the
 * spiral appear smaller / behind dots in the front.
 *
 * Two motion layers:
 *   1. **Always-on slow spin** on the Y axis (32s per rotation). Keeps
 *      the element alive even when the page is idle.
 *   2. **Scroll-linked tilt + zoom** — as the user scrolls through the
 *      spiral's section, the helix tilts forward and slightly grows.
 *      Reads as the spiral "responding" to the user's presence.
 *
 * Designed to be a section closer for the song grid — a 3D punctuation
 * mark that says "this is the end of the discography."
 */
export function SongsSpiral() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll progress through the spiral's section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Tilt forward as user scrolls in (0 → -25deg), back as they leave
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [-30, 0, 30]);
  // Subtle scale in/out
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);
  // Spring-smooth both so wheel jumps don't judder the helix
  const smoothRotateX = useSpring(rotateX, { stiffness: 60, damping: 22 });
  const smoothScale = useSpring(scale, { stiffness: 60, damping: 22 });

  const DOTS = 72;
  const REVOLUTIONS = 3;
  const RADIUS = 95;
  const HEIGHT = 320; // total vertical span in px

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center py-14 md:py-20"
      style={{ perspective: "900px" }}
      aria-hidden
    >
      <motion.div
        className="relative h-[360px] w-[260px]"
        style={{
          transformStyle: "preserve-3d",
          rotateX: smoothRotateX,
          scale: smoothScale,
        }}
      >
        {/* Slow always-on Y-axis spin (CSS animation, not React state — zero JS cost) */}
        <div
          className="absolute inset-0 animate-[spiral-spin_32s_linear_infinite]"
          style={{ transformStyle: "preserve-3d" }}
        >
          {Array.from({ length: DOTS }).map((_, i) => {
            const t = i / (DOTS - 1);
            const angle = t * REVOLUTIONS * Math.PI * 2;
            const x = Math.cos(angle) * RADIUS;
            const z = Math.sin(angle) * RADIUS;
            const y = -HEIGHT / 2 + t * HEIGHT;
            // Dots near the ends fade slightly for a "comet trail" feel
            const opacity = 0.35 + 0.65 * (1 - Math.abs(t - 0.5) * 1.4);
            // Slightly larger dots in the middle of the helix
            const sizePx = 6 + 3 * (1 - Math.abs(t - 0.5) * 1.8);

            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 rounded-full bg-[var(--color-accent)]"
                style={{
                  width: `${sizePx}px`,
                  height: `${sizePx}px`,
                  marginLeft: `-${sizePx / 2}px`,
                  marginTop: `-${sizePx / 2}px`,
                  transform: `translate3d(${x}px, ${y}px, ${z}px)`,
                  opacity: Math.max(0.18, opacity),
                  boxShadow: "0 0 8px rgba(223, 225, 4, 0.45)",
                }}
              />
            );
          })}
        </div>
      </motion.div>

      {/* Mono label below the spiral — ties it to the brand */}
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center md:bottom-4">
        <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.5em] text-[var(--color-muted-fg)] md:text-xs">
          · CALIBER FAMILY ·
        </span>
      </div>
    </div>
  );
}
