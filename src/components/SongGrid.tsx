"use client";

import { useState } from "react";
import type { Song } from "@/lib/songs";
import { SongCard } from "./SongCard";
import { PlatformPicker } from "./PlatformPicker";
import { RevealHeading } from "./RevealHeading";

/**
 * Bento-style grid of all songs:
 *   - First 2 (newest singles) get 2-column-wide hero tiles
 *   - Rest fall into a 2/3/4-col grid that adapts to viewport
 *
 * Click any tile → open PlatformPicker.
 */
export function SongGrid({ songs }: { songs: Song[] }) {
  const [openSong, setOpenSong] = useState<Song | null>(null);
  const [hero1, hero2, ...rest] = songs;

  return (
    <section
      id="discography"
      className="relative bg-[var(--color-bg)] pt-3 pb-16 md:py-24"
      aria-labelledby="disc-title"
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <header className="mb-10 flex flex-col items-start gap-0 md:mb-14 md:flex-row md:items-end md:justify-between md:gap-2">
          <div>
            <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.4em] text-[var(--color-accent)]">
              DISCOGRAPHY · {songs.length} SINGLES
            </p>
            <RevealHeading
              as="h2"
              id="disc-title"
              className="mt-2 font-[var(--font-display-en)] text-4xl font-bold uppercase leading-[0.95] tracking-tight md:text-6xl"
            >
              DISCOGRAPHY · {songs.length} SINGLES
            </RevealHeading>
          </div>
          <p className="max-w-md font-[var(--font-body)] text-sm leading-relaxed text-[var(--color-muted-fg)] md:text-right">
            הקש על שיר וקבל את הבחירה — Spotify, Apple Music או YouTube.
          </p>
        </header>

        {/* Bento: 2 hero tiles on top, then 2/3/4-col grid */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {/* Hero row — span 2 cols each on md+ */}
          {[hero1, hero2].filter(Boolean).map((s, i) => (
            <div key={s.title} className="col-span-2">
              <SongCard song={s} size="lg" index={i} onOpen={setOpenSong} />
            </div>
          ))}
          {/* Rest */}
          {rest.map((s, i) => (
            <div key={s.title}>
              <SongCard song={s} size="md" index={i + 2} onOpen={setOpenSong} />
            </div>
          ))}
        </div>
      </div>

      <PlatformPicker song={openSong} onClose={() => setOpenSong(null)} />
    </section>
  );
}
