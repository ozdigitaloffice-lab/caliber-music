import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { SongGrid } from "@/components/SongGrid";
import { AboutStrip } from "@/components/AboutStrip";
import { Footer } from "@/components/Footer";
import { songsData, type Song } from "@/lib/songs";

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
  // De-emphasized songs go at the END of the grid (after middle) — still present, just less prominent.
  const orderedForGrid = [...heroSongs, ...middle, ...deemphasized];
  return { heroSongs, orderedForGrid };
}

export default function Home() {
  const { artist, songs } = songsData;
  const { heroSongs, orderedForGrid } = curate(songs);

  const topMarquee = Array(6).fill("משפחת קליבר");

  // Marquee shows newest songs but skips the de-emphasized ones entirely.
  const bottomMarquee = songs
    .filter((s) => !DEEMPHASIZE_TITLES.includes(s.title))
    .slice(0, 8)
    .map((s) => s.title.toUpperCase());

  const dates = songs.map((s) => new Date(s.releaseDate));
  const monthsActive = Math.max(
    1,
    Math.round(
      (Math.max(...dates.map((d) => d.getTime())) -
        Math.min(...dates.map((d) => d.getTime()))) /
        (1000 * 60 * 60 * 24 * 30),
    ),
  );

  // Newest single's album art becomes the hero backdrop.
  const heroImage = heroSongs[0]?.artwork ?? songs[0].artwork;

  return (
    <main>
      <Marquee items={topMarquee} accent />
      <Hero heroImage={heroImage} bandName={artist.name} />
      <SongGrid songs={orderedForGrid} />
      <AboutStrip totalSongs={songs.length} monthsActive={monthsActive} />
      <Marquee items={bottomMarquee} reverse />
      <Footer
        spotifyUrl={artist.spotify.url}
        appleUrl={artist.apple.url}
        youtubeUrl={artist.youtube.url}
      />
    </main>
  );
}
