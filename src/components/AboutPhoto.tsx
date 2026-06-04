"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Scroll-driven "stage curtain" reveal for the AboutSection band photo.
 *
 * Two yellow accent panels (top half + bottom half) cover the photo when
 * the section first comes into view. Stamped across the midline of the
 * two panels — straddling the seam — is the word "CALIBER" in bold
 * black display type, sized to dominate the frame.
 *
 * As the user scrolls the photo into the centre of the viewport, the
 * panels split like elevator doors:
 *   • top panel slides UP (-110% of its height) with a small −2°
 *     rotation around its centre — left edge tips up first
 *   • bottom panel slides DOWN (+110%) with a +2° rotation — right
 *     edge tips down first
 * The stamped word physically tears apart along its horizontal
 * midline — the eye reads the moment of separation, not just two
 * panels sliding off.
 *
 * Timing:
 *   progress 0       photo's bottom touches viewport bottom (entry)
 *   progress 0.10    curtain starts opening
 *   progress 0.55    curtain fully gone, photo fully revealed
 *   progress 1       photo centred in viewport
 * So by the time the user has the photo in front of them, the curtain
 * is a memory and the photo is the focus.
 *
 * pointer-events-none on the curtains so once they're off-screen they
 * can't trap stray clicks.
 */
export function AboutPhoto({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  // Reveal window: curtain stays shut for the first 55% of the scroll
  // (the period when the photo is just rising into view from the
  // bottom — user is still on their way to it). Opens between 0.55 and
  // 0.9, so the photo is fully revealed right as the user is
  // "arriving" at it. The tail (0.9 → 1.0) is just a beat with the
  // photo settled in view. User feedback: the previous timing
  // (0.10 → 0.55) was way too eager — the curtain was already opening
  // before they were even looking at the photo.
  const REVEAL_IN: [number, number] = [0.55, 0.9];
  const topY = useTransform(scrollYProgress, REVEAL_IN, ["0%", "-110%"]);
  const bottomY = useTransform(scrollYProgress, REVEAL_IN, ["0%", "110%"]);
  const topRotate = useTransform(scrollYProgress, REVEAL_IN, [0, -2]);
  const bottomRotate = useTransform(scrollYProgress, REVEAL_IN, [0, 2]);

  // Subtle Ken-Burns on the photo itself once the curtain is mostly out
  // of the way — gives the reveal a final breath instead of a hard cut.
  const photoScale = useTransform(scrollYProgress, [0.4, 1], [1.05, 1.0]);

  return (
    <div
      ref={ref}
      className="relative aspect-square w-full overflow-hidden border-2 border-[var(--color-border-strong)]"
    >
      {/* Photo (always present, just hidden behind the curtain initially) */}
      <motion.div className="absolute inset-0" style={{ scale: photoScale }}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 90vw, 40vw"
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
      </motion.div>

      {/*
        TOP curtain half — slides UP.
        The "CALIBER" stamp is absolutely positioned with its centre
        anchored at top: 100% of this half. That's the midline of the
        full curtain, where the two halves meet. Overflow-hidden on
        this half clips the bottom of the text, so only the TOP halves
        of the letters are visible here — and they ride up with the
        panel when it slides away.
      */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 overflow-hidden bg-[var(--color-accent)]"
        style={{ y: topY, rotate: topRotate, willChange: "transform" }}
      >
        <span
          className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-[var(--font-display-en)] text-[26vw] font-bold uppercase leading-none tracking-[-0.04em] text-black md:text-[14vw]"
        >
          CALIBER
        </span>
      </motion.div>

      {/*
        BOTTOM curtain half — slides DOWN.
        Mirror of the top: stamp centred on top: 0 of this half
        (= midline of the full curtain). Overflow clips the top of the
        letters, leaving only the BOTTOM halves visible here.
      */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 overflow-hidden bg-[var(--color-accent)]"
        style={{ y: bottomY, rotate: bottomRotate, willChange: "transform" }}
      >
        <span
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-[var(--font-display-en)] text-[26vw] font-bold uppercase leading-none tracking-[-0.04em] text-black md:text-[14vw]"
        >
          CALIBER
        </span>
      </motion.div>
    </div>
  );
}
