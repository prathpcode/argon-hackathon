# Whim — Revival Developer Notes

## Architecture Overview
- `server.js` + `package.json`: Zero-dependency Node 22 HTTP + WebSocket multiplayer server (`/ws`), relaying 15 Hz player states, chat/social events, Cubimal races, and shared room state (`towerProgress`, `homeStyle`).
- `public/net.js`: Resilient multiplayer WebSocket client with automatic reconnect and solo fallback.
- `public/index.html` & `public/style.css`: Authentic `#EBF2F5` Glitch-inspired UI chrome:
  - Top header with "Whim" logo, circular green Mood badge (`#5C9E31`), horizontal pill Energy bar (`#4E8B27`), light-blue iMG/XP bar (`#8AB8CC`) & Level badge, Magic Rock Quests button, real-time Skills indicator, World Map & Go Home quick buttons, audio toggles, in-game clock (`Primday, 23rd of Recurse`), and Avatar portrait dropdown.
  - Street viewport (72% width) with floating top-right Mini-Map strip (terrain preview, local green dot, remote blue dots, World expand label), 15-second bureaucratic `"Please Wait"` timer box, and Qurazy quoin banner.
  - Right-hand collapsible sidebar (28% width) with `Local Chat / Activity`, `Global`, and `Party` channels, system logs, and chat input.
  - Bottom bar with spinning gold Currants counter (`1,447 currants`), 16 `#DFE8EC` inventory slots with custom procedural SVG icons, expandable 6-slot bag row (when `Generic Green Bag` is opened), and `Inventory` / `Furniture` mode toggle + text search filter.
- `public/js/audio.js`: Procedural WebAudio synthesizer for footsteps, jumps, landings, quoin chimes, chicken squeezes, pickaxe mining, shovel digging, watering, Giant fanfares, Musicblocks (`GNG` and `DG-2`), and street-specific ambient music loops (Savanna, Spooky Lost Woods, Snowy Vorn Road, Cavern, Bureaucratic Hall, and Thriller funk).
- `public/js/data.js`: Full catalogs for 32 items (with stack limits like 1-per-slot `Cup of Water`), the 11 Giants, 7 Skill categories with real-time countdown timers and Brain Capacity, 4 multi-step Quests, Wardrobe customization options, and all 5 canonical streets from `SPEC.md` (**Chego Chase**, **Andra Bureaucratic Hall**, **Bongul Beat**, **Goli Grabs**, **Beau's Home Street**, plus **House of Whimsy Interior**).
- `public/js/avatar.js`: Procedural 2D cartoon character renderer with customizable facial features, hats, coats/capes, shirts, pants/skirts/dresses, scale buffs (`Tincture of Tiny` and `Draft of Giantness`), overhead speech bubbles, and animations for idle breathing/blinking, walking, jumping, falling, climbing ladders, mining, digging, watering, and synchronized Thriller zombie dancing.
- `public/js/world.js`: Multi-layer parallax street renderer, climbable ledges/roofs/ladders, cyan hover outlines, pale-green pill tooltips, and procedural artwork for all street buildings, shrines, trees, rocks, animals, bureaucrats, and floating quoins.
- `public/js/ui.js` & `public/js/game.js`: 60 Hz fixed-timestep simulation, `window.State` & `window.__events` contract maintenance, seeded RNG, co-op mining/digging bonuses, conga line following, and daily sign (`o/`) matching.

## What Is Done
- All 41 rules and all 5 areas in `SPEC.md` are implemented and verified in multiplayer browser sessions.
- `check_game` passes with zero console or server errors.
