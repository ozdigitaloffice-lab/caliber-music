/**
 * Hero sequence manifest loader.
 *
 * Tries to import the manifest produced by _data/build_frames.py. If it's
 * absent (user hasn't filmed/built yet), returns null so the page can fall
 * back to the album-art Hero component.
 *
 * We don't use a plain `import` because that would error at build time when
 * the JSON is missing — instead we wrap a dynamic require in a try/catch.
 */

export type HeroManifest = {
  frameCount: number;
  width: number;
  height: number;
  fps: number;
  filenamePattern: string;
  totalBytes: number;
};

export function loadHeroManifest(): HeroManifest | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require("../../public/hero-seq/manifest.json");
    return m as HeroManifest;
  } catch {
    return null;
  }
}
