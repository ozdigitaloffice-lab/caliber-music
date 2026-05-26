import { Phone, MessageCircle } from "lucide-react";

/**
 * "שיתופי פעולה" — bookings + collab contact. Phone CTA opens dialer on
 * mobile (tel:) and a WhatsApp chat (wa.me) as a secondary action.
 *
 * Copy lifted directly from the prior site so the artist's voice is intact.
 */
const PHONE_DISPLAY = "052-3141206";
const PHONE_TEL = "0523141206";
// wa.me requires international format without "+" or leading 0
const WHATSAPP_NUMBER = "972523141206";

const PITCH = `אם אתם מפיקים, אמנים, יח"צ, במאים או כל מי שחי את התרבות ורוצה לייצר משהו גדול עם משפחת קליבר – אנחנו כאן. תנו לנו צלצול, נדבר דוגרי, ונבין איך הופכים את הרעיון שלכם למציאות על הבמה ובאוזניים של כולם.`;

const SIDEBAR_TEXT = `אנחנו לא רק כותבים שירים – אנחנו בונים חוויות. הופעות חיות, הקלטות משותפות, קמפיינים למותגים וכל מה שביניהם. אם יש לך ויז'ן, יש לנו את הווליום והאמת כדי להרים אותו.`;

export function CollabContact() {
  return (
    <section
      id="collab-contact"
      className="relative border-t-2 border-[var(--color-border-strong)] bg-[var(--color-muted)] py-20 md:py-28"
      aria-labelledby="collab-title"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 md:grid-cols-[1.2fr_minmax(0,1fr)] md:gap-16 md:px-8">
        {/* Pitch + CTA column */}
        <div>
          <p className="inline-block border-2 border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-1.5 font-[var(--font-mono)] text-xs uppercase tracking-[0.18em] text-[var(--color-accent-fg)]">
            שיתופי פעולה
          </p>
          <h2
            id="collab-title"
            className="mt-5 font-[var(--font-display-he)] text-4xl font-black leading-[0.95] md:text-6xl"
          >
            רוצים להרים משהו יחד?
          </h2>
          <p className="mt-6 max-w-xl font-[var(--font-body)] text-base leading-relaxed text-[var(--color-muted-fg)] md:text-lg">
            {PITCH}
          </p>

          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
            <a
              href={`tel:${PHONE_TEL}`}
              className="group inline-flex items-center gap-3 border-2 border-[var(--color-accent)] bg-[var(--color-accent)] px-7 py-4 font-bold text-[var(--color-accent-fg)] transition-transform duration-150 hover:scale-[1.02]"
            >
              <Phone className="h-5 w-5" />
              <span className="font-[var(--font-display-he)] text-base md:text-lg">
                התקשרו לשיתופי פעולה — {PHONE_DISPLAY}
              </span>
            </a>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 border-2 border-[var(--color-border-strong)] bg-transparent px-5 py-3.5 font-[var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[var(--color-fg)] transition-colors hover:border-[#25D366] hover:text-[#25D366]"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>

          <p className="mt-4 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted-fg)]">
            אפשר גם לשמור את המספר ולשלוח וואטסאפ עם פרטים.
          </p>
        </div>

        {/* Sidebar card */}
        <aside className="relative overflow-hidden border-2 border-[var(--color-border-strong)] bg-[var(--color-bg)] p-7 md:p-8">
          {/* Accent corner glow — tiny brand-warmer */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 bg-[var(--color-accent)] opacity-15 blur-3xl"
          />
          <div className="relative space-y-5">
            <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.25em] text-[var(--color-accent)]">
              COLLAB · BOOKING · SHOWS
            </p>
            <p className="font-[var(--font-body)] text-base leading-relaxed text-[var(--color-fg)] md:text-lg">
              {SIDEBAR_TEXT}
            </p>
            <p className="border-t-2 border-[var(--color-border)] pt-4 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted-fg)]">
              שיחות ושיתופי פעולה מתואמים ישירות עם משפחת קליבר.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
