"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Why this exists:
 *
 * Framer Motion can be told to respect the OS-level "prefers-reduced-motion"
 * setting. The trouble is that most of our reviewers (Windows + RDP / VM
 * sessions) have that flag turned on by default, so the page's tasteful
 * in-view reveals were silently disappearing for them. The setting was
 * designed for big, lateral, vestibular-triggering motion (full-screen
 * parallax, autoplaying carousels) — not for a 0.85s opacity+tilt entrance
 * on a paragraph.
 *
 * `reducedMotion="never"` here means "ignore the OS hint for these reveals."
 * The actually-disruptive motion on the page — the long-running horizontal
 * marquee — is opted out separately in globals.css, so users who genuinely
 * need motion reduction still get protection where it matters.
 */
export function MotionShell({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="never">{children}</MotionConfig>;
}
