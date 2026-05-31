"""
Convert any source video into a WebP image sequence for scroll-driven playback.

Usage:
    # Hero (default — backwards-compatible):
    python _data/build_frames.py

    # Any other clip with custom output:
    python _data/build_frames.py \
        --source _data/envelope-source.mp4 \
        --out    public/envelope-seq \
        --width 1024 --height 576 --fps 24

The matching React component picks up the manifest.json in the output dir
and falls back gracefully if frames aren't present.

What this script does to your video:
- Strips audio (muted hero/envelope animation)
- Resamples fps as specified
- Cover-crops to target dimensions
- Subtle color grading (-8% saturation, +3% brightness)
- 1% film-grain noise (matches the SVG grain overlay site-wide)
- Outputs WebP at configurable quality
"""
from __future__ import annotations
import argparse
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

# Defaults match the original hero pipeline so `python build_frames.py` with
# no args still rebuilds the hero unchanged. Other clips override via CLI.
DEFAULT_SOURCE = ROOT / "_data" / "hero-source.mp4"
DEFAULT_OUT    = ROOT / "public" / "hero-seq"
DEFAULT_FPS    = 30
DEFAULT_WIDTH  = 720
DEFAULT_HEIGHT = 720
WEBP_QUALITY   = 55  # WebP q55 ≈ JPG q72 visually but ~30% smaller for photographic content
DEFAULT_MAX    = 360 # cap frames so long clips don't bloat the payload


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source", type=Path, default=DEFAULT_SOURCE,
                   help="Path to the source video (default: hero-source.mp4)")
    p.add_argument("--out",    type=Path, default=DEFAULT_OUT,
                   help="Output directory under public/ (default: public/hero-seq)")
    p.add_argument("--width",  type=int,  default=DEFAULT_WIDTH)
    p.add_argument("--height", type=int,  default=DEFAULT_HEIGHT)
    p.add_argument("--fps",    type=int,  default=DEFAULT_FPS)
    p.add_argument("--max-frames", type=int, default=DEFAULT_MAX)
    p.add_argument("--quality", type=int, default=WEBP_QUALITY)
    args = p.parse_args()

    ffmpeg = find_ffmpeg()
    if not args.source.exists():
        print(f"ERROR: source video not found at {args.source}", file=sys.stderr)
        sys.exit(2)

    # Wipe + recreate output dir so leftover frames from a longer prior build
    # don't sneak into the manifest count.
    if args.out.exists():
        shutil.rmtree(args.out)
    args.out.mkdir(parents=True, exist_ok=True)

    vf = ",".join([
        f"fps={args.fps}",
        f"scale={args.width}:{args.height}:force_original_aspect_ratio=increase",
        f"crop={args.width}:{args.height}",
        "eq=brightness=0.03:saturation=0.92",
        "noise=alls=4:allf=t",
    ])

    cmd = [
        ffmpeg, "-y",
        "-i", str(args.source),
        "-vf", vf,
        "-an",                                # strip audio
        "-frames:v", str(args.max_frames),    # cap
        "-c:v", "libwebp",
        "-quality", str(args.quality),
        "-preset", "photo",
        "-compression_level", "6",
        str(args.out / "frame-%03d.webp"),
    ]
    print(f"Running ffmpeg on {args.source.name}…")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        sys.exit(r.returncode)

    frames = sorted(args.out.glob("frame-*.webp"))
    if not frames:
        print("ERROR: ffmpeg ran but produced no frames", file=sys.stderr)
        sys.exit(3)

    total_size = sum(f.stat().st_size for f in frames)
    manifest = {
        "frameCount": len(frames),
        "width":  args.width,
        "height": args.height,
        "fps":    args.fps,
        "filenamePattern": "frame-{n:03d}.webp",
        "totalBytes": total_size,
    }
    (args.out / "manifest.json").write_text(json.dumps(manifest, indent=2))

    avg_kb = total_size // len(frames) // 1024
    total_mb = total_size / 1024 / 1024
    print(f"\n✓ Wrote {len(frames)} frames to {args.out}")
    print(f"  resolution: {args.width}x{args.height}")
    print(f"  total size: {total_mb:.1f} MB ({avg_kb} KB avg/frame)")
    print(f"  manifest:   {args.out / 'manifest.json'}")


if __name__ == "__main__":
    main()
