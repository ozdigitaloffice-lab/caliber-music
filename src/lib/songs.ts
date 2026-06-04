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
// matchType variants:
//   "exact"           — verified track URL, direct playback (most cases).
//   "search-fallback" — the song isn't on Spotify (verified via song.link
//                       API). The URL is a CLEAN search query — title
//                       with "?", "!", "..." stripped before URL-encoding
//                       so Spotify's URL parser doesn't mistake "?" for
//                       the start of a query string (which would
//                       silently truncate the search). The user lands on
//                       Spotify's search results page rather than on a
//                       track page, which is the best we can offer for
//                       songs that genuinely don't exist on Spotify.
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
