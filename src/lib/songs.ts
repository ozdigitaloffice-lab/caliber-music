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
//   "exact"        — verified track URL, direct playback (most cases)
//   "unavailable"  — the song is not on Spotify (only Apple/YouTube).
//                    PlatformPicker hides the Spotify row for these.
//                    Previously we used "search-fallback" with a /search/
//                    URL, but those URLs landed on a Spotify search page
//                    (no playback), so they were effectively useless and
//                    misleading. Cross-checked via song.link API; the
//                    songs in this state genuinely have no Spotify track.
export type SpotifyRef =
  | { trackId: string; url: string; embedUrl: string; matchType: "exact" }
  | { matchType: "unavailable" };

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
    spotifyUnavailable: number;
    spotifyUnavailableTitles: string[];
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
