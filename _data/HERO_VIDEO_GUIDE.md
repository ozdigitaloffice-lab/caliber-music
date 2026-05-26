# Hero Video — filming & deployment guide

The homepage hero is set up to display a **scroll-driven video** (Apple-style scrub).
When the user scrolls, the video plays forward; scrolling back plays it backwards.
This works perfectly on every device including iOS — we use an image-sequence
trick instead of an HTML5 `<video>` element to avoid mobile-Safari seek lag.

Until you film the clip, the hero falls back to the latest album artwork
(`אמא אדמה`) as a static backdrop with a Ken-Burns scroll effect.

---

## 1. Print the sign (one-time, ~5 min)

```
File:  _data/sign-print.svg
```

1. Open `_data/sign-print.svg` in Chrome or Edge
2. `Ctrl+P` → **Destination:** Save as PDF → print the PDF on A3 landscape
3. Glue/tape it to foamboard so it stays flat on camera

The sign reads **משפחת קליבר** in big acid-yellow Suez One on black,
with **HIP-HOP · TRAP · URBAN** subtitle. Identical typography to the
site, so the moment on camera + the moment on screen feel like one brand.

---

## 2. Film the clip (~30 min)

### Equipment
- Phone in **landscape** mode (horizontal) — vertical won't fit
- **Tripod or steady surface** — handheld shake gets amplified after scrub
- 4K if available (will be downscaled to 1280×720 anyway, but more pixels = sharper)
- **30 fps** (check phone camera settings)

### The arc — 10-12 seconds total
| Seconds | What happens |
|--------:|--------------|
| 0–2 | Empty frame (street / wall / location, no people yet) |
| 2–4 | People walk in from the sides |
| 4–7 | Settle in center |
| 7–10 | Lift the sign, big reveal |
| 10–12 | Hold it proudly, still |

The scroll experience: user lands on the page → sees frame 1 (empty scene),
scrolls down → people enter → scrolls more → sign reveals at the moment the
song grid appears.

### Composition
- Frame the empty scene first — that's frame 1, the establishing shot
- Leave room for people to walk INTO the frame, not be in it from the start
- Sign should be readable when held up — don't tilt it, don't go too small
- Avoid the sun behind people (turns them into silhouettes)

### Location
- **Outdoor urban** = perfect (street, alley, graffiti wall, parking lot)
- Avoid indoor — feels off-brand for hip-hop hero
- Avoid super-bright midday sun — golden hour or overcast is best

---

## 3. Deploy the clip (~2 min)

```bash
# Drop your phone video here (any format: .mp4, .mov, .webm, .mkv)
cp <your-filmed-clip>  C:\caliber-family\_data\hero-source.mp4

# Run the pipeline — this slices the video into 300 JPGs at 1280×720
cd C:\caliber-family
python _data\build_frames.py

# Reload the dev server (or just refresh the browser)
```

That's it. The HeroSequence component detects `public/hero-seq/manifest.json`
and switches from the static-image fallback to the scrub video automatically.

### What the script does to your video
- Trims to 12 seconds max (longer = wasted bytes, scroll feels sluggish)
- Resamples to 30 fps (smooth scrub, predictable frame budget)
- Scales to 1280×720, crops to 16:9 (covers the hero edge-to-edge)
- Light color grade: −8% saturation, +3% brightness (matches dark-mode hero)
- 1% film grain (matches the SVG grain overlay everywhere else)
- Strips audio (we don't need it for a muted hero)
- Writes ~300 JPG frames + `manifest.json` to `public/hero-seq/`
- Total output: ~3-4 MB (well under any mobile budget)

### Push & deploy
```bash
git add public/hero-seq _data/hero-source.mp4   # commit the source for reproducibility
git commit -m "Add hero video clip"
git push                                          # Vercel auto-deploys
```

Vercel will serve the JPGs from its CDN — first paint is fast, the 3-4MB
preloads in background while the user reads the hero text, and by the time
they start scrolling, every frame is already in memory.

---

## 4. Iterating

Want to swap the clip later?

```bash
# Replace the source
cp <new-clip>  C:\caliber-family\_data\hero-source.mp4
python _data\build_frames.py   # regenerates frames in place
git commit -am "Update hero video"
git push
```

Want a longer clip? Edit `MAX_FRAMES` in `_data/build_frames.py`. Note that
longer = bigger payload and slower preload — 300-360 frames is the sweet spot.

Want a different aspect or quality? `WIDTH`, `HEIGHT`, `JPG_QUALITY` are
constants at the top of the same file.

---

## Behind the scenes

The React component is `src/components/HeroSequence.tsx`:
1. Reads `public/hero-seq/manifest.json` at build time
2. Preloads every frame into JS `Image` objects (`Promise.all`)
3. Shows a tiny acid-yellow progress bar while loading
4. Once loaded, uses GSAP `ScrollTrigger` to map scroll progress → frame index
5. Draws the current frame to a `<canvas>` at devicePixelRatio precision
6. Falls back to a static mid-frame for users with `prefers-reduced-motion`

The hero section is 250vh tall — so the user scrolls 2.5 screens of motion
to see the full video before hitting the song grid.
