"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useScroll } from "framer-motion";

/**
 * Trigger-based "stage curtain" reveal — discrete open/close, NOT
 * scroll-linked.
 *
 * The yellow CALIBER panels stay shut until the photo is almost fully
 * in the viewport. At that point they animate apart in one motion
 * (top slides up, bottom slides down, both tilt slightly). They stay
 * open as long as the photo is in the main viewing area, then animate
 * back together BEFORE the photo scrolls off the top — so you see the
 * curtain re-close on the way out, the same way you saw it open on the
 * way in.
 *
 * Implementation: useScroll gives a continuous progress 0..1 as the
 * photo traverses the viewport (offset start-end → end-start).
 * A subscription to that motion value flips a boolean state when
 * progress crosses OPEN_AT going up (curtain opens) and crosses
 * CLOSE_AT going down (curtain closes). Framer Motion's animate prop
 * handles the actual transition each way.
 *
 * Window: [0.35, 0.75]
 *   0.35 — photo's upper third has just entered the viewport, almost
 *          fully visible. Open.
 *   0.75 — photo's bottom third has just exited the viewport, photo
 *          about to disappear off the top. Closed again.
 *
 * The transition is 0.8 s with a strong ease-out curve — the panels
 * "snap" away decisively rather than scrubbing slowly with scroll,
 * which is what gave the previous version its "opens too eagerly"
 * feel.
 */
// Tight, symmetric window — for a photo that fits inside the viewport
// (which the square AboutPhoto does on every realistic breakpoint),
// progress between 0.4 and 0.6 means the photo is fully visible.
//
// Why symmetric: previous [0.35, 0.75] felt fine going DOWN (open at
// 0.35 ≈ 80% visible) but eager going UP — that direction triggers off
// CLOSE_AT, so the curtain was opening at progress 0.75 with only ~65%
// of the photo in view. Equalising the thresholds around 0.5 makes the
// open trigger fire at roughly the same visibility level in either
// scroll direction.
const OPEN_AT = 0.4;
const CLOSE_AT = 0.6;

export function AboutPhoto({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const compute = (v: number) => v >= OPEN_AT && v <= CLOSE_AT;
    setIsOpen(compute(scrollYProgress.get()));
    const unsub = scrollYProgress.on("change", (v) => {
      const next = compute(v);
      setIsOpen((prev) => (prev === next ? prev : next));
    });
    return unsub;
  }, [scrollYProgress]);

  const TRANSITION = {
    duration: 0.8,
    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
  };

  return (
    <div
      ref={ref}
      className="relative aspect-square w-full overflow-hidden border-2 border-[var(--color-border-strong)]"
    >
      {/* Photo */}
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 90vw, 40vw"
        className="object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />

      {/* TOP curtain half — slides UP when open, returns when closed */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 overflow-hidden bg-[var(--color-accent)]"
        initial={{ y: "0%", rotate: 0 }}
        animate={{ y: isOpen ? "-110%" : "0%", rotate: isOpen ? -2 : 0 }}
        transition={TRANSITION}
        style={{ willChange: "transform" }}
      >
        <span className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-[var(--font-display-en)] text-[14vw] font-bold uppercase leading-none tracking-[-0.04em] text-black md:text-[5.5vw]">
          CALIBER
        </span>
      </motion.div>

      {/* BOTTOM curtain half — slides DOWN when open, returns when closed */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 overflow-hidden bg-[var(--color-accent)]"
        initial={{ y: "0%", rotate: 0 }}
        animate={{ y: isOpen ? "110%" : "0%", rotate: isOpen ? 2 : 0 }}
        transition={TRANSITION}
        style={{ willChange: "transform" }}
      >
        <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-[var(--font-display-en)] text-[14vw] font-bold uppercase leading-none tracking-[-0.04em] text-black md:text-[5.5vw]">
          CALIBER
        </span>
      </motion.div>
    </div>
  );
}
