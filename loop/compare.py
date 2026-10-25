"""Argon compares each rebuild recording with the matching moment of the original footage."""
import base64
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from common import MODEL, client, parse_json

PROMPT = """You are verifying a game rebuilt from footage of a lost original.
Clip 1 is the ORIGINAL game (YouTube, {video} {start}s-{end}s). The remaining clip(s) are the REBUILD, recorded
while an automated test played this scenario (one clip per player).

Rule under test: {rule}
What should be visible if it matches: {look_for}
Automated assertions: {expects}
Test-step errors (may mean the test itself is broken): {step_errors}
Console errors: {errors}
Recent game events (player 0): {events}

Judge ONLY this rule. "match" = the rebuild shows the same behaviour/look as the original for this rule
(art may be redrawn; behaviour, layout, UI and feedback must correspond). "mismatch" = it visibly differs or is
missing. "unclear" = the test didn't exercise it (e.g. steps failed) or the clips don't show it.
JSON only: {{"verdict": "match"|"mismatch"|"unclear", "original_shows": str, "rebuild_shows": str,
"difference": str, "fix_hint": str, "test_problem": str|null}}"""


def judge(c, sc, res, sources, play_dir):
    o = sc["original"]
    parts = [{"type": "video", "uri": sources[o["video"]],
              "processing": {"type": "static", "start_offset": f"{o['start']}s", "end_offset": f"{o['end']}s", "fps": 2}}]
    for v in res["videos"]:
        data = base64.b64encode((play_dir / v).read_bytes()).decode()
        parts.append({"type": "video", "data": data, "mime_type": "video/mp4"})
    ev = [e.get("type") for e in (res["events"][0] if res["events"] else [])][-40:]
    parts.append({"type": "text", "text": PROMPT.format(
        video=o["video"], start=o["start"], end=o["end"], rule=sc["rule"], look_for=sc.get("look_for", ""),
        expects=json.dumps(res["expects"])[:1500], step_errors=res["step_errors"][:6],
        errors=res["errors"][:6], events=ev)})
    try:
        it = c.interactions.create(model=MODEL, input=parts, generation_config={"thinking_level": "low"})
        v = parse_json(it.output_text)
        v["input_tokens"] = it.usage.total_input_tokens
    except Exception as e:
        v = {"verdict": "unclear", "difference": f"compare failed: {str(e)[:200]}", "test_problem": "compare error"}
    v["id"], v["rule_index"] = sc["id"], sc["rule_index"]
    v["expects_ok"] = all(e["ok"] for e in res["expects"]) if res["expects"] else None
    v["step_errors"] = len(res["step_errors"])
    # A rule passes only when the footage comparison AND the game's own assertions agree.
    v["pass"] = v["verdict"] == "match" and v["expects_ok"] is not False and not res["errors"]
    print(f"  {sc['id']:40} {v['verdict']:9} expects_ok={v['expects_ok']}  {'PASS' if v['pass'] else ''}", flush=True)
    return v


def main(scen_path, cfg_sources, play_dir):
    plan = json.loads(Path(scen_path).read_text())
    play_dir = Path(play_dir)
    played = {r["id"]: r for r in json.loads((play_dir / "play.json").read_text())["results"]}
    todo = [s for s in plan["scenarios"] if s["id"] in played]
    c = client()
    with ThreadPoolExecutor(8) as ex:
        verdicts = list(ex.map(lambda s: judge(c, s, played[s["id"]], cfg_sources, play_dir), todo))
    (play_dir / "verdicts.json").write_text(json.dumps(verdicts, indent=1))
    return verdicts


if __name__ == "__main__":
    from common import load_config
    cfg = load_config(sys.argv[1])
    main(sys.argv[2], cfg["sources"], sys.argv[3])
