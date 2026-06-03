"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Type-mask reveal: wraps the heading in an overflow-hidden container, then
 * slides the actual content up from below the mask edge when it enters the
 * viewport. Plays once per scroll session. Works with multi-line headings
 * because the whole content block slides as a unit (no per-character
 * positioning that would break with RTL or wrapping).
 *
 * Use for section H2s and other heroic typography to give the page a sense
 * of rhythm as the user scrolls between sections.
 */
export function RevealHeading({
  children,
  className,
  delay = 0,
  as: Tag = "h2",
  id,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "div" | "p";
  id?: string;
}) {
  return (
    <div className="overflow-hidden" id={id}>
      <motion.div
        initial={{ y: "115%" }}
        whileInView={{ y: 0 }}
        // once: false means the slide-up animation re-triggers each time
        // the heading scrolls back into view, not just on first sight.
        // amount: 0.5 prevents flicker — the trigger only fires when 50%
        // of the heading is visible, so passing the bottom edge during
        // fast scroll doesn't reset it.
        viewport={{ once: false, amount: 0.5 }}
        transition={{ duration: 0.95, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        <Tag className={className}>{children}</Tag>
      </motion.div>
    </div>
  );
}
