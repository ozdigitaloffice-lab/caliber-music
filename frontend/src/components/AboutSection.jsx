import { motion } from 'framer-motion';
import { bandData } from '../data/mock';

export const AboutSection = () => {
  return (
    <section id="about" className="relative py-24 md:py-32 bg-[#151515]">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff84e4]/30 to-transparent" />

      <div className="max-w-[1920px] mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block bg-[#ff84e4] text-[#151515] font-mono text-sm md:text-base tracking-[0.0875em] uppercase rounded-full px-4 py-2 mb-4">
              אודות
            </span>
            <h2
              className="font-display font-extrabold text-white uppercase leading-none mb-8"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
            >
              {bandData.about.title}
            </h2>
            <p className="text-white/60 text-lg md:text-xl leading-relaxed mb-8">
              {bandData.about.text}
            </p>

            {/* Quote */}
            <motion.blockquote
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="border-r-4 border-[#ffe03d] pr-6 py-2"
            >
              <p className="text-[#ffe03d] text-xl md:text-2xl font-semibold italic leading-relaxed">
                {bandData.about.quote}
              </p>
            </motion.blockquote>
          </motion.div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-lg overflow-hidden aspect-[4/5]">
              <img
                src={bandData.heroImage}
                alt={bandData.name}
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#151515]/60 to-transparent" />
            </div>

            {/* Decorative elements */}
            <motion.div
              className="absolute -bottom-4 -left-4 w-24 h-24 md:w-32 md:h-32 rounded-lg bg-[#ffe03d]/10 border border-[#ffe03d]/20"
              animate={{ rotate: [0, 3, 0, -3, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute -top-4 -right-4 w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#ff84e4]/10 border border-[#ff84e4]/20"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
