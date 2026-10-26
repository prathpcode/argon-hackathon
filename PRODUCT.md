# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js / React for the app, run locally with `pnpm dev`. Each revival is a folder on disk (`runs/<id>/`) whose `events.jsonl` is the log the UI reads; there is no database. The footage stages (find, watch, footage check) are Python scripts in `pipeline/` calling Gemini Argon. The Builder and playtesters are pi agents (`@earendil-works/pi-coding-agent`) driven from `pipeline/agents/`, playing the game in Playwright. Every rebuilt game starts from the zero-dependency kit in `pipeline/kit/` (a WebSocket relay and its client), and the app starts that game's own server on a local port when someone presses Play. The Managed Agent squad plays through a temporary `cloudflared` tunnel. The Gemini key lives in `.env` and never reaches the client.

## Users

People who miss a game that shut down (an online game whose servers went dark, a Flash game, a delisted title) and want to play it again with friends. Also anyone curious to watch agents bring a lost game back.

## Product Purpose

Revive brings back games that can no longer be played. Agents find the surviving gameplay footage, watch all of it, and rebuild the game as a multiplayer browser game. They then playtest it round after round until it is both fun and faithful to the original. Success means a lost game you can open in a browser tab and play with other people, and that holds up when checked rule by rule against its own footage.

## Positioning

Once a game's servers or runtime are gone, gameplay video is often all that's left. Revive treats that footage as the spec: every rule it rebuilds comes with a timestamp in the original video, and every round is checked against those moments. Fan remakes take years. A revival runs in a sitting, and you can watch the agents work the whole time.

## Operating Context

- A revival moves through three phases shown in the workshop: **Collect** (find long gameplay videos and watch every one of them in a single long-context call, producing a timeline and timestamped rules), **Remake** (the Builder writes the game, asks the footage questions, and plays its own build in a real browser), and **Playtest** (rounds of fixing and replaying).
- Each playtest round has a fun tester, a footage check, and a squad of three Gemini Managed Agents (Explorer, Griefer, Socialite). The footage check plays every rule as a scripted scenario, records it, and judges it against the original moment. The squad agents each run in their own Google-hosted sandbox and play the round's build together over the internet. The best round, ranked by rules matched, is the one people play.
- The **Parity** view puts the rebuild's recording beside the original footage, rule by rule.
- The **Lost games** archive lists 166 shut-down games with their history and surviving footage, ranked by how well each suits a revival. Any of them can be revived in one click, and **Add a game** starts one for a title that isn't listed.
- Everything the agents do (tool calls, reasoning summaries, screenshots, the code they write) streams to the revival page while it runs.
- No accounts. Everyone who opens the app sees every revival.

## Capabilities and Constraints

Confirmed:
- Rebuilds a lost game from footage alone, as a multiplayer browser game.
- Rule-by-rule footage check of every playtest round, with recordings.
- Managed Agent squad multiplayer playtests over a public tunnel.
- Runs resume where they stopped; revivals can be stopped, resumed, played and deleted from the UI.

Constraints:
- Fidelity depends on the footage that survives. Rules the videos never show can't be checked.
- Runs locally. A revival takes tens of minutes and spends real model calls.
- The squad needs `cloudflared` and a one-time agent setup per API key; without them, a local multiplayer tester stands in.

Open decisions (do not invent):
- Hosting, accounts and sharing revivals publicly.
- Rights and takedown handling for revived games.

## Brand Commitments

- Name: Revive.
- Teletext look: fastext nav keys in red, green, yellow and cyan, block type, broadcast-page framing. The archive should feel like a service listing, not a store.
- The agents' work is the show. Live activity stays visible and legible rather than hidden behind a spinner.
- Honest about fidelity: show how many footage rules a revival matches, never claim a perfect copy.

## Evidence on Hand

Revivals of Glitch (from 69 minutes of footage), blockor.io and Rockman Xover, each with its footage, rounds, footage-check recordings and squad findings in `runs/`. Earlier prototypes (Spore 2D, Giants' Reverie, the first improvement loop) are kept in `spore2d-example/`, `glitch-example/` and `loop/`. The revival pages are read straight from these run files.

## Product Principles

1. **The footage is the spec.** Every rule traces back to a timestamp in the original video, and every round is judged against it.
2. **Fun and faithful, in that order of proof.** A revival has to match the original, and still has to be worth playing.
3. **Multiplayer by default.** These games were played together; the rebuild is too, and agents test it together.
4. **Show the work.** Anyone watching can see what each agent saw, did and found.

## Accessibility & Inclusion

No specific WCAG level has been set. The teletext palette must still meet contrast on text, the fastext colours are always paired with labels, and live activity respects reduced motion.
