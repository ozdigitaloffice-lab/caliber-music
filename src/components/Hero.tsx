"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Sticky-pinned hero. As the user scrolls through 220vh of section height,
 * the YouTube video stays pinned to the viewport and transforms — it scales
 * down, darkens, and the band name overlay grows then fades. By the time
 * the user hits the next section, the hero gracefully unpins.
 *
 * This is the "video that moves with the screen" effect: the video doesn't
 * change content, but its position/scale/opacity react to scroll position.
 *
 * Reduced-motion users get a static layout (no scrub).
 */
export function Hero({ heroVideoId, bandName }: { heroVideoId: string; bandName: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!sectionRef.current || !videoWrapRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current!,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });

      // 0 → 1 progress: video scales down, overlay darkens
      tl.to(videoWrapRef.current, { scale: 0.78, ease: "none" }, 0);
      tl.to(overlayRef.current, { opacity: 0.92, ease: "none" }, 0);

      // Band name pushes up + fades as you scroll past
      tl.to(nameRef.current, { yPercent: -120, opacity: 0, ease: "none" }, 0);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-[220vh] w-full"
      aria-label="פתיח"
    >
      <div
        ref={stickyRef}
        className="sticky top-0 h-screen w-full overflow-hidden"
      >
        {/* Scaled, embedded YouTube video — autoplay muted loop, no controls */}
        <div
          ref={videoWrapRef}
          className="absolute inset-0 origin-center"
          style={{
            // Slightly larger than viewport so scaling-down never reveals empty edges.
            // Iframe uses 56.25% aspect; we let it overflow horizontally.
            transformOrigin: "50% 50%",
          }}
        >
          <iframe
            title="Caliber Family — clip"
            src={`https://www.youtube-nocookie.com/embed/${heroVideoId}?autoplay=1&mute=1&loop=1&playlist=${heroVideoId}&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&iv_load_policy=3`}
            allow="autoplay; encrypted-media; picture-in-picture"
            // Iframe must be larger than the viewport horizontally to fill 16:9 vs whatever aspect viewport has.
            className="pointer-events-none absolute left-1/2 top-1/2 h-[120vh] w-[214vh] max-w-none -translate-x-1/2 -translate-y-1/2 md:h-[110vh] md:w-[195vh]"
          />
        </div>

        {/* Darkening overlay — opacity scrubbed by GSAP */}
        <div
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/80 opacity-50"
        />

        {/* Band name big — also scrubs */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <h1
            ref={nameRef}
            className="font-[var(--font-display-he)] text-[18vw] font-black leading-[0.85] tracking-tight md:text-[14vw]"
            style={{ textShadow: "0 4px 32px rgba(0,0,0,0.6)" }}
          >
            {bandName}
          </h1>
          <p className="mt-4 font-[var(--font-mono)] text-xs uppercase tracking-[0.4em] text-[var(--color-accent)] md:text-sm">
            HIP-HOP · TRAP · URBAN
          </p>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[var(--color-muted-fg)]">
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.4em]">גלגל למטה</span>
          <span aria-hidden className="block h-10 w-px animate-pulse bg-[var(--color-accent)]" />
        </div>
      </div>
    </section>
  );
}
