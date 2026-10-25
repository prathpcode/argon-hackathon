# GEMBLOX.IO (blockor.io Revival) — Developer Notes

## Architecture
- `server.js`: Zero-dependency Node 22 HTTP + WebSocket room relay server (`/ws`, default port 8090). `package.json` sets `"type": "commonjs"` so `server.js` runs cleanly even if parent directories use ES modules.
- `public/net.js`: Multiplayer client handling rooms, player join/leave, 15 Hz state sync, and custom messages (`eject_block`, `chat`).
- `public/js/audio.js`: WebAudio synthesizer (`AudioFX`) generating pickup pops, rising `NxN` square merge chords, W-ejection pews, block shatter sounds, death effects, and a soft ambient background chord loop.
- `public/js/skins.js`: Procedural beveled 3D gem renderer (`Skins`) with 7 gem color palettes, 12 selectable skins (solid gems + creator/character emblems like Blaze K, Happy Jelly, Cyber Diamond, Royal Crown, Winter Bear), Heart Core icon renderer, 4-point Food Gem sparkles, and recessed white/grey obstacle block renderer.
- `public/js/cluster.js`: `BlockCluster` class managing each player's and AI rival's local rotating grid, orthogonal snap attachment, maximal `NxN` square decomposition (`1x1` up to giant merged squares), dedicated `2x2` Heart Block locking in Heart Mode, `A`/`D` rotational torque & speed boost with golden spin aura, loose outer 1x1 detachment while spinning, `W` cursor-directed 1x1 block ejection, and square-by-square shatter physics.
- `public/js/world.js`: `World` class managing the `4400x4400` arena, cached 45-degree double-line diamond grid patterns (Light `#F3F4F7` and Dark `#171920` themes), continuous perimeter obstacle wall, destructible interior white obstacles, large neutral pink/green Food Gems that burst into 1x1 swarms when rammed, 500+ stray 1x1 collectible gem blocks, and 11 active AI rival clusters.
- `public/js/hud.js`: Authentic HUD overlay with top-left 4x4 sector translucent cyan minimap, bottom-left vertical lime-green energy pill bar (`0–100%`), and top-right neon Top 10 leaderboard with colored gem icons and rank tracking.
- `public/js/main.js`: Fixed-timestep 60fps simulation loop, dynamic zoom camera centered on the player's core block, purple floating-gem Main Menu (`[M]` / `[Esc]`), Skin Selector modal (`←`/`→` + `SAVE`), Dark Theme toggle (`[T]`), Heart Core mode toggle (`[H]`), and live test contract (`window.State` and `window.__events`).

## Status & Verification
- Verified with `check_game` and multi-player browser sessions (`open_game`, `input`, `look`, `inspect`).
- All 27 rules from `SPEC.md` and all contracts from `KIT.md` are implemented and verified with zero console errors.
