# Caliber Family — Home page override

Overrides MASTER.md for the homepage (and globally — there's only one page).

## Aesthetic direction: **Kinetic Brutalism** (adapted from styles.csv result)

Rationale: hip-hop/trap demands raw energy + high contrast. Brutalism + acid yellow + infinite marquees + sharp 0-radius edges hit the street aesthetic far better than the SaaS-y default the design-system generator picked. Kept the dark-mode base from MASTER.md, swapped the palette and typography.

## Tokens

```css
--bg: #09090B;          /* Rich Black */
--fg: #FAFAFA;
--muted: #18181B;
--muted-fg: #A1A1AA;
--accent: #DFE104;      /* Acid Yellow — primary CTA, hover floods, marquees */
--accent-fg: #000000;
--secondary-accent: #FF3D00;  /* Blood Orange — used sparingly for emphasis */
--border: #27272A;
--border-strong: #3F3F46;
--radius: 0px;          /* Sharp everything */
--border-width: 2px;
--shadow: none;         /* Brutalism doesn't shadow */

--font-display-he: "Anek Hebrew", "Suez One", system-ui;  /* Hebrew display */
--font-display-en: "Space Grotesk", "Inter", system-ui;   /* Latin display, hip-hop standard */
--font-body: "Heebo", "Inter", system-ui;
--font-mono: "JetBrains Mono", "Space Mono", monospace;   /* Numbers, durations, dates */

--marquee-speed: 18s;
--press-duration: 100ms;
--transition-fast: 100ms;
--transition-medium: 250ms;
```

## Typography scale (mobile-first; scale up at md+)

| Token | Size | Weight | Use |
|---|---|---|---|
| display-xl | 96px / 110px md+ | 900 | Hero band name |
| display-lg | 60px / 80px md+ | 900 | Section headers |
| display-md | 40px | 800 | Song titles in grid |
| body | 16px | 400 | Default text |
| label | 12px uppercase letter-spacing 2px | 600 | Tags, dates, durations |

All display text in Hebrew uses **Anek Hebrew Black 900** (or Heebo Black as fallback). Latin band name treatment can use **Space Grotesk 900**.

## Motion language

- **Infinite marquees** at the top (band name) and bottom (album titles list), 18s loop, linear easing, no fade edges.
- **Hero scroll behavior:** the hero video element is sticky for `300vh`. As user scrolls, the video element's `currentTime` is scrubbed proportionally (via GSAP ScrollTrigger). When the video completes (~70% scroll progress), it fades and reveals the song grid below.
- **Card hover:** 3D tilt (max 12deg rotateX/Y based on mouse position), inversion on press (bg → acid yellow, text → black), 100ms color transition.
- **Page transitions:** none (single page).
- **Always-on:** persistent SVG grain noise overlay at 6% opacity, fixed-position, pointer-events-none.
- **Reduced motion:** disable scrub, marquee, tilt; replace with fades only.

## Pattern overrides (NOT minimal single column — we use bento)

| Section | Pattern |
|---|---|
| 0. Marquee bar | Infinite horizontal scroll of band name + accent diamonds |
| 1. Hero | Pinned scroll-scrub video (or animated album cover stack for fallback), band name overlay, scroll cue |
| 2. Latest single spotlight | Large card, autoplay 30s Apple preview, 3 platform buttons |
| 3. Song bento grid | 17 songs in irregular bento layout. 6 newest get larger tiles. Cards tilt on hover, click → PlatformPicker modal |
| 4. About strip | Short bio, "8 חודשים, 17 סינגלים" stat block |
| 5. Footer | Big Latin "CALIBER FAMILY" mark, 3 platform icons, copyright, second marquee |

## Anti-patterns to avoid (project-specific)

- Don't use rounded corners anywhere — breaks brutalism.
- Don't use soft drop-shadows for cards — use border-2 instead.
- Don't use emojis in UI — SVG icons only (Lucide React).
- Don't autoplay audio with sound — Apple preview button starts muted, user-initiated only.
- Don't use color alone to indicate "no YouTube available" on a song card — also remove the YouTube icon and reduce button count.
