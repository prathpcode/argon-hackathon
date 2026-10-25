"""Shared helpers for the improvement loop."""
import json
import os
import re
from pathlib import Path

from google import genai

MODEL = "gemini-4-argon"
HERE = Path(__file__).resolve().parent


def load_env():
    env = Path.home() / ".config" / "argon-hackathon" / "env"
    if env.exists() and not os.environ.get("GEMINI_API_KEY_LOOP_SET"):
        for line in env.read_text().splitlines():
            k, _, v = line.partition("=")
            if k:
                os.environ[k] = v
        os.environ["GEMINI_API_KEY_LOOP_SET"] = "1"


def client():
    load_env()
    return genai.Client()


def load_config(path):
    cfg = json.loads(Path(path).read_text())
    base = Path(path).resolve().parent
    cfg["game_dir"] = (base / cfg["game_dir"]).resolve()
    cfg["spec"] = (base / cfg["spec"]).resolve()
    return cfg


def parse_json(text):
    """Models wrap JSON in fences or prose; take the outermost object."""
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise ValueError("no JSON object in model output:\n" + text[:500])
    return json.loads(m.group(0))


def output_text(interaction):
    # Long outputs arrive as several model_output steps; join them all.
    return "".join(
        c.text for s in interaction.steps if s.type == "model_output"
        for c in s.content if c.type == "text"
    )


def wait(c, interaction, label="", every=5):
    import time
    t0 = time.time()
    while interaction.status in ("in_progress", "queued"):
        time.sleep(every)
        interaction = c.interactions.get(id=interaction.id)
    # "incomplete" = hit max_output_tokens; the caller may still salvage the text.
    if interaction.status not in ("completed", "incomplete"):
        raise RuntimeError(f"{label} {interaction.status}: {getattr(interaction, 'error', None)}")
    return interaction, time.time() - t0


def code_bundle(cfg, files=None):
    parts = []
    for f in files or cfg["files"]:
        parts.append(f"=== FILE: {f} ===\n{(cfg['game_dir'] / f).read_text()}")
    return "\n\n".join(parts)
