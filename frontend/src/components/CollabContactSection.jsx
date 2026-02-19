import { motion } from 'framer-motion';

export const CollabContactSection = () => {
  return (
    <section id="collab-contact" className="relative py-20 md:py-28 bg-[#0f0f0f] border-t border-white/10">
      <div className="max-w-[1920px] mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_minmax(0,1fr)] gap-10 lg:gap-16 items-center">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block bg-[#ff84e4] text-[#151515] font-mono text-xs md:text-sm tracking-[0.16em] uppercase rounded-full px-4 py-1.5 mb-4">
              שיתופי פעולה
            </span>
            <h2
              className="font-display font-extrabold text-white uppercase leading-tight mb-4"
              style={{ fontSize: 'clamp(2.1rem, 5vw, 3.4rem)' }}
            >
              רוצים להרים משהו יחד?
            </h2>
            <p className="text-white/60 text-base md:text-lg leading-relaxed mb-6 max-w-xl">
              אם אתם מפיקים, אמנים, יח&quot;צ, במאים או כל מי שחי את התרבות ורוצה לייצר משהו גדול עם
              משפחת קליבר – אנחנו כאן. תנו לנו צלצול, נדבר דוגרי, ונבין איך הופכים את הרעיון שלכם
              למציאות על הבמה ובאוזניים של כולם.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <a
                href="tel:0523141206"
                className="inline-flex items-center justify-center bg-[#ffe03d] text-[#151515] border-2 border-[#ffe03d] rounded-full px-8 py-3.5 font-bold text-sm md:text-base tracking-wide hover:bg-[#ffe03d]/90 hover:shadow-[0_0_30px_rgba(255,224,61,0.4)] transition-all duration-300"
              >
                התקשרו לשיתופי פעולה – 052-3141206
              </a>
              <p className="text-white/40 text-xs md:text-sm">
                אפשר גם לשמור את המספר ולשלוח וואטסאפ עם פרטים.
              </p>
            </div>
          </motion.div>

          {/* Accent Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="w-full"
          >
            <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#1e1e1e] via-[#121212] to-[#1a0b14] p-6 md:p-8 shadow-[0_0_40px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-24 -right-10 w-56 h-56 bg-[#ff84e4]/20 blur-3xl" />
                <div className="absolute -bottom-24 -left-10 w-56 h-56 bg-[#ffe03d]/10 blur-3xl" />
              </div>

              <div className="relative z-10 space-y-4">
                <p className="text-[#ffe03d] font-mono text-xs md:text-sm tracking-[0.18em] uppercase">
                  Collab • Booking • Shows
                </p>
                <p className="text-white text-base md:text-lg leading-relaxed">
                  אנחנו לא רק כותבים שירים – אנחנו בונים חוויות. הופעות חיות, הקלטות משותפות, קמפיינים
                  למותגים וכל מה שביניהם. אם יש לך ויז&#39;ן, יש לנו את הווליום והאמת כדי להרים אותו.
                </p>
                <div className="pt-2 border-t border-white/10 mt-4 text-sm text-white/50">
                  <p>שיחות ושיתופי פעולה מתואמים ישירות עם משפחת קליבר.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

