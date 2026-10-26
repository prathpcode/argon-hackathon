# Ur's Whimsy — Development Notes

## Architecture
- `server.js` + `package.json`: Zero-dependency Node 22 HTTP static file server & WebSocket multiplayer relay (`/ws`), configured as CommonJS via `package.json` (`{"type":"commonjs"}`).
- `public/net.js`: Room & player state sync (`15 Hz`), shared room state (`home_theme`, `tower_progress`, `home_furniture`), and custom message broadcasting (`chat`, `social`, `party`, `hi_wave`, `coop_mine`, `cubimal`).
- `public/index.html`: Authentic rounded browser-frame HUD (`#e4ecf0`) with top status bar (circular green Mood badge `#5da037`, green Energy progress bar `#6eb544`, cyan iMG/XP bar `#5ca7d8`, Level counter, Skills/Quests/Wardrobe/Cultivate/World Map/Go Home buttons, Ur clock & player pill), 2D street canvas viewport (`#game-canvas`), bottom 16-slot inventory bar with Currants coin counter, search filter, and Furniture placement tab, and right-hand `People here` & `Local Chat / Activity` sidebar.
- `public/js/audio.js`: Procedural WebAudio synthesizer for all actions (`step`, `jump`, `land`, `orb`, `click`, `popup`, `mineHit`, `water`, `squeeze`, `drink`, `pickup`, `social`, `giant`, `quest`, `dice`) and looping biome-specific background music (`lost_woods`, `vam_road`, `andra`, `kalavana`, `interior`, `thriller`, `musicblock`).
- `public/js/data.js`: Complete catalog of 21 items with authentic verbs, 4 placeable Furniture items, 7-category Skills with Brain Capacity penalty math, 6 Giants of Ur, 4 multi-step Quests, 6 Badges, and Glitchen customization palettes.
- `public/js/avatar.js`: Procedural 2D side-view Glitchen character renderer with oversized rounded head, blinking oval eyes, customizable hair/hat/shirt/pants/skin, size scaling (`0.55x` shrunk, `1.0x` normal, `1.6x` embiggened), animations (`idle`, `walk`, `jump`, `dance`, `wave`, `highfive`, `hug`, `drink`, `squeeze`), overhead speech bubbles, and swinging tool thought bubbles (`pickaxe`, `watering_can`, `shovel`, `hi`).
- `public/js/streets.js`: Multi-layer parallax backgrounds, climbable platforms, interactive nodes, roaming critters (Chickens, Butterflies, Piggies), and floating stat orbs across all 5 areas:
  1. `home_street` (**Beau's Home Street** — switchable between `Lost Woods` dark forest and `Vam Road` snowy lake/pines via the Magic Rock)
  2. `chego_chase` (**Chego Chase in Andra** — Ministry of Departments stepped pyramid, Shrine to Grendaline, Spice Tree, Dirt Pile, Butterflies)
  3. `andra_hall` (**Andra Bureaucratic Hall** — Director Wigglesbottom, Magister Piksnikson, Water Cooler, and orange Waiting Area chairs with 10-second standstill timer)
  4. `bongul_beat` (**Bongul Beat in Andra** — Shrine to Humbaba, Animal Goods Street Spirit Vendor, Cherry Tree, Chickens, Piggy, Dirt Pile)
  5. `goli_grabs` (**Goli Grabs in Kalavana** — Underground cavern bridge, Shrine to Lem, Simmering Cauldron, Deep Beryl Vein, Kitchen Vendor)
- `public/js/ui.js`: HUD state binding, speech-bubble verb menus, custom canvas item icon renderer, and modal windows for World Map, Skills & Brain Capacity, Wardrobe/Vanity, Quests & Giant Favor, and Street Spirit Vendor Buy/Sell.
- `public/js/main.js`: Fixed-timestep 60fps simulation, forgiving floaty jump physics (coyote time, jump buffer, one-way platform drop-through), smooth look-ahead camera, cooperative mining & social multiplayer, `window.State` and `window.__events` contract tracking.

## Status
- All 34 rules and 5 areas from `SPEC.md` are implemented, verified in multiplayer browser sessions, and passing `check_game` with zero console errors.
