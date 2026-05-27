"""
Convert a source hero video into a JPG image sequence for scroll-driven playback.

Usage:
    1. Drop your filmed clip at: _data/hero-source.mp4 (any common format works)
    2. Run: python _data/build_frames.py
    3. Frames land in: public/hero-seq/frame-001.jpg ... frame-NNN.jpg
       + manifest.json (with frame count + dimensions for the React side)

The HeroSequence component auto-discovers the manifest and falls back to the
album-art Hero if frames aren't present.

What this script does to your video:
- Strips audio (we don't need it for a muted hero)
- Resamples to 30 fps (smooth scrub without overshooting frame budget)
- Crops to 16:9 if needed (covers the hero viewport edge-to-edge)
- Scales to 1280x720 (HD, sharp; ~12KB/frame at q85)
- Subtle color grading: -8% saturation, +3% brightness (matches dark-mode hero)
- Subtle film-grain noise (1%) baked in (matches the persistent SVG grain
  overlay everywhere else)
"""
from __future__ import annotations
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

# Locate ffmpeg — falls back to PATH if installed globally, otherwise uses the
# Windows winget install location we found on this machine.
def find_ffmpeg() -> str:
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    winget = Path(
        os.path.expandvars(
            r"%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
        )
    )
    if winget.exists():
        for exe in winget.rglob("ffmpeg.exe"):
            return str(exe)
    raise RuntimeError(
        "ffmpeg not found. Install with: winget install Gyan.FFmpeg"
    )

ROOT = Path("C:/caliber-family")
SOURCE = ROOT / "_data" / "hero-source.mp4"
OUT_DIR = ROOT / "public" / "hero-seq"

# Target spec — tuned for ~5-6MB total payload at a smooth scrub experience.
# Square output (1080×1080) so the source video's framing is preserved regardless
# of how the source was shot (landscape, portrait, or square). The Canvas
# component then cover-fits the square to whatever viewport ratio is on screen,
# cropping equal margins from sides (desktop) or top+bottom (mobile portrait).
# Action centered in the square frame = visible everywhere.
FPS = 30             # match source rate → no downsample artifacts, more frames for smoother scrub
WIDTH = 720
HEIGHT = 720
JPG_QUALITY = 8      # ffmpeg -q:v: 2=best, 31=worst. 8 ≈ q72; offsets the extra frame count.
MAX_FRAMES = 360     # 12 seconds @ 30fps. Source longer than this gets trimmed.


def main() -> None:
    ffmpeg = find_ffmpeg()
    if not SOURCE.exists():
        print(f"ERROR: place your filmed clip at {SOURCE}", file=sys.stderr)
        print("       (any common format works: .mp4, .mov, .webm, .mkv)", file=sys.stderr)
        sys.exit(2)

    # Wipe + recreate the output dir so we don't mix old + new frames if the
    # source got shorter.
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Build the filter graph. Order matters:
    #   1. fps=30           — resample input to 30fps regardless of source rate
    #   2. scale=...        — fit to 1280x720 covering (no letterbox)
    #   3. crop=...         — exact 1280x720
    #   4. eq=brightness... — mild tone grading (subtle, not aggressive)
    #   5. noise=...        — film grain matching our SVG overlay
    # Note: order matters in the filter chain.
    #   1. fps=30                    — resample input regardless of source rate
    #   2. scale ... increase + crop — cover-fit then crop center → exact target
    #   3. eq=brightness=...         — mild tone grading (subtle, not aggressive)
    #   4. noise=...                 — film grain matching our SVG overlay
    vf = ",".join([
        f"fps={FPS}",
        f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase",
        f"crop={WIDTH}:{HEIGHT}",
        "eq=brightness=0.03:saturation=0.92",
        "noise=alls=4:allf=t",
    ])

    cmd = [
        ffmpeg, "-y",
        "-i", str(SOURCE),
        "-vf", vf,
        "-an",                      # strip audio
        "-frames:v", str(MAX_FRAMES),  # cap
        "-q:v", str(JPG_QUALITY),   # JPG quality
        str(OUT_DIR / "frame-%03d.jpg"),
    ]
    print("Running ffmpeg…")
    print("  " + " ".join(cmd[:1] + ["..."] + cmd[-3:]))
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        sys.exit(r.returncode)

    frames = sorted(OUT_DIR.glob("frame-*.jpg"))
    if not frames:
        print("ERROR: ffmpeg ran but produced no frames", file=sys.stderr)
        sys.exit(3)

    total_size = sum(f.stat().st_size for f in frames)
    manifest = {
        "frameCount": len(frames),
        "width": WIDTH,
        "height": HEIGHT,
        "fps": FPS,
        "filenamePattern": "frame-{n:03d}.jpg",   # client uses n = 1..frameCount
        "totalBytes": total_size,
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2))

    avg_kb = total_size // len(frames) // 1024
    total_mb = total_size / 1024 / 1024
    print(f"\n✓ Wrote {len(frames)} frames to {OUT_DIR}")
    print(f"  resolution: {WIDTH}x{HEIGHT}")
    print(f"  total size: {total_mb:.1f} MB ({avg_kb} KB avg/frame)")
    print(f"  manifest:   {OUT_DIR / 'manifest.json'}")
    print(f"\nReload the dev server — HeroSequence will pick it up automatically.")


if __name__ == "__main__":
    main()
