"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Full-page loading screen that blocks the site until the hero's video
 * frames finish downloading.
 *
 * Design (from user spec):
 * - Black background, acid-yellow accents — matches site brutalist look.
 * - Subtle grain overlay so the screen doesn't feel empty.
 * - Band name big.
 * - "המוזיקה שלנו בדרך אליכם" main message.
 * - Live progress bar (% of frames loaded).
 * - "שווה לחכות כמה שניות והאתר עולה" secondary message.
 * - Skip button + recommendation appear ONLY after 15s of waiting (the
 *   `showSkip` prop) — protects users on terrible connections without
 *   tempting fast users to skip a 2s wait.
 *
 * Body scroll is locked while visible so the user can't accidentally
 * scroll into half-loaded content.
 *
 * AnimatePresence fades the whole thing out cleanly (400ms) once
 * `visible` flips to false.
 */
export function SiteLoader({
  visible,
  progress,
  showSkip,
  onSkip,
}: {
  visible: boolean;
  progress: number;
  showSkip: boolean;
  onSkip: () => void;
}) {
  // Lock body scroll while the loader is showing — prevents content under
  // the overlay from scrolling if the user wheels through it.
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  const percent = Math.round(progress * 100);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="site-loader"
          role="status"
          aria-live="polite"
          aria-label={`טוען ${percent} אחוז`}
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[var(--color-bg)] px-6 text-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
        >
          {/* Subtle SVG grain — matches the persistent grain everywhere else */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
              backgroundSize: "180px 180px",
            }}
          />

          {/* Content stack */}
          <div className="relative flex flex-col items-center gap-7 md:gap-9">
            {/* Band name */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-[var(--font-display-he)] text-5xl font-black leading-[0.9] text-[var(--color-fg)] md:text-7xl"
              style={{ textShadow: "0 4px 32px rgba(223, 225, 4, 0.15)" }}
            >
              משפחת קליבר
            </motion.h1>

            {/* Main message */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="font-[var(--font-body)] text-base text-[var(--color-fg)] md:text-xl"
            >
              המוזיקה שלנו בדרך אליכם
            </motion.p>

            {/* Progress bar + percent */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex w-72 max-w-[80vw] flex-col items-center gap-2"
            >
              <div className="h-[3px] w-full overflow-hidden bg-[var(--color-border-strong)]">
                <div
                  className="h-full bg-[var(--color-accent)] transition-transform duration-200 ease-out"
                  style={{
                    transform: `scaleX(${progress})`,
                    transformOrigin: "right",
                  }}
                />
              </div>
              <div
                className="font-[var(--font-mono)] text-[10px] tabular-nums uppercase tracking-[0.4em] text-[var(--color-accent)]"
                aria-hidden
              >
                {percent}%
              </div>
            </motion.div>

            {/* Secondary message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="font-[var(--font-mono)] text-xs uppercase tracking-[0.3em] text-[var(--color-muted-fg)]"
            >
              שווה לחכות כמה שניות והאתר עולה
            </motion.p>

            {/* Skip button — appears after 15s with recommendation note */}
            <AnimatePresence>
              {showSkip && (
                <motion.div
                  key="skip"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mt-2 flex max-w-sm flex-col items-center gap-3"
                >
                  <p className="font-[var(--font-body)] text-sm leading-relaxed text-[var(--color-muted-fg)]">
                    ממליצים לחכות בשביל לראות את האתר באיכות הטובה ביותר
                  </p>
                  <button
                    type="button"
                    onClick={onSkip}
                    className="border-2 border-[var(--color-border-strong)] bg-[var(--color-muted)] px-6 py-2.5 font-[var(--font-display-en)] text-xs font-bold uppercase tracking-[0.25em] text-[var(--color-fg)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
                  >
                    דלג בכל זאת
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
