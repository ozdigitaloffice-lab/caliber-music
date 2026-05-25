"use client";

import { useState } from "react";
import type { Song } from "@/lib/songs";
import { SongCard } from "./SongCard";
import { PlatformPicker } from "./PlatformPicker";

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
      className="relative bg-[var(--color-bg)] py-16 md:py-24"
      aria-labelledby="disc-title"
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <header className="mb-10 flex flex-col items-start gap-2 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.4em] text-[var(--color-accent)]">
              DISCOGRAPHY · {songs.length} SINGLES
            </p>
            <h2
              id="disc-title"
              className="mt-2 font-[var(--font-display-he)] text-5xl font-black leading-[0.9] md:text-7xl"
            >
              כל השירים
            </h2>
          </div>
          <p className="max-w-md font-[var(--font-body)] text-sm leading-relaxed text-[var(--color-muted-fg)] md:text-right">
            הקש על שיר וקבל את הבחירה — Spotify, Apple Music או YouTube.
            פלטפורמת ברירת מחדל לא קיימת; אתה בוחר.
          </p>
        </header>

        {/* Bento: 2 hero tiles on top, then 2/3/4-col grid */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {/* Hero row — span 2 cols each on md+ */}
          {[hero1, hero2].filter(Boolean).map((s) => (
            <div key={s.title} className="col-span-2">
              <SongCard song={s} size="lg" onOpen={setOpenSong} />
            </div>
          ))}
          {/* Rest */}
          {rest.map((s) => (
            <div key={s.title}>
              <SongCard song={s} size="md" onOpen={setOpenSong} />
            </div>
          ))}
        </div>
      </div>

      <PlatformPicker song={openSong} onClose={() => setOpenSong(null)} />
    </section>
  );
}
