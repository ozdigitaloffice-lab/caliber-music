"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Mobile-only title strip locked under each sticky video (HeroSequence /
 * EnvelopeSequence). Two layered animations:
 *
 *   1. Entrance — 3D tilt + slide up the first time the strip enters the
 *      viewport. `viewport.once: false` so it re-plays on scroll-back as
 *      well, matching the rhythm of the desktop RevealHeading reveals.
 *
 *   2. Scroll-linked brightness — while the user is mid-scrub through the
 *      parent section, the title interpolates from a faded slate gray
 *      (rgb 113,113,122 @ 40% opacity) to full white with a soft yellow
 *      glow (up to 22px text-shadow). The further the scrub progresses,
 *      the more "lit" the title looks, so the section being teased feels
 *      like it's powering up as the user pushes toward it. Easing is
 *      front-loaded toward the back half of the scrub so most of the
 *      brightening lands right before the next section reveals.
 *
 * Why measure progress manually instead of useScroll: the teaser lives
 * *inside* an `absolute` element that's pinned by `position: sticky` on
 * its ancestor. While pinned, the teaser's own bounding box does not move
 * relative to the viewport, so useScroll on its ref would report constant
 * progress for the entire scrub. Walking up to the nearest <section>
 * ancestor (the long scroll container) and measuring its top edge gives
 * us the real scrub position without prop-drilling refs through the sticky
 * components.
 */
export function MobileTeaserTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let section: HTMLElement | null = node;
    while (section && section.tagName !== "SECTION") {
      section = section.parentElement;
    }
    if (!section) return;
    const sectionEl = section;

    const onScroll = () => {
      const rect = sectionEl.getBoundingClientRect();
      const vh = window.innerHeight;
      // Progress through the pin range:
      //   rect.top =  0                       → 0  (pin just started)
      //   rect.top = -(rect.height - vh)     → 1  (pin about to end)
      const pinTravel = rect.height - vh;
      if (pinTravel <= 0) return;
      const traversed = -rect.top;
      const p = Math.max(0, Math.min(1, traversed / pinTravel));
      setProgress(p);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Ease-in-out quadratic: weights the back half of the scrub so most of
  // the color/glow change happens right before the next section reveals.
  const eased =
    progress < 0.5
      ? 2 * progress * progress
      : -1 + (4 - 2 * progress) * progress;

  // Interpolate from faded slate (#71717A @ 0.4) → full white (#FAFAFA @ 1).
  // (Tried ramping into accent yellow at the end; user feedback was that
  // the visible darkening on "כל השירים" came from a dark gradient overlay
  // sitting on top of the teaser in HeroSequence — not from a weak end
  // state — so we stay in clean white here and fix the darkening by
  // lifting the teaser above that overlay instead.)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const opacity = lerp(0.4, 1, eased);
  const r = Math.round(lerp(0x71, 0xfa, eased));
  const g = Math.round(lerp(0x71, 0xfa, eased));
  const b = Math.round(lerp(0x7a, 0xfa, eased));
  const color = `rgb(${r}, ${g}, ${b})`;
  const glowPx = lerp(0, 22, eased);
  const glowAlpha = 0.6 * eased;
  // .toFixed(3) on the dynamic numbers so SSR and client agree to the
  // same string for hydration — matches the pattern used in SongsSpiral.
  const textShadow = `0 0 ${glowPx.toFixed(3)}px rgba(223, 225, 4, ${glowAlpha.toFixed(
    3,
  )})`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, rotateX: -22, y: 26 }}
      whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
      viewport={{ once: false, amount: 0.4 }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      style={{
        transformPerspective: 900,
        transformOrigin: "center bottom",
      }}
    >
      <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.4em] text-[var(--color-accent)]">
        {eyebrow}
      </p>
      <h2
        className="mt-2 font-[var(--font-display-he)] text-5xl font-black leading-[0.9]"
        style={{ color, opacity, textShadow }}
      >
        {title}
      </h2>
    </motion.div>
  );
}
