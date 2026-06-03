"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import type { Song } from "@/lib/songs";
import { PlatformPicker } from "./PlatformPicker";
import { RevealHeading } from "./RevealHeading";

/**
 * 3D helix of every song's album artwork — section closer placed after the
 * stats strip and before the bottom marquee.
 *
 * The motion is a "screw turning": each cover continuously crawls upward
 * along the helical path, wraps from the top edge back around to the
 * bottom, and re-emerges. Because the y position and the rotation around
 * the Y axis are both derived from a single per-cover `t` value
 * (`angle = t * REV * 2π`, `y = -H/2 + t * H`), one continuously-advancing
 * time offset produces both effects in lockstep — the helix appears to
 * rotate AND translate at exactly the rate of a turning screw.
 *
 * Bouncing-ball pass on top: a glowing yellow sphere walks the discography
 * in order, hopping cover-to-cover. Because the covers themselves are
 * moving, the ball re-samples the target cover's current position every
 * frame during both dwell and hop — so it lands pixel-perfect even when
 * the target has drifted under it.
 *
 * Edge fade: when a cover's `t` is within FADE of either edge, its opacity
 * is linearly faded to 0. The wrap from t≈0 to t≈1 happens while the
 * cover is fully invisible, so the visual is "fades out at top, fades
 * back in at bottom" rather than a teleport. Ball uses the max of source
 * and target cover opacity so it never disappears mid-hop.
 *
 * Architectural split, per cover:
 *   - **outer <div>** — owns position (translate3d) and opacity. Set
 *     imperatively by the rAF loop every frame. No React style for these
 *     after the initial render-time defaults.
 *   - **inner <a>** — owns border / box-shadow / scale, driven by React
 *     state (landedIndex / hoveredIndex). CSS transition makes them
 *     animate smoothly. React re-renders never touch the outer transform
 *     so there's no flash when state changes.
 *
 * Hydration: all transform numbers go through `.toFixed(3)` so the SSR
 * stringification matches what React produces on the client.
 */
export function SongsSpiral({ songs }: { songs: Song[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const coverRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ballRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Defer loading the centre microphone video until the spiral section is
  // approaching the viewport. The poster (~36 KB) renders immediately;
  // the actual 2.4 MB MP4 is only fetched once the user is about to see
  // it. Set via Intersection Observer below. Once true, stays true.
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  // Scroll-driven X-tilt and scale (unchanged from before)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [-30, 0, 30]);
  const containerScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1, 0.85]);
  const smoothRotateX = useSpring(rotateX, { stiffness: 60, damping: 22 });
  const smoothScale = useSpring(containerScale, { stiffness: 60, damping: 22 });

  // ────── Breakpoint detection ──────
  // The spiral was sized for mobile and looked lost on large desktops
  // (a tiny jewel floating in the middle of a 1900px-wide section). At
  // md+ we scale every geometric constant up so the helix fills more of
  // the available canvas without crowding the section padding.
  //
  // Server + first-client render both use the mobile defaults (so SSR
  // hydration matches). The matchMedia listener flips to desktop sizes
  // on mount; subsequent resizes between breakpoints also re-trigger.
  // The render-loop's effect depends on `isDesktop`, so its closure
  // captures the right geometry after each switch.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // ────── Geometry ──────
  // Desktop is intentionally wider and shorter than mobile (RADIUS up,
  // HEIGHT down): on a large monitor the spiral reads better as a
  // landscape-oriented spread than a tall column. The cover/ball/arc
  // sizes stay the same as the previous desktop tuning — only the
  // overall footprint changes shape.
  const N = songs.length;
  const REVOLUTIONS = 1.6;
  const RADIUS = isDesktop ? 280 : 150;
  const HEIGHT = isDesktop ? 420 : 380;
  const COVER = isDesktop ? 128 : 88;
  const BALL = isDesktop ? 26 : 18;
  const ARC_HEIGHT = isDesktop ? 60 : 40;
  // Perspective bumped slightly (1500 → 1600) to keep the front/back
  // size delta similar now that the z-range is wider (±280 vs ±240).
  const PERSPECTIVE = isDesktop ? 1600 : 1100;

  // ────── Timings ──────
  // 75s per full thread cycle = each cover takes 75s to travel from the
  // bottom edge of the helix back around to the bottom edge again. At
  // REVOLUTIONS=1.6 that's a rotation period of 75/1.6 ≈ 47s per full
  // turn around Y — slightly slower than the previous CSS spin (40s),
  // which keeps the helix from feeling rushed now that covers are also
  // translating vertically.
  const SCREW_PERIOD_MS = 75000;
  const HOP_MS = 700;
  const DWELL_MS = 700;
  // Edge fade: 6% of the t-range on each end. Keep small so most of the
  // helix stays at full opacity; large enough that the wrap from t≈0 to
  // t≈1 is invisible.
  const FADE = 0.06;
  // ────── Ball motion ──────
  // OUTWARD_BULGE: how far the ball pushes away from the helix axis at
  // mid-hop. The path is built as (angle-lerp, y-lerp + arc-bump,
  // radius-lerp + sine-bulge-out) rather than the old linear x/y/z lerp.
  // That keeps the ball on / outside the cylindrical surface of the
  // helix instead of cutting straight through it, which is what was
  // causing the "ball disappears behind another cover" issue mid-hop.
  const OUTWARD_BULGE = isDesktop ? 60 : 35;
  // Squash & stretch — Disney's first principle. During flight the ball
  // stretches along the motion vector (vertically here, since the hop
  // is dominated by the y-arc); on impact it squashes wide and short
  // and recovers over LANDING_SQUASH_MS. Values are intentionally
  // moderate — we want "ball with weight" not "rubber".
  const HOP_STRETCH = 0.15;          // ±15% scale at the apex
  const LANDING_SQUASH_MS = 180;     // post-impact recovery window
  const LANDING_SQUASH_AMOUNT = 0.22; // 22% flatten on landing

  const r = (n: number) => n.toFixed(3);

  // Position on the helix at any t ∈ [0,1].
  const positionAt = (t: number) => {
    const angle = t * REVOLUTIONS * Math.PI * 2;
    return {
      x: Math.cos(angle) * RADIUS,
      y: -HEIGHT / 2 + t * HEIGHT,
      z: Math.sin(angle) * RADIUS,
    };
  };

  // Opacity at any t — linear fade in the FADE band at each edge.
  const opacityAt = (t: number) => {
    if (t < FADE) return t / FADE;
    if (t > 1 - FADE) return (1 - t) / FADE;
    return 1;
  };

  // Each cover's current t given the screw offset. Subtracting screwT
  // (rather than adding) makes the covers travel UPWARD as time advances
  // — matches the requested "bottom → top" direction.
  const tForIdx = (i: number, screwT: number) => {
    if (N <= 1) return 0.5;
    return ((i / (N - 1)) - screwT + 1) % 1;
  };

  // ────── React state for visual effects (border / shadow / scale) ──────
  // landedIndex: which cover the ball is currently resting on (-1 = in flight)
  // hoveredIndex: which cover the user is pointing at / focused on (-1 = none)
  // A cover lights up if EITHER is true.
  const [landedIndex, setLandedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  // openSong drives the PlatformPicker dialog. Click on any spiral cover
  // opens it so the user gets the same Spotify / Apple Music / YouTube
  // choice as the main song grid — important because 6 of the 17 tracks
  // have a Spotify search-fallback URL rather than a direct track link,
  // and PlatformPicker labels that case ("פתיחת חיפוש") so users can
  // pick Apple Music or YouTube for direct playback instead.
  const [openSong, setOpenSong] = useState<Song | null>(null);
  // Mirror hoveredIndex to a ref so the rAF loop can read it without
  // having to re-create the loop on every hover change.
  const hoveredRef = useRef(-1);
  useEffect(() => {
    hoveredRef.current = hoveredIndex;
  }, [hoveredIndex]);

  // ────── Lazy-load the centre video ──────
  // Intersection Observer on the spiral's container. When the section
  // crosses within 200px of the viewport (rootMargin), we flip
  // shouldLoadVideo to true once; the <video> tag's <source> child is
  // conditionally rendered on that flag, so the browser only fetches
  // the MP4 at that point. Disconnect immediately after firing.
  useEffect(() => {
    if (shouldLoadVideo) return;
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoadVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoadVideo]);

  // After the source has been swapped in, the browser doesn't pick up the
  // newly-added <source> child automatically — we need to nudge it with
  // .load() and then explicitly .play() since the initial autoplay
  // attempt already failed (no source was there to play).
  useEffect(() => {
    if (!shouldLoadVideo) return;
    const v = videoRef.current;
    if (!v) return;
    v.load();
    // Catch the autoplay-rejected promise so it doesn't show in the
    // console as an unhandled rejection on browsers that block it.
    void v.play().catch(() => {});
  }, [shouldLoadVideo]);

  // ────── The render loop ──────
  useEffect(() => {
    if (N === 0) return;
    let rafId = 0;
    let lastFrame = performance.now();
    let lastBallChange = lastFrame;
    let screwT = 0;
    let stage: "dwell" | "hop" = "dwell";
    let fromIdx = 0;
    let toIdx = 0;
    let arcFromPos = positionAt(tForIdx(0, 0));

    const tick = (t: number) => {
      // Clamp dt so backgrounded tabs don't burst-advance the screw
      const dt = Math.min(50, t - lastFrame);
      lastFrame = t;

      // Pause the screw motion while the user is hovering, so they have
      // time to read the title and click without chasing a moving target.
      if (hoveredRef.current === -1) {
        screwT = (screwT + dt / SCREW_PERIOD_MS) % 1;
      }

      // Position + opacity for every cover
      for (let i = 0; i < N; i++) {
        const el = coverRefs.current[i];
        if (!el) continue;
        const tEff = tForIdx(i, screwT);
        const pos = positionAt(tEff);
        const op = opacityAt(tEff);
        el.style.transform = `translate3d(${r(pos.x)}px, ${r(pos.y)}px, ${r(pos.z)}px)`;
        el.style.opacity = r(op);
      }

      // Ball state machine
      const elapsed = t - lastBallChange;

      if (stage === "dwell") {
        if (elapsed >= DWELL_MS) {
          // Transition: dwell → hop
          stage = "hop";
          lastBallChange = t;
          fromIdx = toIdx;
          toIdx = (toIdx + 1) % N;
          arcFromPos = positionAt(tForIdx(fromIdx, screwT));
          setLandedIndex(-1);
        } else {
          // Follow toIdx's current position (it's moving with the screw)
          const pos = positionAt(tForIdx(toIdx, screwT));
          const op = opacityAt(tForIdx(toIdx, screwT));
          // Landing squash: for the first LANDING_SQUASH_MS of dwell the
          // ball is recovering from impact — wide/flat — easing back to
          // its rest scale. After that window, stays at 1.0.
          let scaleX = 1;
          let scaleY = 1;
          if (elapsed < LANDING_SQUASH_MS) {
            const sq = elapsed / LANDING_SQUASH_MS;
            const eased = 1 - (1 - sq) * (1 - sq); // easeOut quad
            scaleY = (1 - LANDING_SQUASH_AMOUNT) + LANDING_SQUASH_AMOUNT * eased;
            scaleX = (1 + LANDING_SQUASH_AMOUNT) - LANDING_SQUASH_AMOUNT * eased;
          }
          if (ballRef.current) {
            ballRef.current.style.transform = `translate3d(${r(pos.x)}px, ${r(pos.y)}px, ${r(pos.z)}px) scale(${r(scaleX)}, ${r(scaleY)})`;
            ballRef.current.style.opacity = r(op);
          }
        }
      } else {
        // Hop in flight. Path is built in *cylindrical* helix coordinates
        // (angle, y, radius) rather than cartesian (x, y, z). That lets
        // the ball travel ALONG the helix surface from source to target,
        // and the radial-bulge term during mid-flight pushes it OUTSIDE
        // the helix surface — so it never plows through the inside of
        // the helix where other covers sit. Old straight-line lerp was
        // cutting through cover z-depths and disappearing behind them.
        const progress = Math.min(1, elapsed / HOP_MS);
        const targetNow = positionAt(tForIdx(toIdx, screwT));

        // Source angle (snapshot at hop start) + current target angle.
        // Resolve the short-path direction across the ±π wrap.
        const angleFromVal = Math.atan2(arcFromPos.z, arcFromPos.x);
        const angleToVal = Math.atan2(targetNow.z, targetNow.x);
        let dAngle = angleToVal - angleFromVal;
        if (dAngle > Math.PI) dAngle -= 2 * Math.PI;
        if (dAngle < -Math.PI) dAngle += 2 * Math.PI;
        const angleLerp = angleFromVal + dAngle * progress;

        // Radius lerp + outward sine bulge (peaks at mid-flight)
        const fromRadius = Math.hypot(arcFromPos.x, arcFromPos.z);
        const toRadius = Math.hypot(targetNow.x, targetNow.z);
        const radiusLerp = fromRadius + (toRadius - fromRadius) * progress;
        const bulge = OUTWARD_BULGE * Math.sin(Math.PI * progress);
        const radius = radiusLerp + bulge;

        const finalX = Math.cos(angleLerp) * radius;
        const finalZ = Math.sin(angleLerp) * radius;

        // Y: linear lerp + sine arc bump (negative Y = up in screen space)
        const yLerp = arcFromPos.y + (targetNow.y - arcFromPos.y) * progress;
        const arcOff = -ARC_HEIGHT * Math.sin(Math.PI * progress);
        const finalY = yLerp + arcOff;

        // Squash & stretch: vertical elongation at the arc apex, slight
        // horizontal squeeze to roughly preserve volume. Reads as "ball
        // tracking the motion vector" — classic Disney principle.
        const stretchT = HOP_STRETCH * Math.sin(Math.PI * progress);
        const scaleY = 1 + stretchT;
        const scaleX = 1 / (1 + stretchT); // approximate volume preserve

        // Ball opacity: max of source/target so it stays visible during
        // a wrap-crossing hop.
        const sourceOp = opacityAt(tForIdx(fromIdx, screwT));
        const targetOp = opacityAt(tForIdx(toIdx, screwT));
        const op = Math.max(sourceOp, targetOp);

        if (ballRef.current) {
          ballRef.current.style.transform = `translate3d(${r(finalX)}px, ${r(finalY)}px, ${r(finalZ)}px) scale(${r(scaleX)}, ${r(scaleY)})`;
          ballRef.current.style.opacity = r(op);
        }
        if (progress >= 1) {
          stage = "dwell";
          lastBallChange = t;
          setLandedIndex(toIdx);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // Re-mount the loop when the breakpoint flips so its closure picks
    // up the new geometry (RADIUS / HEIGHT / etc.). N change is also
    // a re-mount trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N, isDesktop]);

  return (
    <div className="relative flex flex-col items-center">
      {/*
        Headline above the spiral. Eyebrow is a small accent CTA line,
        the main heading slides up via RevealHeading on first scroll
        and re-triggers on subsequent passes (same rhythm as the
        AboutSection / SongGrid H2s).
      */}
      <div className="mx-auto max-w-3xl px-4 pt-12 text-center md:pt-16">
        <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.4em] text-[var(--color-accent)] md:text-xs">
          תלחצו לבחירה · TAP TO PLAY
        </p>
        <RevealHeading
          as="h2"
          className="mt-3 font-[var(--font-display-he)] text-3xl font-black leading-[1.05] md:text-5xl"
        >
          הגיע הזמן לשמוע שיר טוב
        </RevealHeading>
      </div>

    <div
      ref={containerRef}
      className="relative flex items-center justify-center pt-2 pb-16 md:-mt-8 md:pt-0 md:pb-20"
      style={{ perspective: `${PERSPECTIVE}px` }}
    >
      <motion.div
        className="relative h-[440px] w-[280px] md:h-[600px] md:w-[720px]"
        style={{
          transformStyle: "preserve-3d",
          rotateX: smoothRotateX,
          scale: smoothScale,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/*
            Microphone video at the centre of the helix axis. Sits at
            translate3d(0,0,0) in helix-local space, so:
              • covers at +z (front of helix) render IN FRONT of it
              • covers at −z (back) render BEHIND it
              • covers at extreme x  pass it on the sides
            That's the "covers orbit the microphone" composition.

            Lives inside the same preserve-3d container as the covers
            (so the scroll-driven rotateX + scale on the outer
            motion.div applies to it too — the video tilts with the
            helix as the user scrolls through the section).

            pointer-events-none so it never blocks a click on a cover
            that visually overlaps it. aria-hidden because it's pure
            decoration.
          */}
          {(() => {
            // Part-of-the-spiral mode: small + diagonal, but sitting ON
            // the central axis (z=0) so it lives INSIDE the helix, not
            // behind it as scenery. The covers naturally orbit around
            // it — some in front (covers at +z), some behind (covers at
            // -z) — which is the composition the user wants.
            //
            //   • HEIGHT × 0.75 (vs the original 1.25) — smaller so
            //     when covers pass in front they don't visually engulf
            //     the mic.
            //   • rotateZ(18deg) — diagonal across the rows of the
            //     helix instead of bolt-upright.
            //   • translate3d(0, 0, 0) — on the helix axis. Part of
            //     the structure, not a backdrop.
            const VIDEO_H = Math.round(HEIGHT * 0.75);
            const VIDEO_W = Math.round((VIDEO_H * 9) / 16);
            const DIAGONAL_DEG = 25;
            return (
              <video
                ref={videoRef}
                className="pointer-events-none absolute left-1/2 top-1/2 select-none"
                style={{
                  width: `${VIDEO_W}px`,
                  height: `${VIDEO_H}px`,
                  marginLeft: `-${VIDEO_W / 2}px`,
                  marginTop: `-${VIDEO_H / 2}px`,
                  transform: `translate3d(0px, 0px, 0px) rotateZ(${DIAGONAL_DEG}deg)`,
                  objectFit: "cover",
                  // No box-shadow / border — the WebM has a real alpha
                  // channel now, so anything we attach to the rectangular
                  // <video> bounding box (drop-shadow, halo, frame, etc.)
                  // betrays the rectangular crop and breaks the illusion
                  // that the mic is floating inside the helix. The mic's
                  // own gold elements already provide their own light;
                  // nothing else is needed around the frame.
                }}
                autoPlay
                loop
                muted
                playsInline
                preload="none"
                poster="/mic-rotating-poster.png"
                aria-hidden
              >
                {/*
                  Source order matters — the browser picks the first
                  type it can decode:
                    1. WebM/VP9 with yuva420p alpha channel (chroma-keyed
                       at encode time) → Chrome, Firefox, Edge see the
                       mic with a transparent background, and the back
                       covers of the helix show THROUGH the gaps in the
                       gold microphone artwork.
                    2. MP4/H.264 fallback (opaque, black background) →
                       Safari and older browsers. Since the site bg is
                       also near-black, the black bg blends into the
                       page; the back covers aren't visible through the
                       mic on these clients but the composition still
                       reads correctly.
                */}
                {shouldLoadVideo && (
                  <>
                    <source src="/mic-rotating-alpha.webm" type="video/webm" />
                    <source src="/mic-rotating.mp4" type="video/mp4" />
                  </>
                )}
              </video>
            );
          })()}

          {songs.map((song, i) => {
            // Initial render uses screwT=0 → same positions as the old
            // static helix. The rAF loop takes over from frame 1, so a
            // moment-zero flash, if any, is just the legacy layout.
            const initT = N <= 1 ? 0.5 : i / (N - 1);
            const initPos = positionAt(initT);
            const initOp = opacityAt(initT);
            const isLanded = i === landedIndex;
            const isHovered = i === hoveredIndex;
            const isLit = isLanded || isHovered;
            const scaleAmount = isHovered ? 1.18 : isLanded ? 1.15 : 1;

            return (
              <div
                ref={(el) => {
                  coverRefs.current[i] = el;
                }}
                key={song.title}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: `${COVER}px`,
                  height: `${COVER}px`,
                  marginLeft: `-${COVER / 2}px`,
                  marginTop: `-${COVER / 2}px`,
                  transform: `translate3d(${r(initPos.x)}px, ${r(initPos.y)}px, ${r(initPos.z)}px)`,
                  opacity: r(initOp),
                  willChange: "transform, opacity",
                  transformStyle: "preserve-3d",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenSong(song)}
                  aria-label={`${song.title} — בחר/י פלטפורמה להשמעה`}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() =>
                    setHoveredIndex((h) => (h === i ? -1 : h))
                  }
                  onFocus={() => setHoveredIndex(i)}
                  onBlur={() =>
                    setHoveredIndex((h) => (h === i ? -1 : h))
                  }
                  className="block h-full w-full cursor-pointer overflow-hidden border-2 bg-transparent p-0 transition-[border-color,box-shadow,transform] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  style={{
                    borderColor: isLit
                      ? "var(--color-accent)"
                      : "var(--color-border-strong)",
                    boxShadow: isLit
                      ? "0 12px 32px rgba(0, 0, 0, 0.55), 0 0 36px rgba(223, 225, 4, 0.75)"
                      : "0 12px 32px rgba(0, 0, 0, 0.55), 0 0 16px rgba(223, 225, 4, 0.15)",
                    transform: `scale(${scaleAmount})`,
                  }}
                >
                  <img
                    src={song.artwork}
                    alt={song.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </button>
              </div>
            );
          })}

          {/*
            Bouncing 3D ball. Built to read as a sphere:
              - radial-gradient hotspot at (32%, 28%) suggests a light source
              - inset bottom-right shadow gives the terminator (curved edge)
              - inset top-left highlight makes the bright spot read as raised
              - 14/32/60 px outer halo for emissive glow + cast onto covers
          */}
          <div
            ref={ballRef}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: `${BALL}px`,
              height: `${BALL}px`,
              marginLeft: `-${BALL / 2}px`,
              marginTop: `-${BALL / 2}px`,
              transform: `translate3d(${r(positionAt(0).x)}px, ${r(positionAt(0).y)}px, ${r(positionAt(0).z)}px)`,
              willChange: "transform, opacity",
              // Two-layer background:
              //   1. Bottom: ambient-occlusion shadow (soft dark wash at the
              //      bottom of the ball, where a real sphere would have less
              //      light bounce). Subtle but it sells the curvature.
              //   2. Top: the sphere itself — six gradient stops between the
              //      near-white hotspot at (32%, 28%) and a deep olive rim,
              //      so the falloff reads as smooth shading instead of
              //      banded color steps.
              background: [
                "radial-gradient(ellipse 75% 55% at 50% 100%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 70%)",
                "radial-gradient(circle at 32% 28%, #ffffe5 0%, #fcfd7d 10%, #f6f724 26%, #DFE104 50%, #a8a900 78%, #565600 100%)",
              ].join(", "),
              boxShadow: [
                // Terminator (curved edge falling into shadow, bottom-right)
                "inset -2px -3px 6px rgba(0, 0, 0, 0.50)",
                // Specular raised-bump on the highlight side (top-left)
                "inset 1.5px 2px 3px rgba(255, 255, 255, 0.30)",
                // Emissive halo stack
                "0 0 14px rgba(223, 225, 4, 0.85)",
                "0 0 32px rgba(223, 225, 4, 0.55)",
                "0 0 60px rgba(223, 225, 4, 0.25)",
              ].join(", "),
            }}
          />
        </div>
      </motion.div>

      {/* Bottom caption — prefers hovered title, falls back to ball's landed */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-1 md:bottom-6">
        <div className="h-5 md:h-6">
          <AnimatePresence mode="wait">
            {(() => {
              const captionIndex =
                hoveredIndex >= 0 ? hoveredIndex : landedIndex;
              if (captionIndex < 0) return null;
              return (
                <motion.span
                  key={songs[captionIndex].title}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="block font-[var(--font-display-he)] text-sm font-black text-[var(--color-accent)] md:text-base"
                  style={{ textShadow: "0 0 18px rgba(223, 225, 4, 0.45)" }}
                >
                  {songs[captionIndex].title}
                </motion.span>
              );
            })()}
          </AnimatePresence>
        </div>
        <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.5em] text-[var(--color-muted-fg)] md:text-xs">
          · CALIBER FAMILY · DISCOGRAPHY ·
        </span>
      </div>

      {/* Platform picker for spiral covers (same modal the song grid uses) */}
      <PlatformPicker song={openSong} onClose={() => setOpenSong(null)} />
    </div>
    </div>
  );
}
