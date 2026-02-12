import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { bandData } from '../data/mock';

export const HeroSection = () => {
  const titleChars = bandData.name.split('');

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#151515]"
    >
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={bandData.heroImage}
          alt={bandData.name}
          className="w-full h-full object-cover object-top"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-[#151515]/60 to-[#151515]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#151515]/70 to-transparent" />
      </div>

      {/* Animated Particles / Grain Overlay */}
      <div className="absolute inset-0 z-[1] opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1920px] mx-auto px-4 lg:px-8 pt-20">
        <div className="flex flex-col items-start justify-end min-h-[80vh] pb-12 md:pb-20">
          {/* Tag */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-4"
          >
            <span className="inline-block bg-[#ffe03d] text-[#151515] font-mono text-xs tracking-[0.0875em] uppercase rounded-full px-3 py-1.5 font-normal">
              היפ הופ ישראלי
            </span>
          </motion.div>

          {/* Band Name - Large Display */}
          <div className="overflow-hidden mb-4">
            <motion.h1
              className="font-display font-extrabold text-[#ffe03d] uppercase leading-none"
              style={{ fontSize: 'clamp(3.5rem, 12vw, 12rem)' }}
            >
              {titleChars.map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ y: 120, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: 0.5 + i * 0.04,
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="inline-block"
                >
                  {char === ' ' ? '\u00A0' : char}
                </motion.span>
              ))}
            </motion.h1>
          </div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="text-white/60 text-lg md:text-xl font-normal leading-relaxed max-w-xl mb-8"
          >
            {bandData.tagline}
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            className="flex items-center gap-4"
          >
            <a
              href="#music"
              className="inline-flex items-center justify-center bg-[#151515] text-white border border-[#151515] rounded-full px-6 py-3 font-mono text-xs tracking-[0.0875em] uppercase min-h-[44px] hover:bg-[#151515]/80 hover:border-white/20 active:scale-[0.98] transition-colors duration-300"
            >
              האזינו עכשיו
            </a>
            <a
              href="#about"
              className="inline-flex items-center justify-center bg-transparent text-white border border-white/30 rounded-full px-6 py-3 font-mono text-xs tracking-[0.0875em] uppercase min-h-[44px] hover:border-[#ffe03d] hover:text-[#ffe03d] active:scale-[0.98] transition-colors duration-300"
            >
              הכירו אותנו
            </a>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.6 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="text-white/40" size={28} />
        </motion.div>
      </motion.div>
    </section>
  );
};
