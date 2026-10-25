"""Turn failing verdicts into targeted code edits (and repair broken test scenarios)."""
import json
from pathlib import Path

from common import GAME_FILES, call, code_bundle, parse_json

PROMPT = """You are fixing a game rebuilt from footage of a lost original so it matches the original more closely.
Below: the current code, the rules that FAILED when compared against the original footage (with what each
side showed), console/smoke errors, and any REGRESSIONS your previous edit caused (rules that passed before).

Return JSON only:
{{"edits": [{{"file": "public/index.html"|"server.js", "old": "<exact unique snippet currently in the file>",
            "new": "<replacement>", "rule_ids": [str], "why": str}}],
 "scenario_updates": [{{"id": str, "steps": [...], "why": str}}],
 "notes": str}}
Rules for edits: "old" must match the current file exactly and occur once (copy it verbatim, enough lines to be
unique). Keep edits minimal and targeted; do not rewrite unrelated code; never break passing rules (listed).
Use scenario_updates only when the TEST was wrong (bad selector/coordinates/timing), not to hide a game bug.

PASSING rules (must keep passing): {passing}

FAILING rules:
{failing}

SMOKE / CONSOLE ERRORS: {smoke}

REGRESSIONS from your previous attempt (reverted): {regressions}

CURRENT SCENARIOS for the failing rules (for reference): {scenarios}

CODE:
{code}"""


def propose(run, rnd, game_dir, verdicts, smoke, plan, regressions=None, limit=8):
    # Fix a few rules per round: smaller edits, faster rounds, fewer edits fighting each other.
    order = {"mismatch": 0, "unclear": 1, "match": 2}
    failing = sorted((v for v in verdicts if not v["pass"]), key=lambda v: order.get(v["verdict"], 3))[:limit]
    passing = [v["id"] for v in verdicts if v["pass"]]
    by_id = {s["id"]: s for s in plan["scenarios"]}
    fail_txt = "\n".join(
        f"- {v['id']} (rule {v['rule_index']}): {by_id[v['id']]['rule']}\n  verdict={v['verdict']} expects_ok={v.get('expects_ok')}"
        f"\n  original: {v.get('original_shows','')}\n  rebuild: {v.get('rebuild_shows','')}"
        f"\n  difference: {v.get('difference','')}\n  hint: {v.get('fix_hint','')}  test_problem: {v.get('test_problem')}"
        for v in failing)
    it, text = call(run, f"fix:{rnd}", stage="test", role="fixer", round=rnd, name="Fixer",
                    brief=f"Editing the code for {len(failing)} rules that don't match the original yet.",
                    targets=[v["id"] for v in failing],
                    input=PROMPT.format(passing=passing, failing=fail_txt, smoke=json.dumps(smoke)[:3000],
                                        regressions=regressions or "none",
                                        scenarios=json.dumps([by_id[v["id"]] for v in failing])[:30000],
                                        code=code_bundle(game_dir, GAME_FILES)),
                    generation_config={"thinking_level": "high", "max_output_tokens": 150000})
    out = parse_json(text)
    out["_status"] = it.status
    out["_targeted"] = [v["id"] for v in failing]
    return out


def apply_edits(game_dir, edits):
    applied, failed = [], []
    for e in edits:
        p = Path(game_dir) / e["file"]
        s = p.read_text()
        n = s.count(e["old"])
        if n != 1:
            failed.append({"file": e["file"], "why": f"old snippet found {n} times", "rule_ids": e.get("rule_ids")})
            continue
        p.write_text(s.replace(e["old"], e["new"]))
        applied.append({"file": e["file"], "rule_ids": e.get("rule_ids"), "why": e.get("why")})
    return applied, failed
