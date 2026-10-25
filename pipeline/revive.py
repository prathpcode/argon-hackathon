"""Revive one lost game, start to finish: find footage and watch it here, then pi agents build and playtest it
(pipeline/agents/main.ts).

usage: revive.py runs/<id>

Each stage is skipped when its output already exists, so running it again resumes where it stopped.
"""
import os
import subprocess
import sys
import traceback

import find
import watch
from common import ROOT, Run

STAGES = [
    ("find", find, "footage.json"),
    ("watch", watch, "spec.json"),
]


def main(path):
    run = Run(path)
    (run.dir / "pid").write_text(str(os.getpid()))
    run.emit("start")
    try:
        for name, mod, output in STAGES:
            if output and run.path(output).exists():
                run.stage(name, "done", "kept from the last run")
                continue
            run.stage(name, "running")
            run.stage(name, "done", mod.run_stage(run))
        # Build and playtest: the TypeScript side logs its own stages to the same events.jsonl.
        if subprocess.run([str(ROOT / "node_modules" / ".bin" / "tsx"), str(ROOT / "pipeline" / "agents" / "main.ts"), str(run.dir)], cwd=ROOT).returncode:
            sys.exit(1)
        run.emit("done")
    except Exception as e:
        traceback.print_exc()
        run.emit("error", stage=name, message=str(e)[:500])
        run.stage(name, "error", str(e)[:300])
        sys.exit(1)
    finally:
        (run.dir / "pid").unlink(missing_ok=True)


if __name__ == "__main__":
    main(sys.argv[1])
