"""Stage 4: turn each footage rule into a playable test scenario for the rebuild."""
from common import GAME_FILES, call, code_bundle, parse_json

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
   "original": {{"video": {keys}, "start": seconds, "end": seconds}},   // 8-25 s window of the ORIGINAL showing this rule
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


def run_stage(run):
    spec, footage = run.read_json("spec.json"), run.read_json("footage.json")
    rules = "\n".join(f"{i}: [{r['area']}] {r['rule']} — {', '.join(r['evidence'])}" for i, r in enumerate(spec["rules"]))
    index = "\n".join(f"{s['video']} {s['range']} {s['location']}: {s['activity']}" for s in spec["index"])
    keys = "|".join(f'"{v["key"]}"' for v in footage)
    _, text = call(run, "plan", stage="plan", role="planner", name="Test planner",
                   brief=f"Turning all {len(spec['rules'])} rules into scenarios a bot can play, each tied to a moment of the original.",
                   input=PROMPT.format(steps_doc=STEPS_DOC, keys=keys, rules=rules, index=index,
                                       code=code_bundle(run.path("game"), GAME_FILES)),
                   generation_config={"thinking_level": "high", "max_output_tokens": 120000})
    plan = parse_json(text)
    run.write_json(plan, "scenarios.json")
    testable = sum(s["testable"] for s in plan["scenarios"])
    return f"{testable} of {len(plan['scenarios'])} rules testable"
