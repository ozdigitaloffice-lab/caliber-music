import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { bandData } from '../data/mock';

const SpotifySmall = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const YouTubeSmall = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const AppleMusicSmall = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043A5.022 5.022 0 0 0 19.7.24 10.28 10.28 0 0 0 17.48 0h-10.9C4.18 0 2.18.26 1.26.9A5.26 5.26 0 0 0 .24 2.94 10.46 10.46 0 0 0 0 5.18v13.64c0 1.18.09 2.18.24 3.18.19.88.57 1.72 1.14 2.42.78.94 1.8 1.4 2.94 1.52.9.07 1.82.07 2.73.07h10.2c1.1 0 2.1-.06 3.06-.26 1.14-.24 2.1-.79 2.82-1.72.5-.65.86-1.39 1.02-2.2.15-.78.21-1.58.21-2.38V6.124zm-7.28 4.28l-.01 7.11c0 .65-.12 1.25-.39 1.81-.49 1.01-1.29 1.6-2.37 1.77-.56.1-1.13.07-1.67-.14-.97-.38-1.52-1.13-1.62-2.15-.09-.87.23-1.58.9-2.13.46-.38 1.01-.59 1.6-.71.6-.12 1.2-.22 1.8-.35.34-.07.57-.29.64-.63.02-.1.03-.21.03-.32v-4.76c0-.16-.01-.32-.05-.47-.08-.3-.28-.45-.58-.42-.2.02-.39.07-.58.12l-5.57 1.37c-.04.01-.07.02-.11.03-.33.09-.47.27-.49.6-.01.08-.01.16-.01.24V18.36c0 .67-.12 1.3-.41 1.88-.5 1-1.3 1.57-2.38 1.73-.56.08-1.12.05-1.65-.16-.96-.4-1.49-1.14-1.58-2.16-.08-.87.24-1.57.91-2.12.46-.38 1-.59 1.59-.7.59-.12 1.19-.22 1.78-.35.35-.07.58-.29.65-.64.02-.09.02-.19.02-.28V7.12c0-.41.05-.81.18-1.19.21-.6.64-.97 1.24-1.12.26-.06.52-.11.79-.17l6.06-1.49c.42-.1.84-.2 1.27-.26.55-.08.93.2 1.01.76.02.15.03.31.03.47v6.3z"/>
  </svg>
);

export const Footer = () => {
  const socialLinks = [
    { icon: SpotifySmall, url: bandData.musicLinks[0].url, label: 'Spotify' },
    { icon: YouTubeSmall, url: bandData.musicLinks[1].url, label: 'YouTube' },
    { icon: AppleMusicSmall, url: bandData.musicLinks[2].url, label: 'Apple Music' },
  ];

  return (
    <footer className="relative bg-[#151515] border-t border-white/10">
      <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-display font-extrabold text-3xl md:text-4xl text-[#ffe03d] uppercase mb-2">
              קליבר
            </h3>
            <p className="text-white/40 text-sm">
              משפחת קליבר © {new Date().getFullYear()}
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((link) => {
              const IconComp = link.icon;
              return (
                <motion.a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-[#ffe03d] hover:border-[#ffe03d] transition-colors duration-300"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={link.label}
                >
                  <IconComp />
                </motion.a>
              );
            })}
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
          <p className="text-white/30 text-xs flex items-center gap-1">
            נבנה עם <Heart size={12} className="text-[#ff84e4]" /> למשפחת קליבר
          </p>
          <a
            href="#hero"
            className="text-white/30 text-xs hover:text-[#ffe03d] transition-colors duration-300 font-mono tracking-[0.0875em] uppercase"
          >
            חזרה למעלה
          </a>
        </div>
      </div>
    </footer>
  );
};
