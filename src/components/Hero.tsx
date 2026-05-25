"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Sticky-pinned hero. As the user scrolls through 220vh of section height,
 * the latest album artwork stays pinned to the viewport and transforms —
 * it scales down, darkens, and the band name overlay grows then fades. By
 * the time the user hits the next section, the hero gracefully unpins.
 *
 * The hero background was a YouTube embed in v1 but Google's bot-detection
 * was inconsistent; swapped to a static album image so it's bulletproof.
 * TODO: wire back a self-hosted .mp4 once we have one (Apple-style scrub).
 *
 * Reduced-motion users get a static layout (no scrub).
 */
export function Hero({ heroImage, bandName }: { heroImage: string; bandName: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!sectionRef.current || !imageWrapRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current!,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });

      // Ken-Burns-ish: cover starts slightly zoomed and tilted, settles + darkens
      tl.fromTo(
        imageWrapRef.current,
        { scale: 1.18, rotate: -1.5 },
        { scale: 0.92, rotate: 0, ease: "none" },
        0,
      );
      tl.to(overlayRef.current, { opacity: 0.95, ease: "none" }, 0);

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
        {/* Latest album artwork as backdrop — scales/rotates on scroll */}
        <div
          ref={imageWrapRef}
          className="absolute inset-0 origin-center"
          style={{ transformOrigin: "50% 50%" }}
        >
          <Image
            src={heroImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>

        {/* Darkening + vignette overlay — opacity scrubbed by GSAP */}
        <div
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/90 opacity-70"
        />

        {/* Band name big — also scrubs */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <h1
            ref={nameRef}
            className="font-[var(--font-display-he)] text-[18vw] font-black leading-[0.85] tracking-tight md:text-[14vw]"
            style={{ textShadow: "0 4px 32px rgba(0,0,0,0.7)" }}
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
