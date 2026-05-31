/**
 * Envelope sequence manifest loader. Tries to import the manifest produced
 * by `build_frames.py --out public/envelope-seq`; returns null if it isn't
 * built yet (in which case the page just skips rendering that section).
 */

export type EnvelopeManifest = {
  frameCount: number;
  width: number;
  height: number;
  fps: number;
  filenamePattern: string;
  totalBytes: number;
};

export function loadEnvelopeManifest(): EnvelopeManifest | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require("../../public/envelope-seq/manifest.json");
    return m as EnvelopeManifest;
  } catch {
    return null;
  }
}
