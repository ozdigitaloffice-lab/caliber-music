"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Scroll-linked color emergence for the AboutSection band photo.
 *
 * Mapping from the photo's scroll position through the viewport:
 *
 *   distance-from-center   →  filter           opacity
 *   ─────────────────────────────────────────────────────
 *   0  (perfectly centred) →  full sat / 0 blur / 1.0
 *   0.5  (half way out)    →  ~85% / ~1px / ~0.9
 *   1  (just entering or   →  40% / 4px / 0.6
 *       just leaving)
 *
 * The fade is squared (d²) so the photo stays mostly sharp through the
 * middle of its scroll range and only really fades at the very edges —
 * the user spends most of the time "in focus" with a soft develop-in
 * at first sight and a matching dissolve as it scrolls away.
 *
 * useScroll target = the photo's own wrapper. offset ["start end", "end
 * start"] = progress 0 when the photo's BOTTOM touches the viewport
 * BOTTOM (first appearing), progress 1 when the photo's TOP touches
 * the viewport TOP (about to disappear above).
 */
export function AboutPhoto({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const filter = useTransform(scrollYProgress, (p) => {
    const t = Math.max(0, Math.min(1, p));
    const distance = Math.abs(t - 0.5) * 2; // 0 at centre, 1 at edges
    const fade = distance * distance;       // ease-in (soft falloff)
    const sat = (100 - fade * 60).toFixed(1);   // 100% → 40%
    const blur = (fade * 4).toFixed(2);         // 0px → 4px
    return `saturate(${sat}%) blur(${blur}px)`;
  });

  const opacity = useTransform(scrollYProgress, (p) => {
    const t = Math.max(0, Math.min(1, p));
    const distance = Math.abs(t - 0.5) * 2;
    const fade = distance * distance;
    return 1 - fade * 0.4; // 1.0 → 0.6
  });

  return (
    <motion.div
      ref={ref}
      className="relative aspect-square w-full overflow-hidden border-2 border-[var(--color-border-strong)]"
      style={{ filter, opacity, willChange: "filter, opacity" }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 90vw, 40vw"
        className="object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
    </motion.div>
  );
}
