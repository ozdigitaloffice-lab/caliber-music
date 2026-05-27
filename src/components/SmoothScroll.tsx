"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Lenis smooth-scroll, integrated with GSAP ScrollTrigger.
 *
 * Critical: without the three integration lines below, ScrollTrigger doesn't
 * receive scroll updates from Lenis (Lenis takes over wheel events and
 * animates scroll position itself, so the native "scroll" event firing is
 * inconsistent). Symptom: scroll-driven animations (the hero scrub) appear
 * frozen — only the first frame ever renders.
 *
 * 1. `lenis.on('scroll', ScrollTrigger.update)` — every Lenis tick notifies
 *    ScrollTrigger of the new scroll position, so onUpdate callbacks fire.
 * 2. `gsap.ticker.add(...)` — drive Lenis' RAF loop from GSAP's ticker so
 *    they're in sync (no double-RAF jitter).
 * 3. `gsap.ticker.lagSmoothing(0)` — disables GSAP's lag-smoothing, which
 *    would otherwise pause Lenis when the tab is hidden + then jump it
 *    forward on resume.
 */
export function SmoothScroll() {
  useEffect(() => {
    // Respect reduced-motion users — skip Lenis entirely.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: 0.08,       // smoothness; lower = silkier, higher = snappier
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tickerCb = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tickerCb);
    gsap.ticker.lagSmoothing(0);

    // After mount, refresh ScrollTrigger so any triggers registered before
    // Lenis was wired up recompute their start/end positions.
    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(tickerCb);
      lenis.destroy();
    };
  }, []);

  return null;
}
