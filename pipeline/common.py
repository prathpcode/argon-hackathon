"""Shared helpers: the Gemini client, the run directory, and the event log the web UI reads.

Every model call goes through `call()`, which logs it as an agent in runs/<id>/events.jsonl:
one line when it starts, one when it finishes (tokens, seconds), so the UI can show every agent at work.
A streamed call also logs "act" lines as it goes (each search, its thinking, what it found), the same
shape the TypeScript agents use, so the UI can show the work as it happens.
"""
import json
import os
import re
import threading
import time
from pathlib import Path

from google import genai

ROOT = Path(__file__).resolve().parent.parent
MODEL = os.environ.get("REVIVE_MODEL", "gemini-4-argon")


def load_env():
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            k, _, v = line.strip().partition("=")
            if k and not k.startswith("#") and k not in os.environ:
                os.environ[k] = v.strip().strip('"')


_client = None


def client():
    global _client
    if _client is None:
        load_env()
        _client = genai.Client()
    return _client


class Run:
    """One revival: runs/<id>/ holds revival.json, every stage's output and events.jsonl."""

    def __init__(self, path):
        self.dir = Path(path).resolve()
        self.id = self.dir.name
        self._lock = threading.Lock()

    @property
    def revival(self):
        return json.loads((self.dir / "revival.json").read_text())

    def path(self, *parts):
        return self.dir.joinpath(*parts)

    def read_json(self, *parts):
        p = self.path(*parts)
        return json.loads(p.read_text()) if p.exists() else None

    def write_json(self, data, *parts):
        p = self.path(*parts)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(data, indent=1))

    def emit(self, type, **fields):
        line = json.dumps({"t": round(time.time(), 2), "type": type, **fields})
        with self._lock:
            with open(self.dir / "events.jsonl", "a") as f:
                f.write(line + "\n")

    def stage(self, stage, status, detail=None):
        self.emit("stage", stage=stage, status=status, detail=detail)
        print(f"[{stage}] {status}{': ' + detail if detail else ''}", flush=True)

    def agent(self, id, **fields):
        self.emit("agent", id=id, **fields)

    def act(self, agent, kind, **fields):
        self.emit("act", agent=agent, kind=kind, **fields)


def parse_json(text):
    """Models wrap JSON in fences or prose; take the outermost object."""
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise ValueError("no JSON object in model output:\n" + text[:500])
    return json.loads(m.group(0))


def output_text(interaction):
    # Long outputs arrive as several model_output steps; join them all.
    out = "".join(
        c.text for s in (interaction.steps or []) if s.type == "model_output"
        for c in s.content if c.type == "text"
    )
    return out or (getattr(interaction, "output_text", None) or "")


def usage(interaction):
    u = getattr(interaction, "usage", None)
    if not u:
        return {}
    return {"tokens_in": u.total_input_tokens or 0, "tokens_out": (u.total_output_tokens or 0) + (getattr(u, "total_thought_tokens", 0) or 0)}


def field(name):
    """Matches every finished `"name": "..."` string in partial JSON, for logging findings while it streams."""
    return re.compile(r'"%s"\s*:\s*"((?:[^"\\]|\\.)*)"' % name)


def thought(text):
    """Split a thought summary ("**Heading**\n\nbody") into its heading and body."""
    m = re.match(r"\s*\*\*(.+?)\*\*\s*(.*)", text, re.S)
    return (m.group(1).strip(), m.group(2).strip()) if m else ("", text.strip())


class Live:
    """Turns one interaction's stream events into acts: each search, each thought summary, and every `notes`
    field (a field() pattern) as the output JSON fills in."""

    def __init__(self, run, agent, notes=None):
        self.run, self.agent, self.notes = run, agent, notes
        self.id, self.last, self.text, self.steps = None, None, "", {}
        self.seen = set()  # a resumed stream replays earlier events; log each thing once

    def __call__(self, ev):
        d = getattr(ev, "data", ev)
        et = getattr(d, "event_type", "")
        self.last = getattr(d, "event_id", None) or self.last
        if et == "interaction.created":
            self.id = d.interaction.id
        elif et == "step.start":
            self.steps.setdefault(d.index, {"id": getattr(d.step, "id", None) or f"{self.agent}-{d.index}", "queries": []})
        elif et == "step.delta":
            self.delta(d.delta, self.steps.setdefault(d.index, {"id": f"{self.agent}-{d.index}", "queries": []}))
        elif et == "step.stop":
            s = self.steps.get(d.index, {"queries": []})
            for n in range(1, len(s["queries"]) + 1):
                self.once(("done", s["id"], n), "tool", call=f"{s['id']}:{n}", tool="search", status="done")

    def once(self, key, kind, **fields):
        if key not in self.seen:
            self.seen.add(key)
            self.run.act(self.agent, kind, **fields)

    def delta(self, x, step):
        if x.type == "google_search_call" and x.arguments and x.arguments.queries:
            for q in x.arguments.queries:
                if q not in step["queries"]:
                    step["queries"].append(q)
                    self.once(("q", step["id"], q), "tool", call=f"{step['id']}:{len(step['queries'])}", tool="search", label=q, status="running")
        elif x.type == "thought_summary" and getattr(x.content, "text", None):
            title, body = thought(x.content.text)
            if title or body:
                self.once(("think", title, body[:80]), "think", title=title[:120], text=body[:600])
        elif x.type == "text" and self.notes:
            self.text += x.text
            for t in self.notes.findall(self.text):
                self.once(("note", t), "note", text=json.loads(f'"{t}"')[:240])


def streamed(run, id, c, input, notes=None, **create):
    """Run an interaction in the background and stream it, logging its work live (see Live). A dropped stream
    reconnects from the last event it saw. Returns the interaction from the server."""
    live = Live(run, id, notes)
    events = c.interactions.create(model=MODEL, input=input, background=True, stream=True, **create)
    for attempt in range(6):
        try:
            for ev in events:
                live(ev)
            break
        except Exception:
            if not live.id or attempt == 5:
                raise
            time.sleep(2 + attempt * 3)
            events = c.interactions.get(id=live.id, stream=True, **({"last_event_id": live.last} if live.last else {}))
    if not live.id:
        raise RuntimeError("stream ended without an interaction id")
    return c.interactions.get(id=live.id)


def call(run, id, *, stage, role, name, brief, input, background=True, every=5, stream=False, notes=None, **create):
    """One agent: a single Gemini interaction, logged start to finish. Returns (interaction, text).

    stream=True runs it as a stream and logs its searches, thinking and findings live (see streamed()).
    "incomplete" (hit max_output_tokens) is returned rather than raised; the caller may salvage the text.
    """
    c = client()
    t0 = time.time()
    run.agent(id, stage=stage, role=role, name=name, brief=brief, status="running", started=round(t0, 2))
    try:
        if stream:
            it = streamed(run, id, c, input, notes, **create)  # background is implied
        else:
            it = c.interactions.create(model=MODEL, input=input, background=background, **create)
        while it.status in ("in_progress", "queued"):
            time.sleep(every)
            it = c.interactions.get(id=it.id)
        if it.status not in ("completed", "incomplete"):
            raise RuntimeError(f"{name} {it.status}: {getattr(it, 'error', None)}")
        text = output_text(it)
        run.agent(id, status="done", secs=round(time.time() - t0), incomplete=it.status == "incomplete", **usage(it))
        return it, text
    except Exception as e:
        run.agent(id, status="error", secs=round(time.time() - t0), detail=str(e)[:300])
        raise


def code_bundle(game_dir, files):
    return "\n\n".join(f"=== FILE: {f} ===\n{(Path(game_dir) / f).read_text()}" for f in files)


GAME_FILES = ["public/index.html", "server.js"]
