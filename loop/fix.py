"""Argon turns failing verdicts into targeted code edits (and repairs broken test scenarios)."""
import json
from pathlib import Path

from common import MODEL, client, code_bundle, output_text, parse_json, wait

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


def propose(cfg, game_dir, verdicts, smoke, plan, regressions=None):
    failing = [v for v in verdicts if not v["pass"]]
    passing = [v["id"] for v in verdicts if v["pass"]]
    by_id = {s["id"]: s for s in plan["scenarios"]}
    fail_txt = "\n".join(
        f"- {v['id']} (rule {v['rule_index']}): {by_id[v['id']]['rule']}\n  verdict={v['verdict']} expects_ok={v.get('expects_ok')}"
        f"\n  original: {v.get('original_shows','')}\n  rebuild: {v.get('rebuild_shows','')}"
        f"\n  difference: {v.get('difference','')}\n  hint: {v.get('fix_hint','')}  test_problem: {v.get('test_problem')}"
        for v in failing)
    cfg2 = dict(cfg, game_dir=Path(game_dir))
    c = client()
    it = c.interactions.create(
        model=MODEL,
        input=PROMPT.format(passing=passing, failing=fail_txt, smoke=json.dumps(smoke)[:3000],
                            regressions=regressions or "none",
                            scenarios=json.dumps([by_id[v["id"]] for v in failing])[:30000],
                            code=code_bundle(cfg2)),
        background=True,
        generation_config={"thinking_level": "high", "max_output_tokens": 100000},
    )
    it, secs = wait(c, it, "fix")
    out = parse_json(output_text(it))
    out["_usage"] = {"in": it.usage.total_input_tokens, "out": it.usage.total_output_tokens, "secs": round(secs)}
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
