"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Full-page loading screen — blocks the site until the hero's video frames
 * finish downloading. Designed to be visually engaging enough that visitors
 * don't immediately reach for the Skip button.
 *
 * Key engagement elements:
 * - **Live audio-equalizer visualization**: 48 vertical bars driven by 3
 *   overlapping sine waves at different frequencies, giving an organic
 *   "music breathing" feel. Bars left of the progress threshold are
 *   acid-yellow with glow; right of the threshold are dim. Loading
 *   progress reads as "music filling up."
 * - **Pulsing center beat dot**: synced to a 600ms BPM, gives the whole
 *   screen a heartbeat — like the sub-bass on a track.
 * - **Rotating status messages**: 6 different "loading the studio" style
 *   lines cycling every 2.5s. People wait to see the next one.
 * - **Band name with subtle glow pulse**: settles in after first paint.
 *
 * Skip button + recommendation only after 15s — protects users on terrible
 * connections without tempting fast users to skip a 3s wait.
 *
 * Body scroll is locked while visible (no peeking past the curtain).
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
  // Body scroll lock — the user shouldn't be able to wheel through the
  // loader and reveal half-rendered content behind it.
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
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Persistent SVG grain — matches site aesthetic everywhere else */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
              backgroundSize: "180px 180px",
            }}
          />

          {/* Ambient color glow behind the content — warm gradient blob that
              softly pulses, matching the equalizer palette. Gives the whole
              screen depth and color without distracting from the wave. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px]"
            style={{
              background:
                "radial-gradient(circle, rgba(255, 43, 110, 0.18) 0%, rgba(255, 106, 0, 0.12) 40%, rgba(223, 225, 4, 0.08) 70%, transparent 100%)",
            }}
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative flex flex-col items-center gap-6 md:gap-8">
            {/* Band name with subtle pulse */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{
                opacity: 1,
                y: 0,
                textShadow: [
                  "0 0 22px rgba(223, 225, 4, 0.12)",
                  "0 0 32px rgba(223, 225, 4, 0.28)",
                  "0 0 22px rgba(223, 225, 4, 0.12)",
                ],
              }}
              transition={{
                opacity: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                y: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                textShadow: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
              }}
              className="font-[var(--font-display-he)] text-5xl font-black leading-[0.9] text-[var(--color-fg)] md:text-7xl"
            >
              משפחת קליבר
            </motion.h1>

            {/* Cycling status messages (engagement: people wait to read the next one) */}
            <CyclingMessage />

            {/* Equalizer-style live waveform */}
            <Equalizer progress={progress} />

            {/* Percent + secondary message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col items-center gap-2"
            >
              <div
                className="bg-gradient-to-r from-[#FF2B6E] via-[#FF6A00] to-[#DFE104] bg-clip-text font-[var(--font-mono)] text-xs tabular-nums uppercase tracking-[0.5em] text-transparent"
                aria-hidden
              >
                {percent}%
              </div>
              <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted-fg)] md:text-xs">
                שווה להמתין ! רק כמה שניות והאתר עולה
              </p>
            </motion.div>

            {/* Skip — appears after 15s with recommendation */}
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
                    ממליצים לחכות בשביל לראות את האתר באיכות הטובה ביותר!
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

/**
 * 48-bar live equalizer. Each bar's height is driven by three overlapping
 * sine waves at slightly different frequencies — gives an organic
 * "music breathing" look rather than mechanical regularity. The bars to
 * the left of the progress threshold are bright acid-yellow with a glow;
 * the rest are dim gray. As loading progresses, the bright "playing"
 * portion grows across the bar field.
 *
 * Pure rAF; no React re-render per frame.
 */
function Equalizer({ progress }: { progress: number }) {
  const BARS = 48;
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      for (let i = 0; i < BARS; i++) {
        const bar = barsRef.current[i];
        if (!bar) continue;
        // Three sine waves layered at varying frequencies and phases — the
        // result reads as "music" rather than pendulum.
        const w1 = Math.sin(t * 1.7 + i * 0.32) * 0.36;
        const w2 = Math.sin(t * 2.9 + i * 0.19) * 0.26;
        const w3 = Math.sin(t * 0.9 + i * 0.51) * 0.18;
        const amp = 0.48 + w1 + w2 + w3;
        const h = Math.max(0.08, Math.min(1, amp));
        bar.style.transform = `scaleY(${h})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="flex h-20 w-80 items-center gap-[3px] md:h-24 md:w-[28rem]"
      aria-hidden
    >
      {Array.from({ length: BARS }).map((_, i) => {
        const active = i < progress * BARS;

        // Per-bar hue: shift across the spectrum based on horizontal
        // position — creates a sweep from yellow → orange → pink across
        // the equalizer instead of a flat single color. Hip-hop palette:
        // warm dominant, no greens/blues.
        //   bar 0  (leftmost) → hue 50°  (acid yellow)
        //   bar 24 (middle)   → hue 25°  (hot orange)
        //   bar 47 (rightmost)→ hue 350° (magenta)
        const hue = 50 - (i / (BARS - 1)) * 60; // 50° → -10° (wraps to 350°)
        const normalizedHue = ((hue % 360) + 360) % 360;
        const barColor = `hsl(${normalizedHue}, 95%, 56%)`;
        const glowColor = `hsla(${normalizedHue}, 95%, 56%, 0.5)`;

        return (
          <div
            key={i}
            ref={(el) => {
              barsRef.current[i] = el;
            }}
            className="flex-1 origin-center rounded-[1px] transition-[background,box-shadow] duration-300"
            style={{
              height: "100%",
              // Active bars get a vertical gradient (bar color at bottom,
              // intensifying to white-hot at the top) so taller motion reads
              // as "louder/hotter" like a real audio level meter.
              background: active
                ? `linear-gradient(to top, ${barColor} 0%, ${barColor} 40%, hsl(${normalizedHue}, 100%, 70%) 100%)`
                : "var(--color-border-strong)",
              transform: "scaleY(0.12)",
              boxShadow: active ? `0 0 12px ${glowColor}` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Rotates through a list of hip-hop-themed "loading the studio" messages
 * every 2.5s. AnimatePresence crossfades between them. Adds enough
 * variety + personality that users wait to see the next line instead of
 * reaching for the skip button.
 */
const LOADING_MESSAGES = [
  "המוזיקה שלנו בדרך אליכם",
  "מכינים את הסטודיו...",
  "מכוונים את הביטים",
  "מרימים את הוליום",
  "מחממים את הרמקולים",
  "מוזיקה זה התרופה שלנו",
  "מוזיקה שנוצרה באהבה",
];

function CyclingMessage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative h-7 w-full overflow-hidden md:h-8">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex items-center justify-center font-[var(--font-body)] text-base text-[var(--color-fg)] md:text-xl"
        >
          {LOADING_MESSAGES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
