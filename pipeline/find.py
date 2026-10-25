"""Stage 1: find long gameplay videos (Google Search), verify they exist and read their real length."""
import json
import re
import urllib.parse
import urllib.request

from common import call, field, parse_json

# The watcher sees every video in one context at ~6.3k tokens a minute (Glitch: 69 min, 436k), so 130 minutes
# fills about 820k of the 1M window. Several videos beat one long one: more areas, players and moments.
MAX_SECONDS = 130 * 60
MIN_VIDEOS = 5
MAX_VIDEOS = 8

PROMPT = """Find public YouTube videos with LONG real gameplay of "{game}"{about}: full playthroughs, let's plays,
livestream recordings, "first hour", tours of many areas, no-commentary gameplay. Not trailers, not
news, not fan remakes. Search several ways (the name with "gameplay", "let's play", "livestream", "part 1",
creators' channels, other languages). Aim for 12-15 distinct videos, longest first.{exclude} JSON only:
{{"videos": [{{"url": str, "title": str, "shows": str}}]}}"""

UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/141.0 Safari/537.36",
      "Accept-Language": "en-US"}


def verify(run, v, agent="find"):
    """oEmbed for the real title, the public watch page for its length (page only, no media download)."""
    call_id = f"verify:{v['url']}"
    run.act(agent, "tool", call=call_id, tool="verify", label=v.get("title") or v["url"], status="running")
    try:
        q = urllib.parse.urlencode({"url": v["url"], "format": "json"})
        with urllib.request.urlopen(f"https://www.youtube.com/oembed?{q}", timeout=10) as r:
            meta = json.load(r)
        v["title"], v["channel"] = meta["title"], meta["author_name"]
        page = urllib.request.urlopen(urllib.request.Request(v["url"], headers=UA), timeout=15).read().decode("utf-8", "ignore")
        m = re.search(r'"lengthSeconds":"(\d+)"', page)
        v["seconds"] = int(m.group(1)) if m else None
        s = v["seconds"]
        run.act(agent, "tool", call=call_id, tool="verify", label=v["title"], status="done", detail=f"{s // 3600}:{s // 60 % 60:02d}:{s % 60:02d}" if s and s >= 3600 else f"{s // 60}:{s % 60:02d}" if s else None)
        return True
    except Exception as e:
        v["error"] = str(e)[:80]
        run.act(agent, "tool", call=call_id, tool="verify", status="error", detail="video not found")
        return False


def pick(videos):
    """At least MIN_VIDEOS when there are that many, longest first within the watcher's budget. A video so long
    that the MIN_VIDEOS longest can't fit with it is dropped, so one livestream can't crowd out the rest."""
    secs = lambda v: v.get("seconds") or 600
    pool = sorted(videos, key=lambda v: -secs(v))
    need = min(MIN_VIDEOS, len(pool))
    while len(pool) > need and sum(map(secs, pool[:need])) > MAX_SECONDS:
        pool.pop(0)
    out, total = [], 0
    for v in pool:
        if out and (total + secs(v) > MAX_SECONDS or len(out) >= MAX_VIDEOS):
            continue
        out.append(v)
        total += secs(v)
    for i, v in enumerate(out):
        v["key"] = chr(65 + i)
    return out


def run_stage(run):
    rev = run.revival
    given = [{"url": u, "given": True} for u in rev.get("videos", [])]
    about = ", ".join(x for x in [rev.get("developer"), rev.get("platform"), str(rev.get("released") or "")] if x)
    seen, videos, todo = set(), [], given
    # A second search, told what's already found, when the first leaves fewer than MIN_VIDEOS that play.
    for attempt in range(2):
        if attempt or len(given) < MIN_VIDEOS:
            exclude = "\nAlready found, find OTHER videos: " + "; ".join(v["url"] for v in videos) if videos else ""
            try:
                _, text = call(run, "find" if not attempt else "find-more", stage="find", role="researcher", name="Researcher",
                               brief=f"Searching the web for long gameplay videos of {rev['name']}." if not attempt
                               else f"Only {len(videos)} videos played. Searching for more.",
                               input=PROMPT.format(game=rev["name"], about=f" ({about})" if about else "", exclude=exclude),
                               stream=True, notes=field("title"), tools=[{"type": "google_search"}],
                               generation_config={"thinking_level": "medium", "thinking_summaries": "auto"})
            except Exception:
                if attempt and videos:  # the follow-up search failed: carry on with what already plays
                    break
                raise
            todo = todo + parse_json(text).get("videos", [])
        for v in todo:
            if v["url"] in seen:
                continue
            seen.add(v["url"])
            if verify(run, v, "find" if not attempt else "find-more"):
                videos.append(v)
        todo = []
        if len(videos) >= MIN_VIDEOS:
            break
    run.write_json({"candidates": videos}, "candidates.json")
    chosen = pick(videos)
    if not chosen:
        raise RuntimeError("No playable gameplay video found. Add a YouTube link and try again.")
    run.write_json(chosen, "footage.json")
    minutes = sum(v.get("seconds") or 0 for v in chosen) / 60
    return f"{len(chosen)} video{'s' if len(chosen) != 1 else ''}, {minutes:.0f} min"
