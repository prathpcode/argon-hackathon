# Revive

Revive games that can no longer be played. Agents find surviving gameplay footage, watch all of it, and rebuild the game as a multiplayer browser game, then playtest it until it is fun and high in fidelity.

```bash
pnpm install
pnpm setup         # Python venv for the footage stages, plus Playwright's Chromium
pnpm dev           # http://localhost:3000
```

`.env` needs `GEMINI_API_KEY` and `GEMINI_MODEL`.

## How a revival runs

Each revival is a folder in `runs/<id>/`. `events.jsonl` there is the log the UI reads.

1. **Collect** (Python, `pipeline/`): `find.py` searches for long gameplay videos; `watch.py` sends every video to Gemini in one long-context call and writes `spec.json` (timeline, rules with timestamps, areas, how it played).
2. **Remake** (`pipeline/agents/main.ts`): a [pi](https://pi.dev) Builder agent writes the game in `runs/<id>/game/`, starting from the kit in `pipeline/kit/` (a zero-dependency WebSocket relay and its client). It reads `SPEC.md`, asks the footage questions (`ask_footage`, backed by `pipeline/ask.py`), and plays its own game in a real browser (`open_game`, `input`, `look`, `inspect`). `check_game` is its gate.
3. **Playtest**: each round, three pi playtesters (fun, fidelity, multiplayer) play a snapshot of the game in Playwright and call `report` with scores and issues. The Builder fixes what they found, and the next round plays again. The best-scoring round (`rounds/BEST`) is the one people play.

4. **Footage check** (`pipeline/verify.py`, every round, beside the playtesters): Gemini Argon turns each footage rule into a scripted play-through (once per revival, `scenarios.json`), the round's game is played and recorded in a real browser, and Argon judges each recording against that rule's moment in the original video. Flips since the last round are re-judged and the majority decides. Failing rules, regressions first, go to the top of `PLAYTEST.md`, and the best round is ranked by rules matched before fun. The revival page shows it as "Footage check".
5. **Managed Agent squad** (needs `cloudflared` and a one-time `pipeline/.venv/bin/python pipeline/squad/setup.py` per API key; `REVIVE_SQUAD=0` turns it off): the round's game goes online through a temporary tunnel and three Gemini Managed Agents (Explorer, Griefer, Socialite), each in its own Google-hosted sandbox limited to that tunnel, play it together over the internet; their findings join the round's issues.

Each round's playtesters are now the fun tester, the footage check (fidelity, rule by rule against the original) and the Managed Agent squad (multiplayer). The local multiplayer tester only stands in when the squad can't run on the machine.

`pipeline/revive.py runs/<id>` runs all of it and resumes where it stopped. `REVIVE_ROUNDS` sets the number of playtest rounds (default 3).
