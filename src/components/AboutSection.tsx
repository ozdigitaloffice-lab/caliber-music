import Image from "next/image";
import { RevealHeading } from "./RevealHeading";

/**
 * "מי אנחנו" — bio paragraph + slogan quote + band photo.
 * Copy is verbatim from the prior emergent.sh build of the site so the band's
 * voice carries through. Photo is referenced from emergent's CDN (allow-listed
 * in next.config.ts) — same image they were using before.
 */
const BIO = `במשפחת קליבר, המוזיקה היא לא תחביב – היא ה-DNA שלנו. אנחנו לא מחפשים למצוא חן, אנחנו כאן להגיד את האמת, מהרחובות הכי עמוקים בישראל ישר לתוך האוזן שלכם. כל ביט הוא דופק, כל מילה היא צלקת, ורק ביחד נהיה משפחה מאוחדת. אל תשכחו שכולנו תחת אותו הדגל.`;

const QUOTE = "קליבר – האמת שלכם, הווליום שלנו.";

const BAND_PHOTO =
  "https://customer-assets.emergentagent.com/job_3e445c6f-4f21-4280-b902-49885a77d5d7/artifacts/lt7sqz88_%D7%A2%D7%99%D7%A6%D7%95%D7%91%20%D7%9C%D7%9C%D7%90%20%D7%A9%D7%9D%20%2839%29.png";

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
          <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.4em] text-[var(--color-accent)]">
            מי אנחנו
          </p>
          <RevealHeading
            as="h2"
            id="about-title"
            className="mt-3 font-[var(--font-display-he)] text-5xl font-black leading-[0.9] md:text-7xl"
          >
            מי אנחנו · ABOUT
          </RevealHeading>

          <p className="mt-8 font-[var(--font-body)] text-lg leading-relaxed text-[var(--color-muted-fg)] md:text-xl">
            {BIO}
          </p>

          <blockquote className="mt-8 border-r-4 border-[var(--color-accent)] pr-5 py-2 md:pr-7">
            <p
              className="font-[var(--font-display-he)] text-xl font-bold italic leading-snug text-[var(--color-accent)] md:text-2xl"
              style={{ textShadow: "0 0 22px rgba(223, 225, 4, 0.18)" }}
            >
              &ldquo;{QUOTE}&rdquo;
            </p>
          </blockquote>
        </div>

        {/* Image column */}
        <div className="relative aspect-[4/5] w-full overflow-hidden border-2 border-[var(--color-border-strong)]">
          <Image
            src={BAND_PHOTO}
            alt="משפחת קליבר"
            fill
            sizes="(max-width: 768px) 90vw, 40vw"
            className="object-cover object-top"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
        </div>
      </div>
    </section>
  );
}
