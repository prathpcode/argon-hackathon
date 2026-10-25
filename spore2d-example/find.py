"""Ask Argon (with Google Search) for surviving gameplay videos of a lost game."""
import json
import re
import sys
import urllib.parse
import urllib.request

from google import genai

game = sys.argv[1]
client = genai.Client()

prompt = f"""Find public YouTube videos that show actual gameplay of the lost browser game "{game}".
Only real gameplay footage of this exact game (not trailers for other versions, not reviews of a
different game). Reply with JSON only:
{{"videos": [{{"url": "https://www.youtube.com/watch?v=...", "title": str, "what_it_shows": str}}],
  "notes": str}}"""

interaction = client.interactions.create(
    model="gemini-4-argon",
    input=prompt,
    tools=[{"type": "google_search"}],
    generation_config={"thinking_level": "low"},
)
text = interaction.output_text
m = re.search(r"\{.*\}", text, re.S)
found = json.loads(m.group(0)) if m else {"videos": [], "notes": text}

print("status:", interaction.status, "| notes:", found.get("notes"))
for v in found["videos"]:
    # oEmbed answers only for videos that exist and are public/embeddable.
    q = urllib.parse.urlencode({"url": v["url"], "format": "json"})
    try:
        with urllib.request.urlopen(f"https://www.youtube.com/oembed?{q}", timeout=10) as r:
            meta = json.load(r)
        v["exists"] = True
        v["real_title"] = meta["title"]
        v["channel"] = meta["author_name"]
    except Exception as e:
        v["exists"] = False
        v["error"] = str(e)
print(json.dumps(found["videos"], indent=1))
json.dump(found, open("videos.json", "w"), indent=1)
