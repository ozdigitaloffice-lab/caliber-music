import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { SongGrid } from "@/components/SongGrid";
import { AboutStrip } from "@/components/AboutStrip";
import { Footer } from "@/components/Footer";
import { songsData } from "@/lib/songs";

export default function Home() {
  const { artist, songs } = songsData;

  // Top marquee items: band name repeated with separators
  const topMarquee = Array(6).fill("משפחת קליבר");

  // Bottom marquee: rolling list of song titles
  const bottomMarquee = songs.slice(0, 8).map((s) => s.title.toUpperCase());

  // Months active = months between earliest and latest release
  const dates = songs.map((s) => new Date(s.releaseDate));
  const monthsActive = Math.max(
    1,
    Math.round(
      (Math.max(...dates.map((d) => d.getTime())) -
        Math.min(...dates.map((d) => d.getTime()))) /
        (1000 * 60 * 60 * 24 * 30),
    ),
  );

  // Use the newest song's YouTube video as hero background.
  const heroSong = songs.find((s) => s.youtube) ?? songs[0];
  const heroVideoId = heroSong.youtube?.videoId ?? "";

  return (
    <main>
      <Marquee items={topMarquee} accent />
      <Hero heroVideoId={heroVideoId} bandName={artist.name} />
      <SongGrid songs={songs} />
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
