"""Ask the original footage a question. Used as a tool by the pi agents (pipeline/agents/footage.ts).

usage: ask.py runs/<id> <question> [--clip A:120-140] [--image shot.jpg ...]

Without --clip it continues the watcher's interaction, which still holds every video, so any question
about the whole game works. With --clip it sends just that window of one video (cheaper and sharper).
Images (screenshots of the rebuild) are attached after the footage so the answer can compare the two.
Prints the answer, then a last line of JSON with token usage.
"""
import argparse
import base64
import json
import sys
import time

from common import Run, client, output_text, usage, MODEL


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run")
    ap.add_argument("question")
    ap.add_argument("--clip")
    ap.add_argument("--image", action="append", default=[])
    a = ap.parse_args()
    run = Run(a.run)
    parts = []
    create = {}
    if a.clip:
        key, _, span = a.clip.partition(":")
        start, _, end = span.partition("-")
        video = next((v for v in run.read_json("footage.json") or [] if v["key"] == key.strip().upper()), None)
        if not video:
            sys.exit(f"No video {key}. Videos: " + ", ".join(v["key"] for v in run.read_json("footage.json") or []))
        parts.append({"type": "video", "uri": video["url"],
                      "processing": {"type": "static", "start_offset": f"{float(start)}s", "end_offset": f"{float(end)}s", "fps": 2}})
    else:
        watch = run.path("watch_id.txt")
        if watch.exists():
            create["previous_interaction_id"] = watch.read_text().strip()
        else:
            parts += [{"type": "video", "uri": v["url"]} for v in run.read_json("footage.json") or []]
    for img in a.image:
        with open(img, "rb") as f:
            parts.append({"type": "image", "data": base64.b64encode(f.read()).decode(), "mime_type": "image/jpeg"})
    note = (" The attached image(s) are screenshots of the REBUILD, not the original." if a.image else "")
    parts.append({"type": "text", "text": "Answer from the ORIGINAL game's footage, concretely (colors, layout, sizes, timings, "
                  f"exact behaviour, timestamps like A 12:30).{note} Be brief and specific. Say when the footage doesn't show it.\n\n"
                  + a.question})
    c = client()
    it = c.interactions.create(model=MODEL, input=parts, background=True,
                               generation_config={"thinking_level": "low", "max_output_tokens": 4000}, **create)
    while it.status in ("in_progress", "queued"):
        time.sleep(2)
        it = c.interactions.get(id=it.id)
    if it.status not in ("completed", "incomplete"):
        sys.exit(f"The footage question failed: {it.status} {getattr(it, 'error', '')}")
    print(output_text(it).strip())
    print(json.dumps(usage(it)))


if __name__ == "__main__":
    main()
