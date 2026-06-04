"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { X } from "lucide-react";
import type { Song } from "@/lib/songs";
import { SpotifyIcon, AppleMusicIcon, YoutubeIcon } from "./PlatformIcons";

/**
 * Modal triggered from a song card. Shows 2-3 platform buttons (YouTube hidden
 * if no video). Clicking a button opens that platform in a new tab.
 *
 * - Backdrop click & Escape both close
 * - Body scroll locked while open
 * - Backdrop fades + scales, panel slides up
 */
export function PlatformPicker({
  song,
  onClose,
}: {
  song: Song | null;
  onClose: () => void;
}) {
  // ESC closes; lock body scroll while open
  useEffect(() => {
    if (!song) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [song, onClose]);

  // Mount-detection so the portal target (document.body) is available.
  // Server render produces no portal at all; client first render also
  // skips it on the initial pass and then re-renders once mounted —
  // keeps hydration clean.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Why a portal:
  // SongsSpiral wraps its helix in containers with `perspective` and
  // `transform-style: preserve-3d`. Per CSS, those properties create a
  // containing block for ANY descendant with `position: fixed` — so a
  // modal rendered inside SongsSpiral with `fixed inset-0` doesn't span
  // the viewport, it spans the 3D container (which is much smaller on
  // mobile). The dialog ended up cramped down to the spiral's footprint.
  // Mounting the modal into document.body via createPortal escapes that
  // containing block and `fixed inset-0` once again means "the whole
  // viewport" — same size whether opened from the song grid or from the
  // spiral.
  const dialog = (
    <AnimatePresence>
      {song && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="picker-title"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {/* backdrop */}
          <button
            type="button"
            aria-label="סגירה"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ y: 24, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md border-2 border-[var(--color-border-strong)] bg-[var(--color-bg)] p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="סגירה"
              className="absolute left-3 top-3 grid h-9 w-9 place-items-center border-2 border-transparent text-[var(--color-muted-fg)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <X size={18} />
            </button>

            <div className="mb-5 flex items-start gap-4">
              {/* tiny album thumb */}
              <img
                src={song.artwork}
                alt=""
                className="h-16 w-16 shrink-0 border-2 border-[var(--color-border-strong)] object-cover"
              />
              <div className="min-w-0">
                <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--color-accent)]">
                  בחר/י פלטפורמה
                </p>
                <h3
                  id="picker-title"
                  className="font-[var(--font-display-he)] text-xl font-black leading-tight md:text-2xl"
                >
                  {song.title}
                </h3>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Spotify row: "השמעה ישירה" for the 13 tracks with
                  verified track URLs, "פתיחת חיפוש" for the 4 that
                  fall back to a search query. The search URLs are
                  built with "?", "!", "..." stripped before
                  URL-encoding so Spotify doesn't read the first "?"
                  in the query string as a path/query separator and
                  truncate the search silently (which is what was
                  breaking the previous links). */}
              <PickerButton
                href={song.spotify.url}
                label="Spotify"
                sub={
                  song.spotify.matchType === "exact"
                    ? "השמעה ישירה"
                    : "פתיחת חיפוש"
                }
                icon={<SpotifyIcon className="h-6 w-6" />}
                accentClass="hover:bg-[#1DB954] hover:text-black hover:border-[#1DB954]"
              />
              <PickerButton
                href={song.apple.url}
                label="Apple Music"
                sub="השמעה ישירה"
                icon={<AppleMusicIcon className="h-6 w-6" />}
                accentClass="hover:bg-gradient-to-r hover:from-[#FA243C] hover:to-[#FB5C74] hover:text-white hover:border-transparent"
              />
              {song.youtube && (
                <PickerButton
                  href={song.youtube.url}
                  label="YouTube"
                  sub="קליפ רשמי"
                  icon={<YoutubeIcon className="h-6 w-6" />}
                  accentClass="hover:bg-[#FF0000] hover:text-white hover:border-[#FF0000]"
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return mounted ? createPortal(dialog, document.body) : null;
}

/**
 * Platform button with a *magnetic* hover effect — as the cursor moves over
 * the button, the button drifts toward the cursor (capped, spring-smoothed).
 * Subtle, but instantly registers as a high-craft micro-interaction.
 */
function PickerButton({
  href,
  label,
  sub,
  icon,
  accentClass,
}: {
  href: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  accentClass: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Spring-smoothed so the drift settles instead of snapping to cursor.
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.6 });

  const PULL = 0.22; // how strongly the button follows the cursor (0..1)
  const MAX = 12;    // px clamp so it never drifts ridiculously far

  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = (e.clientX - cx) * PULL;
    const dy = (e.clientY - cy) * PULL;
    x.set(Math.max(-MAX, Math.min(MAX, dx)));
    y.set(Math.max(-MAX, Math.min(MAX, dy)));
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.a
      ref={ref}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy }}
      className={`group flex items-center justify-between gap-3 border-2 border-[var(--color-border-strong)] bg-[var(--color-muted)] px-5 py-4 transition-colors duration-150 ${accentClass}`}
    >
      <span className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center transition-transform group-hover:scale-110">
          {icon}
        </span>
        <span className="flex flex-col items-start leading-none">
          <span className="font-[var(--font-display-en)] text-base font-bold">{label}</span>
          <span className="mt-1 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] opacity-70">
            {sub}
          </span>
        </span>
      </span>
      <span aria-hidden className="font-[var(--font-display-en)] text-xl font-bold transition-transform group-hover:-translate-x-1 rtl:group-hover:translate-x-1">
        ←
      </span>
    </motion.a>
  );
}
