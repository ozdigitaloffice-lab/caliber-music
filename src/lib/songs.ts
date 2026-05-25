import data from "@/data/songs.json";

export type AppleRef = { trackId: number; url: string };
export type YoutubeRef = {
  videoId: string;
  url: string;
  thumb: string;
  durationSec: number;
  source: string;
  title: string;
};
export type SpotifyRef =
  | { trackId: string; url: string; embedUrl: string; matchType: "exact" }
  | { url: string; matchType: "search-fallback" };

export type Song = {
  title: string;
  releaseDate: string;     // YYYY-MM-DD
  durationSec: number;
  artwork: string;
  preview: string | null;
  apple: AppleRef;
  youtube: YoutubeRef | null;
  spotify: SpotifyRef;
};

export type SongsData = {
  artist: {
    name: string;
    apple: { artistId: string; url: string };
    spotify: { artistId: string; url: string; embedUrl: string };
    youtube: { channelId: string; url: string };
  };
  songs: Song[];
  stats: {
    totalSongs: number;
    withYouTube: number;
    spotifyExact: number;
    spotifySearchFallback: number;
    spotifyFallbackTitles: string[];
    missingYouTube: string[];
  };
};

export const songsData = data as unknown as SongsData;

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDateHe(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}
