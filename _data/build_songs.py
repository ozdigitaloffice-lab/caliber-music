"""
Merge Apple Music + YouTube + Spotify into a single songs.json keyed by canonical title.
Match strategy: normalize Hebrew title (strip punctuation/whitespace/diacritics, lower),
then fuzzy-match Apple titles ↔ YouTube titles. Flag mismatches.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

DATA = Path("C:/caliber-family/_data")
SPOTIFY_ARTIST_ID = "6yionLgW9s7T0cIrPWX7oB"
YT_CHANNEL_ID = "UCpU0SZAM5oDo6V10KJpNpYQ"
APPLE_ARTIST_ID = "1873911260"
ARTIST_NAME = "משפחת קליבר"

# ---------- normalization ----------
PUNCT_RE = re.compile(r"[!?\"'.,\-–—:;()\[\]/]+")
WS_RE = re.compile(r"\s+")
BAND_TOKENS = ["משפחת קליבר", "משפחת ראפר קליבר", "קליבר"]

def normalize(title: str) -> str:
    t = title.strip()
    for tok in BAND_TOKENS:
        t = t.replace(tok, " ")
    # strip nikud
    t = "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c))
    t = PUNCT_RE.sub(" ", t)
    t = WS_RE.sub(" ", t).strip()
    # forgive single-letter typos that appear in this dataset
    swaps = {"טיף": "טיפ", "בארזים": "בארגזים"}
    for k, v in swaps.items():
        t = t.replace(k, v)
    return t.lower()

# ---------- apple ----------
apple = json.loads((DATA / "apple.json").read_text(encoding="utf-8"))
apple_tracks = []
for r in apple["results"]:
    if r.get("wrapperType") != "track":
        continue
    art = r["artworkUrl100"].replace("100x100bb", "1000x1000bb")
    apple_tracks.append({
        "name": r["trackName"],
        "norm": normalize(r["trackName"]),
        "appleId": r["trackId"],
        "appleUrl": r["trackViewUrl"].split("?")[0],
        "artwork": art,
        "preview": r.get("previewUrl"),
        "durationSec": r["trackTimeMillis"] // 1000,
        "releaseDate": r["releaseDate"][:10],
    })

# ---------- youtube ----------
yt_xml = (DATA / "youtube.xml").read_text(encoding="utf-8")
yt_entries = re.findall(r"<entry>(.*?)</entry>", yt_xml, re.DOTALL)
yt_videos = []
for e in yt_entries:
    vid = re.search(r"<yt:videoId>([^<]+)</yt:videoId>", e).group(1)
    title = re.search(r"<title>([^<]+)</title>", e).group(1)
    pub = re.search(r"<published>([^<]+)</published>", e).group(1)[:10]
    yt_videos.append({
        "videoId": vid,
        "title": title,
        "norm": normalize(title),
        "publishedDate": pub,
        "url": f"https://www.youtube.com/watch?v={vid}",
        "thumb": f"https://i.ytimg.com/vi/{vid}/maxresdefault.jpg",
    })

# ---------- match ----------
songs = []
yt_used = set()
for t in apple_tracks:
    # find best yt match by exact norm equality
    matches = [v for v in yt_videos if v["norm"] == t["norm"]]
    yt_match = matches[0] if matches else None
    for m in matches:
        yt_used.add(m["videoId"])
    songs.append({
        "title": t["name"],
        "norm": t["norm"],
        "releaseDate": t["releaseDate"],
        "durationSec": t["durationSec"],
        "artwork": t["artwork"],
        "preview": t["preview"],
        "apple": {"trackId": t["appleId"], "url": t["appleUrl"]},
        "youtube": {
            "videoId": yt_match["videoId"],
            "url": yt_match["url"],
            "thumb": yt_match["thumb"],
            "alternateVideos": [v["videoId"] for v in matches[1:]],
        } if yt_match else None,
        "spotify": {
            # Without Spotify Web API auth, deep-link via search.
            # This opens Spotify and pre-fills a search for the song; almost always returns the correct track at the top.
            "searchUrl": f"https://open.spotify.com/search/{t['name']} {ARTIST_NAME}",
        },
    })

# youtube-only videos (uploaded but not on apple yet, or non-song content)
yt_only = [v for v in yt_videos if v["videoId"] not in yt_used]

result = {
    "artist": {
        "name": ARTIST_NAME,
        "apple": {
            "artistId": APPLE_ARTIST_ID,
            "url": f"https://music.apple.com/us/artist/{APPLE_ARTIST_ID}",
        },
        "spotify": {
            "artistId": SPOTIFY_ARTIST_ID,
            "url": f"https://open.spotify.com/artist/{SPOTIFY_ARTIST_ID}",
            "thumbnail": "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02e337888070287b49fa8b86e3",
            "embedIframe": f"https://open.spotify.com/embed/artist/{SPOTIFY_ARTIST_ID}",
        },
        "youtube": {
            "channelId": YT_CHANNEL_ID,
            "url": f"https://www.youtube.com/channel/{YT_CHANNEL_ID}",
        },
    },
    "songs": sorted(songs, key=lambda s: s["releaseDate"], reverse=True),
    "youtubeOnlyVideos": yt_only,
    "stats": {
        "appleTracks": len(apple_tracks),
        "youtubeVideos": len(yt_videos),
        "matchedSongs": sum(1 for s in songs if s["youtube"]),
        "appleOnlySongs": sum(1 for s in songs if not s["youtube"]),
        "youtubeOnlyVideos": len(yt_only),
    },
}

out = DATA / "songs.json"
out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Wrote {out} — {len(songs)} songs")
print(f"Stats: {json.dumps(result['stats'], indent=2)}")

print()
print("=== ALL SONGS (by release date) ===")
for s in result["songs"]:
    yt = "✓YT" if s["youtube"] else " "
    print(f"  [{s['releaseDate']}] {yt}  {s['title']}  ({s['durationSec']}s)")

if yt_only:
    print()
    print("=== YOUTUBE-ONLY (not matched to any Apple track) ===")
    for v in yt_only:
        print(f"  [{v['publishedDate']}] {v['videoId']}  {v['title']}")
