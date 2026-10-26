# The Argon game kit

Your workspace is a small web game project:

- `server.js`: a zero-dependency Node 22 server. It serves `public/` and relays multiplayer messages over a WebSocket at `/ws`. The protocol is documented at the top of the file. Leave the relay alone unless the game needs authority on the server (shared enemies, timers); there are marked hooks for that.
- `public/net.js`: the client side of that protocol. Read its header once. It handles rooms, joins, state sync at 15 Hz, shared world state, host election and reconnects, and it never throws when the server is unreachable.
- `public/index.html`: the game. Split larger games into several files under `public/` (for example `public/js/world.js`, `public/js/player.js`) loaded with plain `<script>` tags. Use no build step, no npm packages, no CDNs and no external assets. Draw everything procedurally (canvas 2D or WebGL by hand) and synthesize every sound with WebAudio.

## The contract your game must keep

Playtest agents drive the game in a real browser and read these:

- URL params: `?name=` (player name), `?room=` (multiplayer room), `?seed=` (seeded RNG, so runs repeat).
- `window.State`: the live game state (player position, area, score, health, camera). Keep it current.
- `window.__events`: an array the game pushes `{t: <ms since start>, type, ...}` to for meaningful moments: area change, pickup, item use, score change, hit, death, win, chat, player join and leave.
- Keyboard and mouse input only, in the original's control scheme. The first screen leads into play with a single key or click.
- It runs at 60 fps with a fixed-timestep simulation and never throws in the console.

Run the game with `node server.js` (`PORT` env, default 8090). Your tools start it for you.
