import clsx from "clsx";

/**
 * Infinite horizontal marquee. CSS-only animation (no JS), GPU-accelerated.
 * Duplicates children once internally so translating -50% creates a seamless loop.
 *
 * Items are separated by acid-yellow diamond glyphs.
 */
export function Marquee({
  items,
  reverse = false,
  accent = false,
  className,
}: {
  items: string[];
  reverse?: boolean;
  accent?: boolean;
  className?: string;
}) {
  const sep = (
    <span aria-hidden className="mx-6 inline-block translate-y-[-0.15em] text-[var(--color-accent)]">
      ◆
    </span>
  );

  const row = (
    <div className="flex shrink-0 items-center whitespace-nowrap">
      {items.map((t, i) => (
        <span key={i} className="inline-flex items-center">
          {t}
          {sep}
        </span>
      ))}
    </div>
  );

  return (
    <div
      className={clsx(
        "relative w-full overflow-hidden py-3",
        accent ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)] border-y-2 border-black"
               : "bg-[var(--color-bg)] text-[var(--color-fg)] border-y-2 border-[var(--color-border-strong)]",
        className,
      )}
      aria-hidden
    >
      <div
        className={clsx(
          "flex w-max font-[var(--font-display-en)] font-bold uppercase tracking-[0.08em] text-2xl md:text-3xl",
          reverse ? "marquee-track-reverse" : "marquee-track",
        )}
      >
        {row}
        {row}
      </div>
    </div>
  );
}
