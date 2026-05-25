"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

  return (
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
              <PickerButton
                href={song.spotify.url}
                label="Spotify"
                sub={song.spotify.matchType === "exact" ? "השמעה ישירה" : "פתיחת חיפוש"}
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
}

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
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
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
    </a>
  );
}
