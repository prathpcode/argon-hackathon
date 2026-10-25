"""Stage 2: watch all surviving footage in one interaction: a timeline index first, then a timestamped rules spec."""
from common import call, field, parse_json

PROMPT = """You are watching the surviving gameplay footage of {game}{about}, a game that can no longer be
played in its original form.{memories} Videos: {videos}.

Part 1 — timeline index. Walk through each video start to end and split it into segments
(video, mm:ss–mm:ss, what is on screen: which level/area/location, what the player is doing, which UI is
open, how many other players are visible). Flag segments with no useful gameplay.

Part 2 — rules spec for rebuilding the game, from the footage only. Each rule tied to the timestamp(s)
that show it. Cover at least: the player character (look, animations, movement speed, jump, physics),
controls, camera, every level/area and how they connect, every enemy/creature/NPC seen and every
interaction with it, items and inventory, scoring and currencies, health/energy/timers and other meters,
progression (levels, unlocks, skills, quests), win and lose conditions, menus and HUD layout, other players
(presence, chat, teams, matchmaking), sounds/music if audible. Mark each rule "seen" or "inferred".

Part 3 — how it played: the core loop, what players spent their time doing, what made them love it, the
moment-to-moment feel (pace, weight, responsiveness, sounds), and what players did together.

Reply with JSON only:
{{"index": [{{"video": str, "range": str, "location": str, "activity": str, "players_visible": int|null,
  "useful": bool}}],
 "rules": [{{"area": str, "rule": str, "evidence": [str], "confidence": "seen"|"inferred"}}],
 "areas": [{{"name": str, "evidence": [str], "description": str}}],
 "feel": {{"core_loop": str, "why_players_loved_it": str, "moment_to_moment": str, "together": str}},
 "unknowns": [str]}}"""


def describe(rev):
    about = ", ".join(x for x in [rev.get("developer"), rev.get("platform"), rev.get("genre")] if x)
    return f" ({about})" if about else ""


def videos_line(footage):
    return "; ".join(f"{v['key']} = {v.get('title') or v['url']}" + (f" ({v['seconds'] // 60}:{v['seconds'] % 60:02d})" if v.get("seconds") else "") for v in footage)


def run_stage(run):
    rev, footage = run.revival, run.read_json("footage.json")
    memories = f"\nSomeone who played it remembers: {rev['memories']}" if rev.get("memories") else ""
    prompt = PROMPT.format(game=rev["name"], about=describe(rev), memories=memories, videos=videos_line(footage))
    minutes = sum(v.get("seconds") or 0 for v in footage) / 60
    it, text = call(run, "watch", stage="watch", role="watcher", name="Watcher",
                    brief=f"Watching all {minutes:.0f} minutes of footage in one context and writing the rules of the game.",
                    input=[{"type": "video", "uri": v["url"]} for v in footage] + [{"type": "text", "text": prompt}],
                    stream=True, notes=field("rule"),
                    generation_config={"thinking_level": "high", "thinking_summaries": "auto", "max_output_tokens": 65536})
    spec = parse_json(text)
    spec.setdefault("areas", spec.pop("streets", []))
    run.write_json(spec, "spec.json")
    run.path("watch_id.txt").write_text(it.id)
    return f"{len(spec['rules'])} rules, {len(spec['index'])} scenes, {len(spec['areas'])} areas"
