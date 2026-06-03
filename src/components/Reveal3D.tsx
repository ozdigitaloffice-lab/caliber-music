"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Wrap any block of content to make it enter the viewport with a subtle 3D
 * tilt — like a card unfolding from below. Re-triggers each time the
 * content scrolls back into view (once: false), so the page feels alive
 * whether the user is scrolling down for the first time or scrolling back
 * up to re-read something.
 *
 * Tuned conservatively (rotateX: −22°, 30px y, 0.85s ease) so it reads as
 * intentional motion rather than animation noise. Use the `delay` prop to
 * stagger sibling blocks for a cascading "build up" effect.
 *
 * Drop-in: replace `<div>` (or wrap an element) with `<Reveal3D>`. Accepts
 * className and forwards it.
 */
export function Reveal3D({
  children,
  className,
  delay = 0,
  amount = 0.35,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, rotateX: -22, y: 28 }}
      whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
      viewport={{ once: false, amount }}
      transition={{ duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        transformPerspective: 900,
        transformOrigin: "center bottom",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
