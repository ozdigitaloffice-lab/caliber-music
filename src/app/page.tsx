import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { HeroSequence } from "@/components/HeroSequence";
import { EnvelopeSequence } from "@/components/EnvelopeSequence";
import { Marquee } from "@/components/Marquee";
import { SongGrid } from "@/components/SongGrid";
import { AboutSection } from "@/components/AboutSection";
import { CollabContact } from "@/components/CollabContact";
import { AboutStrip } from "@/components/AboutStrip";
import { Footer } from "@/components/Footer";
import { SongsSpiral } from "@/components/SongsSpiral";
import { songsData, type Song } from "@/lib/songs";
import { loadHeroManifest } from "@/lib/heroManifest";
import { loadEnvelopeManifest } from "@/lib/envelopeManifest";

// Hero tiles (top 2 large) and songs we want de-emphasized in the marquee + grid tail.
// Editing this here keeps the curation explicit and easy to re-order later.
const HERO_TITLES = ["אמא אדמה", "נגמר הזמן"];
const DEEMPHASIZE_TITLES = ["אח יא איראן"];

function curate(songs: Song[]) {
  const byTitle = new Map(songs.map((s) => [s.title, s] as const));
  const heroSongs = HERO_TITLES.map((t) => byTitle.get(t)).filter(Boolean) as Song[];
  const deemphasized = DEEMPHASIZE_TITLES.map((t) => byTitle.get(t)).filter(Boolean) as Song[];
  const middle = songs.filter(
    (s) => !HERO_TITLES.includes(s.title) && !DEEMPHASIZE_TITLES.includes(s.title),
  );
  const orderedForGrid = [...heroSongs, ...middle, ...deemphasized];
  return { heroSongs, orderedForGrid };
}

export default function Home() {
  const { artist, songs } = songsData;
  const { heroSongs, orderedForGrid } = curate(songs);

  // Marquee shows newest songs but skips the de-emphasized ones entirely.
  const bottomMarquee = songs
    .filter((s) => !DEEMPHASIZE_TITLES.includes(s.title))
    .slice(0, 8)
    .map((s) => s.title.toUpperCase());

  // Newest single's album art becomes the hero backdrop (fallback).
  const heroImage = heroSongs[0]?.artwork ?? songs[0].artwork;

  // If the user has built the hero image-sequence (public/hero-seq/manifest.json),
  // use the Apple-style scrub hero. Otherwise fall back to the static-image hero.
  const heroManifest = loadHeroManifest();
  // Optional second scroll-scrub clip ("envelope opening") that sits between
  // the song grid and the about section. Only rendered if the matching
  // public/envelope-seq/manifest.json is present.
  const envelopeManifest = loadEnvelopeManifest();

  return (
    <>
      <Nav />
      <main>
        {/*
          Hero is full-bleed: cancel the body's pt-[58px]/pt-[64px] (kept on
          body so other sections aren't hidden under the fixed Nav) with a
          negative margin. Result: hero edge sits at viewport top from the
          first pixel of scroll, no "dead zone" before scrub starts.
        */}
        <section id="hero" className="-mt-[58px] md:-mt-[64px]">
          {heroManifest ? (
            <HeroSequence
              manifest={heroManifest}
              bandName={artist.name}
              mobileTeaser={
                <>
                  <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.4em] text-[var(--color-accent)]">
                    ALL CALIBER FAMILY SONGS
                  </p>
                  <h2 className="mt-2 font-[var(--font-display-he)] text-5xl font-black leading-[0.9] text-[var(--color-fg)]">
                    כל השירים
                  </h2>
                </>
              }
            />
          ) : (
            <Hero heroImage={heroImage} bandName={artist.name} />
          )}
        </section>
        {/*
          Music section: back to mt-0. The "peek up" effect is replaced by
          the in-sticky mobileTeaser inside HeroSequence — locked alongside
          the video, exits with it.
        */}
        <section id="music">
          <SongGrid songs={orderedForGrid} />
        </section>

        {/*
          Envelope is pulled UP under the end of the song grid via
          -mt-[40vh] on mobile / -mt-[20vh] on desktop. The sticky child
          (opaque canvas) starts pinning earlier in the scroll, so as the
          user finishes the last row of song cards, the envelope's first
          frame is already rising up underneath instead of waiting for a
          fresh scroll. Reads as continuous flow, not "stuck on a wall."
        */}
        {envelopeManifest && (
          <div className="relative -mt-[40vh] md:-mt-[20vh]">
            <EnvelopeSequence
              manifest={envelopeManifest}
              mobileTeaser={
                <>
                  <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.4em] text-[var(--color-accent)]">
                    ABOUT · אודות
                  </p>
                  <h2 className="mt-2 font-[var(--font-display-he)] text-5xl font-black leading-[0.9] text-[var(--color-fg)]">
                    מי אנחנו
                  </h2>
                </>
              }
            />
          </div>
        )}

        <AboutSection />
        <CollabContact />
        <AboutStrip totalSongs={songs.length} />

        {/* 3D helix of all 17 album covers — page closer, sits between the
            stats and the bottom marquee. Each cover links to its Spotify
            URL on click. */}
        <SongsSpiral songs={songs} />

        <Marquee items={bottomMarquee} reverse />
        <Footer
          spotifyUrl={artist.spotify.url}
          appleUrl={artist.apple.url}
          youtubeUrl={artist.youtube.url}
        />
      </main>
    </>
  );
}
