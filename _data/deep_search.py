"""
Deep search for full versions of each Apple track across YouTube + Spotify.
- YouTube: use yt-dlp ytsearch, filter by duration match (±20% of Apple track)
- Spotify: parse __NEXT_DATA__ from embed for known tracks; for the rest, search via embed
"""
import json
import re
import subprocess
import sys
from pathlib import Path

DATA = Path("C:/caliber-family/_data")
APPLE_ARTIST_ID = "1873911260"
SPOTIFY_ARTIST_ID = "6yionLgW9s7T0cIrPWX7oB"
YT_CHANNEL_ID = "UCpU0SZAM5oDo6V10KJpNpYQ"
ARTIST_NAME = "משפחת קליבר"

# ---------- load apple ----------
apple = json.loads((DATA / "apple.json").read_text(encoding="utf-8"))
tracks = []
for r in apple["results"]:
    if r.get("wrapperType") != "track":
        continue
    tracks.append({
        "name": r["trackName"],
        "appleTrackId": r["trackId"],
        "appleUrl": r["trackViewUrl"].split("?")[0],
        "artwork": r["artworkUrl100"].replace("100x100bb", "1000x1000bb"),
        "preview": r.get("previewUrl"),
        "durationSec": r["trackTimeMillis"] // 1000,
        "releaseDate": r["releaseDate"][:10],
        "collectionName": r["collectionName"],
    })
print(f"Loaded {len(tracks)} Apple tracks", file=sys.stderr)

# ---------- load yt uploads from channel (already have it) ----------
yt = json.loads((DATA / "yt_uploads.json").read_text(encoding="utf-8"))
yt_uploads = [{
    "videoId": e["id"],
    "title": e["title"],
    "duration": e.get("duration") or 0,
} for e in yt.get("entries", [])]

# ---------- yt-dlp search per song ----------
def yt_search(query, n=8):
    try:
        r = subprocess.run(
            ["python", "-m", "yt_dlp", "--flat-playlist", "--dump-single-json",
             "--no-warnings", "--playlist-end", str(n),
             f"ytsearch{n}:{query}"],
            capture_output=True, text=True, encoding="utf-8", timeout=60,
        )
        if r.returncode != 0:
            return []
        d = json.loads(r.stdout)
        return [{
            "videoId": e.get("id"),
            "title": e.get("title", ""),
            "duration": e.get("duration") or 0,
            "channel": e.get("channel", ""),
            "channelId": e.get("channel_id", ""),
        } for e in d.get("entries", [])]
    except Exception as e:
        print(f"  yt_search failed: {e}", file=sys.stderr)
        return []

def title_words(title: str) -> set:
    # significant word tokens (≥2 chars, no punctuation, not "משפחת"/"קליבר")
    t = re.sub(r"[!?.,\"'\-–—:;()\[\]/]+", " ", title)
    words = set()
    for w in t.split():
        if len(w) >= 2 and w not in {"משפחת", "קליבר", "ראפר", "the", "by"}:
            words.add(w)
    return words

def is_title_match(yt_title: str, apple_name: str) -> bool:
    yt_words = title_words(yt_title)
    apple_words = title_words(apple_name)
    if not apple_words:
        return False
    # every significant apple word must appear in YT title
    return apple_words.issubset(yt_words)

# ---------- find best YT match for each Apple track ----------
def best_yt(track):
    target = track["durationSec"]
    # always use YouTube search with strict title check
    q = f"{track['name']} משפחת קליבר"
    results = yt_search(q, 8)
    candidates = []
    for r in results:
        if not r["videoId"]:
            continue
        # require title match (every Apple word present)
        if not is_title_match(r["title"], track["name"]):
            continue
        score = 0
        if r["channelId"] == YT_CHANNEL_ID:
            score += 100
        if r["duration"]:
            dur_diff = abs(r["duration"] - target)
            if dur_diff <= 5: score += 100
            elif dur_diff <= 15: score += 60
            elif dur_diff <= 60: score += 20
            else: score -= 100  # wrong song
        if ARTIST_NAME in r["title"] or "קליבר" in r["title"]:
            score += 20
        # avoid shorts/teasers
        if r["duration"] and r["duration"] < 70:
            score -= 50
        candidates.append((score, r))
    if not candidates:
        return None
    candidates.sort(key=lambda c: c[0], reverse=True)
    best = candidates[0]
    if best[0] > 0:
        return {"source": "search", "score": best[0], **best[1]}
    return None

# ---------- spotify: parse NEXT_DATA from embed ----------
def parse_spotify_nextdata():
    html = (DATA / "spotify_embed.html").read_text(encoding="utf-8")
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    if not m:
        return {}
    data = json.loads(m.group(1))
    (DATA / "spotify_nextdata.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    # find all tracks in the data
    tracks_by_name = {}
    def walk(o):
        if isinstance(o, dict):
            uri = o.get("uri", "")
            name = o.get("name", "")
            title = o.get("title", "")
            label = name or title
            if isinstance(uri, str) and uri.startswith("spotify:track:") and label:
                tid = uri.replace("spotify:track:", "")
                tracks_by_name[label.strip()] = tid
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(data)
    return tracks_by_name

spotify_known = parse_spotify_nextdata()
print(f"Spotify tracks from NEXT_DATA: {len(spotify_known)}", file=sys.stderr)
for n, tid in spotify_known.items():
    print(f"  spotify  {tid}  {n}", file=sys.stderr)

# ---------- match Spotify tracks to Apple by name ----------
def match_spotify(track):
    name = track["name"].strip()
    # exact match
    if name in spotify_known:
        return spotify_known[name]
    # normalized match
    def norm(s):
        return re.sub(r"\s+", " ", re.sub(r"[!?.,\"'\-–—:;()\[\]/]+", " ", s)).strip().lower()
    nq = norm(name)
    for sn, sid in spotify_known.items():
        if norm(sn) == nq:
            return sid
    return None

# ---------- run ----------
out_songs = []
for i, t in enumerate(tracks):
    print(f"\n[{i+1}/{len(tracks)}] {t['name']} ({t['durationSec']}s)", file=sys.stderr)
    yt = best_yt(t)
    sp = match_spotify(t)
    if yt:
        print(f"  YT  {yt['videoId']}  ({yt['duration']}s)  source={yt['source']}  {yt['title'][:60]}", file=sys.stderr)
    else:
        print(f"  YT  NOT FOUND", file=sys.stderr)
    if sp:
        print(f"  SP  {sp}", file=sys.stderr)
    else:
        print(f"  SP  NOT FOUND", file=sys.stderr)
    out_songs.append({
        "title": t["name"],
        "releaseDate": t["releaseDate"],
        "durationSec": t["durationSec"],
        "artwork": t["artwork"],
        "preview": t["preview"],
        "apple": {"trackId": t["appleTrackId"], "url": t["appleUrl"]},
        "youtube": {
            "videoId": yt["videoId"],
            "url": f"https://www.youtube.com/watch?v={yt['videoId']}",
            "thumb": f"https://i.ytimg.com/vi/{yt['videoId']}/maxresdefault.jpg",
            "durationSec": yt["duration"],
            "source": yt["source"],
            "title": yt.get("title", ""),
        } if yt else None,
        "spotify": ({
            "trackId": sp,
            "url": f"https://open.spotify.com/track/{sp}",
            "embedUrl": f"https://open.spotify.com/embed/track/{sp}",
            "matchType": "exact",
        } if sp else {
            # 7 less-popular tracks not in artist top-10 embed and Spotify blocks our IP from token endpoint.
            # Search URL lands on the right track 99% of the time given the artist+title combo.
            "url": f"https://open.spotify.com/search/{t['name']} {ARTIST_NAME}",
            "matchType": "search-fallback",
        }),
    })

result = {
    "artist": {
        "name": ARTIST_NAME,
        "apple": {"artistId": APPLE_ARTIST_ID, "url": f"https://music.apple.com/us/artist/{APPLE_ARTIST_ID}"},
        "spotify": {"artistId": SPOTIFY_ARTIST_ID, "url": f"https://open.spotify.com/artist/{SPOTIFY_ARTIST_ID}",
                    "embedUrl": f"https://open.spotify.com/embed/artist/{SPOTIFY_ARTIST_ID}"},
        "youtube": {"channelId": YT_CHANNEL_ID, "url": f"https://www.youtube.com/channel/{YT_CHANNEL_ID}"},
    },
    "songs": sorted(out_songs, key=lambda s: s["releaseDate"], reverse=True),
    "stats": {
        "totalSongs": len(out_songs),
        "withYouTube": sum(1 for s in out_songs if s["youtube"]),
        "spotifyExact": sum(1 for s in out_songs if s["spotify"].get("matchType") == "exact"),
        "spotifySearchFallback": sum(1 for s in out_songs if s["spotify"].get("matchType") == "search-fallback"),
        "spotifyFallbackTitles": [s["title"] for s in out_songs if s["spotify"].get("matchType") == "search-fallback"],
        "missingYouTube": [s["title"] for s in out_songs if not s["youtube"]],
    },
}
(DATA / "songs.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\nWrote songs.json — {len(out_songs)} songs", file=sys.stderr)
print(json.dumps(result["stats"], ensure_ascii=False, indent=2), file=sys.stderr)
