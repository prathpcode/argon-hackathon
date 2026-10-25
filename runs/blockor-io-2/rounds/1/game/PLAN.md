# Blockor.io Revival — Plan (GEMBLOX.IO)

## Core Loop
Spawn into a vibrant diamond-grid arena as a single 1x1 glossy gem block (or Heart Block in Heart Mode) that glides smoothly toward your mouse cursor. Collect scattered 1x1 gem blocks that magnetically snap onto your local rotating grid at the point of contact; whenever contiguous blocks fill an NxN square (2x2, 3x3, 4x4, up to massive squares), they automatically merge with a satisfying flash, pop, and chime into a single giant beveled gem block (or custom skin tile). Use `A` and `D` (or Left/Right arrows) to spin your structure—spending green boost energy for rotational torque and a burst of speed—to align your biggest merged blocks like a battering ram against smaller enemy blocks, or press `W` / `Space` to eject 1x1 blocks toward the cursor to shed mass, feed friends, or reshape your cluster, while dodging deadly white obstacle mines and shattering giant neutral food gems on your climb to #1 on the leaderboard.

## What Made the Original Fun
1. **Spatial Puzzle in Real-Time Motion**: Every stray 1x1 gem attaches exactly where it touches your rotating local grid. Rotating with `A`/`D` to catch stray blocks in missing L-corners and watching 9 or 16 small blocks suddenly fuse into a gleaming giant square ("perfect pearl") is deeply gratifying.
2. **Positional Asymmetric Combat**: Unlike standard circle-eating `.io` games, your body is a composite of big merged squares, medium squares, and vulnerable 1x1 outer blocks (plus your named Core / Heart block). Small nimble players can chip off outer blocks or snipe an exposed core, while giants spin their massive merged block around like a shield and warhammer.
3. **High-Stakes White Obstacles & Giant Food Gems**: White obstacle blocks can shatter an entire giant merged square into dozens of collectible 1x1s in an instant—creating chaotic mass spills that draw every nearby player into a feeding frenzy.
4. **Expressive Skins & Crisp Visuals**: Every merged square scales up the player's chosen gem color or creator/character emblem with glossy 3D bevels, set against a clean light or dark diamond-patterned grid with a 4x4 sector minimap, lime-green energy pill bar, and neon-colored Top 10 leaderboard.

## Ordered Feature List

### First Minute Experience & Core Gameplay
1. **Instant-Play Title Overlay & HUD**: Purple 3D floating-gem menu overlay with `GEMBLOX.IO` isometric logo, Nickname input, `PLAY GAME` button (one click or Enter/Space starts immediately), `SKIN` selector modal (`←` / `→` preview + Save), Settings gear (`Dark Background` toggle, Region selector, Heart Block mode toggle), and Party Create/Join room links. Also auto-spawns directly or starts with one click/keypress so players are in the action within seconds.
2. **Local Grid & Maximal NxN Square Merging Engine**:
   - Each player (and bot/remote player) has a world position `(x, y)`, orientation angle `theta`, velocity `(vx, vy)`, angular velocity, and an integer grid of occupied cells around their Core/Heart cell `(0,0)`.
   - Greedy maximal square decomposition (`1x1`, `2x2`, `3x3`, `4x4`, `5x5`, `6x6`...): whenever cells change, recompute the optimal non-overlapping `NxN` merged squares (keeping the core/heart block tracked) and trigger merge pop animations, particles, and synthesized harmonic chimes when a larger square forms.
3. **Mouse Movement, A/D Rotation Boost & W Ejection**:
   - Smooth cursor-following movement where top speed scales inversely with total mass/largest block size.
   - `A` / `D` (and `ArrowLeft` / `ArrowRight`) rotate the block cluster counter-clockwise / clockwise, draining the bottom-left green energy bar (0–100%), granting a speed boost + golden spin aura, and detaching loose outer 1x1 blocks when spinning at high speed.
   - `W` (or `Space`) ejects a 1x1 block from the outer edge of the cluster toward the mouse cursor (decomposing merged squares if needed so players can shed mass to speed up or feed allies), consuming a small amount of energy.
4. **Arena World: Diamond Grid, Perimeter Wall, White Obstacles & Giant Food Gems**:
   - Authentic 45-degree rotated diamond grid background with double-line diamonds, intersection mini-diamonds, and center ring-dots (in both Light `#F5F5F5` and Dark `#181A20` themes).
   - Continuous perimeter wall of 2x2 white/grey obstacle blocks with recessed inner frames and radial centers, plus scattered destructible white obstacle blocks inside the arena.
   - Hundreds of colorful stray 1x1 gem blocks (cyan, magenta, orange, yellow, lime, royal blue) that gently pull in and snap to the nearest open adjacent grid cell on contact.
   - Large neutral glossy Food Gems (pink/magenta and bright green 4x4/5x5 gems with 4-point star sparkles) that bounce smaller players off and shatter into a rich burst of 1x1 blocks when rammed by a sufficiently large block.
5. **Block-vs-Block Combat, Obstacles & AI Rivals + Live Multiplayer**:
   - Block-by-block collision detection: when block `A` (size `N`) hits enemy block `B` (size `M`), the larger block shatters the smaller block into scattered 1x1 gems on the map.
   - Hitting a white obstacle shatters the colliding merged block into collectible 1x1s and damages/destroys the white obstacle; if the player's Core / Heart block is destroyed, the player shatters completely and can respawn immediately.
   - Populated with smart, active AI rival block clusters (with realistic names, skins, rotation tactics, and sizes) alongside real WebSocket multiplayer players via `Net` and `server.js`, so the arena is always lively even solo.
6. **Complete HUD, Custom Skins, Audio & Polish**:
   - Top-left 4x4 sector translucent cyan minimap showing player position, #1 crown/leader, and nearby players.
   - Bottom-left vertical pill-shaped lime-green energy bar with `100%` readout.
   - Top-right neon-colored Top 10 Leaderboard with rank, name, colored square icon, and real-time block score (1 cell = 1 point) plus player's own rank row.
   - Built-in procedural skins (Default Gems in 6 colors, Flame K, Green Jelly, Crown King, Cyber Shark, Bear Hat, Heart Core) tiled across every merged square.
   - Full WebAudio synthesizer: bright pop/snap on 1x1 pickup, rising chord on NxN square merge, whoosh/hum on spin boost, pew on W-eject, crystalline shatter on block break, and light ambient background pulse.
