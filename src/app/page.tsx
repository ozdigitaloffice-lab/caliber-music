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
            <HeroSequence manifest={heroManifest} bandName={artist.name} />
          ) : (
            <Hero heroImage={heroImage} bandName={artist.name} />
          )}
        </section>
        {/*
          Mobile: song grid pulls up 150vh under the hero. Because the
          hero pins for 230vh and scrubs for 150vh, this puts the song
          grid's top at viewport-bottom roughly 1/3 of the way through
          the scrub — the user sees "DISCOGRAPHY · 17 SINGLES" peek up
          from below well before the hero finishes, instead of waiting
          for the hold phase to start. Desktop unaffected (mt-0).
        */}
        <section id="music" className="relative z-10 -mt-[150vh] md:mt-0">
          <SongGrid songs={orderedForGrid} />
        </section>

        {/* Scroll-driven envelope-opening clip — visual transition between
            the music section and "מי אנחנו". Only renders if frames built. */}
        {envelopeManifest && <EnvelopeSequence manifest={envelopeManifest} />}

        {/*
          Mobile: AboutSection pulls up 200vh under the envelope so that
          AboutSection's top sits exactly at the bottom of the envelope's
          sticky canvas from the moment the envelope starts pinning. Result:
          the "ABOUT · מי אנחנו" label + the start of the heading are
          visible IN THE BOTTOM SLICE OF VIEWPORT FROM THE FIRST SCROLL,
          and more of the AboutSection rolls up as the user scrolls
          through the envelope. Desktop unaffected.
        */}
        <div className="relative z-10 -mt-[200vh] md:mt-0">
          <AboutSection />
        </div>
        <CollabContact />
        <AboutStrip totalSongs={songs.length} />
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
