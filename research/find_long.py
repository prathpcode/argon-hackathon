"""Find long gameplay videos for one lost game, verify they exist and read their real duration."""
import json
import re
import sys
import urllib.parse
import urllib.request

from google import genai

game = sys.argv[1]
PROMPT = f"""Find public YouTube videos with LONG real gameplay of "{game}": full playthroughs, let's plays,
livestream recordings, "first hour", tours of many areas, no-commentary gameplay. Not trailers, not
news, not fan remakes. Aim for 8-12 distinct videos, longest first. JSON only:
{{"videos": [{{"url": str, "title": str, "shows": str}}]}}"""

client = genai.Client()
it = client.interactions.create(model="gemini-4-argon", input=PROMPT,
                                tools=[{"type": "google_search"}],
                                generation_config={"thinking_level": "medium"})
videos = json.loads(re.search(r"\{.*\}", it.output_text, re.S).group(0))["videos"]

UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/141.0 Safari/537.36",
      "Accept-Language": "en-US"}
for v in videos:
    try:
        q = urllib.parse.urlencode({"url": v["url"], "format": "json"})
        with urllib.request.urlopen(f"https://www.youtube.com/oembed?{q}", timeout=10) as r:
            meta = json.load(r)
        v["real_title"], v["channel"] = meta["title"], meta["author_name"]
        # Duration from the public watch page metadata (page only, no media download).
        req = urllib.request.Request(v["url"], headers=UA)
        page = urllib.request.urlopen(req, timeout=15).read().decode("utf-8", "ignore")
        m = re.search(r'"lengthSeconds":"(\d+)"', page)
        v["seconds"] = int(m.group(1)) if m else None
    except Exception as e:
        v["real_title"], v["seconds"] = None, None
        v["error"] = str(e)[:80]
ok = sorted([v for v in videos if v["real_title"]], key=lambda v: -(v["seconds"] or 0))
for v in ok:
    s = v["seconds"]
    print(f'{(s or 0)//60:3d}:{(s or 0)%60:02d}  {v["url"]}  {v["real_title"]} — {v["channel"]}')
print(f'dead/unverified: {len(videos) - len(ok)}   total verified minutes: {sum(v["seconds"] or 0 for v in ok)/60:.0f}')
slug = re.sub(r"\W+", "_", game.lower())[:20]
json.dump(ok, open(f"videos_{slug}.json", "w"), indent=1)
