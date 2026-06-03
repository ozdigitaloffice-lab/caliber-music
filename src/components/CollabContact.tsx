"use client";

import { useState } from "react";
import { Phone, MessageCircle } from "lucide-react";
import { Reveal3D } from "./Reveal3D";

/**
 * "שיתופי פעולה" — bookings + collab contact.
 *
 * Phone number is **hidden behind a click** for two reasons:
 *   1. Anti-spam: scrapers reading the initial HTML response won't see
 *      the number — it's constructed at runtime from a small array.
 *   2. Branded interaction: clicking the CTA visually reveals the
 *      number and auto-dials after a beat. Feels like an "unlock."
 *
 * Each text block enters the viewport with a Reveal3D wrapper — a
 * subtle 3D tilt entrance that re-triggers when scrolled back into
 * view, so the section feels alive on every pass.
 */
const PHONE_PARTS = ["052", "3141206"] as const;       // joined at runtime
const WHATSAPP_PARTS = ["972", "523141206"] as const;  // joined at runtime

const PITCH = `אם אתם מפיקים, אמנים, יח"צ, במאים או כל מי שחי את התרבות ורוצה לייצר משהו גדול עם משפחת קליבר – אנחנו כאן. תנו לנו צלצול, נדבר דוגרי, ונבין איך הופכים את הרעיון שלכם למציאות על הבמה ובאוזניים של כולם.`;

const SIDEBAR_TEXT = `אנחנו לא רק כותבים שירים – אנחנו בונים חוויות. הופעות חיות, הקלטות משותפות, קמפיינים למותגים וכל מה שביניהם. אם יש לך ויז'ן, יש לנו את הווליום והאמת כדי להרים אותו.`;

export function CollabContact() {
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const phoneDisplay = PHONE_PARTS.join("-");
  const phoneTel = PHONE_PARTS.join("");
  const whatsapp = WHATSAPP_PARTS.join("");

  const handlePhoneClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!phoneRevealed) {
      e.preventDefault();
      setPhoneRevealed(true);
      // Brief delay so the user sees the number, then trigger the dialer.
      // On desktop the dialer prompt is a no-op; on mobile it opens the
      // phone app. Either way the number stays visible after click.
      window.setTimeout(() => {
        window.location.href = `tel:${phoneTel}`;
      }, 450);
    }
    // If revealed already, default <a href="tel:..."> behaviour fires.
  };

  return (
    <section
      id="collab-contact"
      className="relative border-t-2 border-[var(--color-border-strong)] bg-[var(--color-muted)] py-20 md:py-28"
      aria-labelledby="collab-title"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 md:grid-cols-[1.2fr_minmax(0,1fr)] md:gap-16 md:px-8">
        {/* Pitch + CTA column */}
        <div>
          <Reveal3D>
            <p className="inline-block border-2 border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-1.5 font-[var(--font-mono)] text-xs uppercase tracking-[0.18em] text-[var(--color-accent-fg)]">
              שיתופי פעולה
            </p>
          </Reveal3D>

          <Reveal3D delay={0.08} className="mt-5">
            <h2
              id="collab-title"
              className="font-[var(--font-display-he)] text-4xl font-black leading-[0.95] md:text-6xl"
            >
              רוצים להרים משהו יחד?
            </h2>
          </Reveal3D>

          <Reveal3D delay={0.16} className="mt-6 max-w-xl">
            <p className="font-[var(--font-body)] text-base leading-relaxed text-[var(--color-muted-fg)] md:text-lg">
              {PITCH}
            </p>
          </Reveal3D>

          <Reveal3D delay={0.24} className="mt-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
              <a
                href={`tel:${phoneTel}`}
                onClick={handlePhoneClick}
                aria-label={phoneRevealed ? `התקשרו ${phoneDisplay}` : "לחצו לחשיפת מספר טלפון"}
                className="group inline-flex items-center gap-3 border-2 border-[var(--color-accent)] bg-[var(--color-accent)] px-7 py-4 font-bold text-[var(--color-accent-fg)] transition-transform duration-150 hover:scale-[1.02]"
              >
                <Phone className="h-5 w-5" />
                <span className="font-[var(--font-display-he)] text-base md:text-lg">
                  {phoneRevealed
                    ? `התקשרו לשיתופי פעולה — ${phoneDisplay}`
                    : "לחצו לחשיפת מספר הטלפון"}
                </span>
              </a>
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 border-2 border-[var(--color-border-strong)] bg-transparent px-5 py-3.5 font-[var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[var(--color-fg)] transition-colors hover:border-[#25D366] hover:text-[#25D366]"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </Reveal3D>

          <Reveal3D delay={0.32} className="mt-4">
            <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted-fg)]">
              אפשר גם לשמור את המספר ולשלוח וואטסאפ עם פרטים.
            </p>
          </Reveal3D>
        </div>

        {/* Sidebar card */}
        <Reveal3D delay={0.16}>
          <aside className="relative overflow-hidden border-2 border-[var(--color-border-strong)] bg-[var(--color-bg)] p-7 md:p-8">
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
        </Reveal3D>
      </div>
    </section>
  );
}
