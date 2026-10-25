"""Argon turns each footage rule into a playable test scenario for the rebuild (run once per game)."""
import json
import sys
from pathlib import Path

from common import MODEL, client, code_bundle, load_config, output_text, parse_json, wait

STEPS_DOC = """Each scenario is driven by a real browser (Playwright) with trusted input. Step vocabulary:
  {"do":"wait","ms":N}
  {"do":"key","key":"<KeyboardEvent.key e.g. ArrowRight, a, Space>","ms":N}   hold N ms (0 = tap)
  {"do":"click_world","x":X,"y":Y}        click a point in WORLD coordinates (converted with world_to_client)
  {"do":"click_text","text":"..."}         click the visible DOM element whose text matches (menus, verbs, buttons)
  {"do":"click","selector":"css"}          click a DOM element
  {"do":"type","selector":"css","text":"...","enter":true}
  {"do":"eval","js":"..."}                 SETUP ONLY (e.g. move the player next to an object); never to fake the behaviour under test
  {"do":"expect","js":"<expression -> boolean>","desc":"..."}   assertion on game state / window.__events
Any step may carry "player": i (0-based) in multiplayer scenarios; default 0. Players join in order with the given names
and the same ?seed, all on the same server."""

PROMPT = """You wrote the rules (from the footage) and the game code below. Build an automated test plan so a
loop can check whether the rebuild matches the ORIGINAL footage, rule by rule.

{steps_doc}

Return JSON only:
{{"world_to_client": "<JS expression using the game's globals, with variables x and y in world coords, returning
   {{x, y}} in CSS pixels relative to the page viewport (account for canvas position, camera, and canvas vs CSS size)>",
 "scenarios": [{{
   "id": "short_snake_case", "rule_index": int, "rule": str,
   "testable": bool, "why_not": str|null,
   "original": {{"video": "A"|"B", "start": seconds, "end": seconds}},   // 8-25 s window of the ORIGINAL showing this rule
   "players": 1|2|3, "names": [str], "url_params": "seed=42",
   "steps": [...],   // keep each scenario under ~20 s of play
   "look_for": str   // what a viewer should see in both videos if the rule matches
 }}]}}
Cover every rule you can; mark the rest testable=false with a reason. Prefer real input (keys, clicks) over eval.
Use window.__events and game globals in expect steps.

RULES (index: rule — evidence):
{rules}

TIMELINE INDEX:
{index}

CODE:
{code}"""


def main(cfg_path):
    cfg = load_config(cfg_path)
    spec = json.loads(cfg["spec"].read_text())
    rules = "\n".join(f"{i}: [{r['area']}] {r['rule']} — {', '.join(r['evidence'])}" for i, r in enumerate(spec["rules"]))
    index = "\n".join(f"{s['video']} {s['range']} {s['location']}: {s['activity']}" for s in spec["index"])
    c = client()
    it = c.interactions.create(
        model=MODEL,
        input=PROMPT.format(steps_doc=STEPS_DOC, rules=rules, index=index, code=code_bundle(cfg)),
        background=True,
        generation_config={"thinking_level": "high", "max_output_tokens": 120000},
    )
    print("id:", it.id, flush=True)
    it, secs = wait(c, it, "make_scenarios")
    plan = parse_json(output_text(it))
    out = Path(cfg_path).with_suffix(".scenarios.json")
    out.write_text(json.dumps(plan, indent=1))
    t = [s for s in plan["scenarios"] if s["testable"]]
    u = it.usage
    print(f"{secs:.0f}s  in {u.total_input_tokens} out {u.total_output_tokens}  scenarios {len(plan['scenarios'])} testable {len(t)} -> {out}")


if __name__ == "__main__":
    main(sys.argv[1])
