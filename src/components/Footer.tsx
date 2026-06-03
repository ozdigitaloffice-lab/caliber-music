import { SpotifyIcon, AppleMusicIcon, YoutubeIcon } from "./PlatformIcons";

export function Footer({
  spotifyUrl,
  appleUrl,
  youtubeUrl,
}: {
  spotifyUrl: string;
  appleUrl: string;
  youtubeUrl: string;
}) {
  return (
    <footer className="relative border-t-2 border-[var(--color-border-strong)] bg-[var(--color-bg)] py-12 md:py-16">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center md:px-8">
        <p
          className="shine-text font-[var(--font-display-en)] text-5xl font-bold uppercase tracking-tight md:text-7xl"
          style={{ letterSpacing: "-0.04em" }}
        >
          CALIBER · FAMILY
        </p>

        <div className="flex items-center gap-4">
          {[
            { url: spotifyUrl, label: "Spotify", Icon: SpotifyIcon, color: "#1DB954" },
            { url: appleUrl, label: "Apple Music", Icon: AppleMusicIcon, color: "#FA243C" },
            { url: youtubeUrl, label: "YouTube", Icon: YoutubeIcon, color: "#FF0000" },
          ].map(({ url, label, Icon, color }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={label}
              className="group grid h-12 w-12 place-items-center border-2 border-[var(--color-border-strong)] text-[var(--color-fg)] transition-colors duration-150 hover:border-[var(--color-accent)]"
              style={{ ["--hov" as string]: color }}
            >
              <Icon className="h-5 w-5 transition-colors group-hover:text-[var(--color-accent)]" />
            </a>
          ))}
        </div>

        <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted-fg)]">
          © {new Date().getFullYear()} · משפחת קליבר · ALL RIGHTS RESERVED
        </p>
      </div>
    </footer>
  );
}
