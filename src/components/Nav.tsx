"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

/**
 * Sticky top nav. Background goes from transparent → solid as user scrolls
 * past the hero. Anchor clicks rely on the browser's smooth-scroll (Lenis
 * picks up on standard anchor navigation in most cases — if not, we can
 * intercept).
 *
 * Mobile: shows compact horizontal links (4 items fit comfortably in Hebrew).
 */
const LINKS = [
  { href: "#hero", label: "ראשי" },
  { href: "#music", label: "מוזיקה" },
  { href: "#about", label: "אודות" },
  { href: "#collab-contact", label: "שיתופי פעולה" },
];

export function Nav() {
  // scrolled — has the user scrolled past the very top (drives the
  //   transparent → solid background swap).
  // revealed — has the user scrolled past the hero scrub (150 vh).
  //   We start hidden so the fixed nav doesn't cover the top of the
  //   hero video on first load. After 150 vh of scroll the scrub has
  //   completed, the user has "seen the opening," and the nav slides
  //   down from above the viewport into place.
  const [scrolled, setScrolled] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const sy = window.scrollY;
      setScrolled(sy > 80);
      // 150 vh matches the hero's SCRUB_VH — i.e. the moment the frame
      // sequence reaches its last frame. Threshold reads window.innerHeight
      // on every tick so it tracks browser resizes correctly.
      setRevealed(sy >= window.innerHeight * 1.5);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <nav
      className={clsx(
        "fixed inset-x-0 top-0 z-[90] border-b-2 transition-all duration-500",
        // Hide until the hero scrub finishes — slide above viewport with
        // a fade so it isn't just a hard cut. pointer-events-none while
        // hidden so links can't be tabbed into during the opening.
        revealed
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-full opacity-0",
        scrolled
          ? "border-[var(--color-border-strong)] bg-[var(--color-bg)]/90 backdrop-blur-md"
          : "border-transparent bg-[var(--color-bg)]/55 backdrop-blur-sm",
      )}
      aria-label="ניווט ראשי"
      aria-hidden={!revealed}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8 md:py-4">
        <a
          href="#hero"
          className="shine-text font-[var(--font-display-he)] text-xl font-black leading-none tracking-tight md:text-2xl"
          aria-label="משפחת קליבר — לראש הדף"
        >
          משפחת קליבר
        </a>
        <ul className="flex items-center gap-3 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.18em] md:gap-7 md:text-xs">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-[var(--color-fg)] transition-colors duration-150 hover:text-[var(--color-accent)] focus-visible:text-[var(--color-accent)] outline-none"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
