"""Ask Argon (with Google Search) for lost games with long surviving gameplay footage, then verify links."""
import json
import re
import urllib.parse
import urllib.request

from google import genai

PROMPT = """I want to rebuild a LOST game from its surviving gameplay videos alone. Find 6 candidates:
- the game can no longer be played in its original form (servers shut down, Flash files lost or broken)
- substantial gameplay footage survives on public YouTube: long playthroughs or multi-part let's-plays,
  ideally 20+ minutes in total across videos
- lots of content to rebuild: multiple levels/areas, enemies, progression; multiplayer is a big plus
- NOT owned by Nintendo or Disney
Include Glitch (Tiny Speck, 2012) and City of Steam if they qualify.
For each give 1-3 specific YouTube gameplay video URLs. Reply with JSON only:
{"candidates": [{"game": str, "year_lost": str, "why_unplayable": str, "genre": str,
  "multiplayer": bool, "ip_owner": str, "content": str,
  "videos": [{"url": str, "title": str, "approx_minutes": number}]}]}"""

client = genai.Client()
interaction = client.interactions.create(
    model="gemini-4-argon",
    input=PROMPT,
    tools=[{"type": "google_search"}],
    generation_config={"thinking_level": "medium"},
)
data = json.loads(re.search(r"\{.*\}", interaction.output_text, re.S).group(0))

def exists(url):
    q = urllib.parse.urlencode({"url": url, "format": "json"})
    try:
        with urllib.request.urlopen(f"https://www.youtube.com/oembed?{q}", timeout=10) as r:
            m = json.load(r)
            return f'{m["title"]} — {m["author_name"]}'
    except Exception as e:
        return None

for c in data["candidates"]:
    for v in c["videos"]:
        v["verified"] = exists(v["url"])
json.dump(data, open("shortlist.json", "w"), indent=1)
for c in data["candidates"]:
    ok = [v for v in c["videos"] if v["verified"]]
    print(f'\n## {c["game"]} (lost {c["year_lost"]}; {c["genre"]}; multiplayer={c["multiplayer"]}; IP: {c["ip_owner"]})')
    print(f'   why: {c["why_unplayable"]}')
    print(f'   content: {c["content"]}')
    for v in c["videos"]:
        print(f'   {"OK  " if v["verified"] else "DEAD"} ~{v["approx_minutes"]}min {v["url"]}  {v["verified"] or ""}')
