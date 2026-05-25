/**
 * Static "by the numbers" strip — purely visual hook, no interactivity.
 * Hip-hop sites love big stat blocks because they read like a record-label
 * one-sheet.
 */
export function AboutStrip({
  totalSongs,
  monthsActive,
}: {
  totalSongs: number;
  monthsActive: number;
}) {
  const stats = [
    { value: totalSongs.toString(), label: "סינגלים" },
    { value: monthsActive.toString(), label: "חודשים" },
    { value: "3", label: "פלטפורמות" },
    { value: "∞", label: "אנרגיה" },
  ];

  return (
    <section className="relative border-y-2 border-[var(--color-accent)] bg-[var(--color-muted)] py-12 md:py-16">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 md:grid-cols-4 md:px-8">
        {stats.map((s, i) => (
          <div key={i} className="text-center">
            <div
              className="font-[var(--font-display-he)] text-6xl font-black leading-none text-[var(--color-accent)] md:text-7xl"
              style={{ textShadow: "0 0 30px rgba(223, 225, 4, 0.3)" }}
            >
              {s.value}
            </div>
            <div className="mt-2 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted-fg)] md:text-xs">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
