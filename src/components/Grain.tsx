/**
 * Persistent SVG noise overlay. Sits above all content, ignores pointer events,
 * gives the whole site that "film grain / dirty print" hip-hop texture.
 * Pure SVG so it's tiny and works without JS.
 */
export function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] opacity-[0.07] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")`,
        backgroundSize: "180px 180px",
      }}
    />
  );
}
