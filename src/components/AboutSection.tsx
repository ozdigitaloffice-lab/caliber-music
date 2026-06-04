import { RevealHeading } from "./RevealHeading";
import { Reveal3D } from "./Reveal3D";
import { AboutPhoto } from "./AboutPhoto";

/**
 * "מי אנחנו" — bio paragraph + slogan quote + band photo.
 * Copy is verbatim from the prior emergent.sh build of the site so the band's
 * voice carries through. Photo is referenced from emergent's CDN (allow-listed
 * in next.config.ts) — same image they were using before.
 */
const BIO = `במשפחת קליבר, המוזיקה היא לא תחביב – היא ה-DNA שלנו. אנחנו לא מחפשים למצוא חן, אנחנו כאן להגיד את האמת, מהרחובות הכי עמוקים בישראל ישר לתוך האוזן שלכם. כל ביט הוא דופק, כל מילה היא צלקת, ורק ביחד נהיה משפחה מאוחדת. אל תשכחו שכולנו תחת אותו הדגל.`;

const QUOTE = "קליבר – האמת שלכם, הווליום שלנו.";

// Local band photo (replaces the previous emergent CDN reference). Stored
// at public/band-photo.jpg — Next/Image will serve appropriately-sized
// variants automatically based on the `sizes` prop below. Source was a
// 1254×1254 PNG (~2.2 MB), converted to JPEG q3 at ~283 KB with no
// perceptible loss for this composition.
const BAND_PHOTO = "/band-photo.jpg";

export function AboutSection() {
  return (
    <section
      id="about"
      className="relative border-t-2 border-[var(--color-border-strong)] bg-[var(--color-bg)] py-20 md:py-28"
      aria-labelledby="about-title"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 md:grid-cols-[1.2fr_minmax(0,1fr)] md:gap-16 md:px-8">
        {/* Text column */}
        <div>
          <Reveal3D>
            <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.4em] text-[var(--color-accent)]">
              מי אנחנו · ABOUT
            </p>
          </Reveal3D>
          <RevealHeading
            as="h2"
            id="about-title"
            className="mt-3 font-[var(--font-display-he)] text-5xl font-black leading-[0.9] md:text-7xl"
          >
            מי אנחנו
          </RevealHeading>

          <Reveal3D delay={0.12}>
            <p className="mt-4 font-[var(--font-body)] text-lg leading-relaxed text-[var(--color-muted-fg)] md:mt-6 md:text-xl">
              {BIO}
            </p>
          </Reveal3D>

          <Reveal3D delay={0.24}>
            <blockquote className="mt-8 border-r-4 border-[var(--color-accent)] pr-5 py-2 md:pr-7">
              <p
                className="font-[var(--font-display-he)] text-xl font-bold italic leading-snug text-[var(--color-accent)] md:text-2xl"
                style={{ textShadow: "0 0 22px rgba(223, 225, 4, 0.18)" }}
              >
                &ldquo;{QUOTE}&rdquo;
              </p>
            </blockquote>
          </Reveal3D>
        </div>

        {/* Image column — square aspect matches the 1254×1254 source.
            AboutPhoto wraps Next/Image with a scroll-linked saturate +
            blur + opacity ramp: dim and slightly soft on entry, full
            colour at viewport centre, fades back to dim as it scrolls
            away on top. Same component on mobile and desktop. */}
        <AboutPhoto src={BAND_PHOTO} alt="משפחת קליבר" />
      </div>
    </section>
  );
}
