// Arena World, Diamond Grid Background, Stray 1x1 Blocks, White Obstacles, Giant Food Gems & AI Rivals
(function () {
  const UNIT = window.Cluster.UNIT; // 28px
  const ARENA_HALF = 2200; // 4400x4400 world
  const OBSTACLE_SIZE = UNIT * 2; // 2x2 unit white obstacle blocks

  // Seeded RNG for repeatable deterministic runs when ?seed= is passed
  function createRng(seedStr) {
    let h = 2166136261 >>> 0;
    const str = String(seedStr || "gemblox-default-seed");
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return function () {
      h += 0x6d2b79f5;
      let t = Math.imul(h ^ (h >>> 15), 1 | h);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const BOT_PROFILES = [
    { name: "MasterOv", skinId: "masterov_m", starter: 3 },
    { name: "Kwebbelkop", skinId: "kops_flame", starter: 4 },
    { name: "Jelly", skinId: "green_jelly", starter: 3 },
    { name: "AzzyLand", skinId: "azzyland_pink", starter: 2 },
    { name: "M7mdShaRK", skinId: "shark_diamond", starter: 3 },
    { name: "KingMuqeem", skinId: "king_crown", starter: 2 },
    { name: "Slogoman", skinId: "slogoman_red", starter: 2 },
    { name: "ZephPlayz", skinId: "gem_purple", starter: 2 },
    { name: "FaZe_Mojo", skinId: "faze_mojo", starter: 2 },
    { name: "PerolaPro", skinId: "holiday_bear", starter: 3 },
    { name: "Pop_SK", skinId: "gem_yellow", starter: 1 }
  ];

  // Offscreen pattern tile & CanvasPattern cache for zero-stall 60fps diamond grid rendering
  let lightTile = null;
  let darkTile = null;
  const lightPatternCache = new WeakMap();
  const darkPatternCache = new WeakMap();

  function buildDiamondTile(isDark) {
    const size = 88; // Repeat period of rotated diamond pattern
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const g = c.getContext("2d");

    g.fillStyle = isDark ? "#171920" : "#f3f4f7";
    g.fillRect(0, 0, size, size);

    const half = size * 0.5;
    if (isDark) {
      g.fillStyle = "#1c1f28";
      g.beginPath();
      g.moveTo(half, 0);
      g.lineTo(size, half);
      g.lineTo(half, size);
      g.lineTo(0, half);
      g.closePath();
      g.fill();
    }

    // Outer diamond line
    g.strokeStyle = isDark ? "rgba(255,255,255,0.065)" : "rgba(130, 138, 155, 0.25)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(half, 0);
    g.lineTo(size, half);
    g.lineTo(half, size);
    g.lineTo(0, half);
    g.closePath();
    g.stroke();

    // Inner double-line diamond
    const inset = 6;
    g.strokeStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(145, 154, 170, 0.18)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(half, inset);
    g.lineTo(size - inset, half);
    g.lineTo(half, size - inset);
    g.lineTo(inset, half);
    g.closePath();
    g.stroke();

    // Small concentric diamond at intersections (center + 4 corners)
    const pts = [
      [0, 0],
      [size, 0],
      [0, size],
      [size, size]
    ];
    const r = 6;
    g.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(120, 128, 145, 0.28)";
    for (const [px, py] of pts) {
      g.beginPath();
      g.moveTo(px, py - r);
      g.lineTo(px + r, py);
      g.lineTo(px, py + r);
      g.lineTo(px - r, py);
      g.closePath();
      g.stroke();
    }

    // Center faint circular ring + tiny dot inside each diamond (as seen in Video A)
    g.strokeStyle = isDark ? "rgba(255,255,255,0.05)" : "rgba(130, 138, 155, 0.20)";
    g.beginPath();
    g.arc(half, half, 9, 0, Math.PI * 2);
    g.stroke();

    g.fillStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(130, 138, 155, 0.28)";
    g.beginPath();
    g.arc(half, half, 2, 0, Math.PI * 2);
    g.fill();

    return c;
  }

  function getCachedPattern(ctx, isDark) {
    if (!lightTile) lightTile = buildDiamondTile(false);
    if (!darkTile) darkTile = buildDiamondTile(true);
    const cache = isDark ? darkPatternCache : lightPatternCache;
    let pat = cache.get(ctx);
    if (!pat) {
      pat = ctx.createPattern(isDark ? darkTile : lightTile, "repeat");
      if (pat) cache.set(ctx, pat);
    }
    return pat;
  }

  class World {
    constructor(seedStr) {
      this.rng = createRng(seedStr);
      this.arenaHalf = ARENA_HALF;
      this.strayBlocks = []; // { id, x, y, vx, vy, colorIdx, angle, cooldown }
      this.obstacles = [];   // { id, x, y, hp, maxHp, respawnTimer }
      this.foodGems = [];    // { id, x, y, vx, vy, size, colorIdx, angle, respawnTimer }
      this.particles = [];   // { x, y, vx, vy, color, size, life, maxLife }
      this.floatTexts = [];  // { x, y, text, color, life, maxLife }
      this.bots = [];
      this.nextEntityId = 1;
      this.pvpHitCooldowns = new Map(); // key -> timestamp

      this.initWorld();
    }

    // Check if (x, y) is within `minDist` of any interior obstacle
    isNearObstacle(x, y, minDist = OBSTACLE_SIZE * 1.35) {
      const minSq = minDist * minDist;
      for (const obs of this.obstacles) {
        if (obs.respawnTimer > 0) continue;
        const dx = x - obs.x;
        const dy = y - obs.y;
        if (dx * dx + dy * dy < minSq) return true;
      }
      return false;
    }

    // Pick a random coordinate inside the arena that does not overlap any obstacle
    findSafeCoord(margin = 160, minDistObs = OBSTACLE_SIZE * 1.4, minDistOrigin = 0) {
      for (let attempt = 0; attempt < 24; attempt++) {
        const x = (this.rng() * 2 - 1) * (ARENA_HALF - margin);
        const y = (this.rng() * 2 - 1) * (ARENA_HALF - margin);
        if (minDistOrigin > 0 && Math.hypot(x, y) < minDistOrigin) continue;
        if (!this.isNearObstacle(x, y, minDistObs)) {
          return { x, y };
        }
      }
      return {
        x: (this.rng() * 2 - 1) * (ARENA_HALF - margin),
        y: (this.rng() * 2 - 1) * (ARENA_HALF - margin)
      };
    }

    initWorld() {
      this.strayBlocks = [];
      this.obstacles = [];
      this.foodGems = [];
      this.bots = [];

      // 1. Scattered interior white obstacle blocks without overlapping each other or the spawn zone (Rules 17, 18, 19)
      const obsCount = 44;
      for (let i = 0; i < obsCount; i++) {
        let placed = false;
        for (let attempt = 0; attempt < 30; attempt++) {
          const angle = this.rng() * Math.PI * 2;
          const dist = 340 + this.rng() * (ARENA_HALF - 500);
          const ox = Math.round((Math.cos(angle) * dist) / OBSTACLE_SIZE) * OBSTACLE_SIZE;
          const oy = Math.round((Math.sin(angle) * dist) / OBSTACLE_SIZE) * OBSTACLE_SIZE;
          if (!this.isNearObstacle(ox, oy, OBSTACLE_SIZE * 2.5)) {
            this.obstacles.push({
              id: this.nextEntityId++,
              x: ox,
              y: oy,
              hp: 3,
              maxHp: 3,
              respawnTimer: 0
            });
            placed = true;
            break;
          }
        }
        if (!placed) {
          const ox = Math.round(((this.rng() * 2 - 1) * (ARENA_HALF - 480)) / OBSTACLE_SIZE) * OBSTACLE_SIZE;
          const oy = Math.round(((this.rng() * 2 - 1) * (ARENA_HALF - 480)) / OBSTACLE_SIZE) * OBSTACLE_SIZE;
          if (Math.hypot(ox, oy) > 340 && !this.isNearObstacle(ox, oy, OBSTACLE_SIZE * 1.8)) {
            this.obstacles.push({
              id: this.nextEntityId++,
              x: ox,
              y: oy,
              hp: 3,
              maxHp: 3,
              respawnTimer: 0
            });
          }
        }
      }

      // 2. Large neutral glossy Food Gems placed safely away from obstacles (Rule 20)
      const foodGemCount = 18;
      for (let i = 0; i < foodGemCount; i++) {
        this.spawnFoodGem();
      }

      // 3. Abundant stray 1x1 gem blocks across the arena away from obstacles (Rule 2)
      const initialStrays = 500;
      for (let i = 0; i < initialStrays; i++) {
        this.spawnStrayBlock();
      }

      // 4. Populate initial starter ring near origin (0,0) so the player can immediately collect & merge in the first 5 seconds!
      this.spawnStarterRingAround(0, 0);

      // 5. Spawn active AI rival block clusters
      for (let i = 0; i < BOT_PROFILES.length; i++) {
        const prof = BOT_PROFILES[i];
        const a = (i / BOT_PROFILES.length) * Math.PI * 2 + 0.35;
        const dist = 540 + (i % 3) * 440;
        let bx = Math.cos(a) * dist;
        let by = Math.sin(a) * dist;
        if (this.isNearObstacle(bx, by, OBSTACLE_SIZE * 2.2)) {
          const safe = this.findSafeCoord(350, OBSTACLE_SIZE * 2.4, 480);
          bx = safe.x;
          by = safe.y;
        }
        const bot = new window.Cluster.BlockCluster({
          id: `bot_${i + 1}`,
          name: prof.name,
          skinId: prof.skinId,
          isBot: true,
          x: bx,
          y: by,
          starterSize: prof.starter
        });
        const extra = Math.floor(this.rng() * 4);
        for (let e = 0; e < extra; e++) {
          bot.attachAtLocal((this.rng() - 0.5) * 2.5, (this.rng() - 0.5) * 2.5);
        }
        bot.aiTargetX = bot.x;
        bot.aiTargetY = bot.y;
        bot.aiTimer = 0;
        bot.decayTimer = 0;
        bot.respawnTimer = 0;
        this.bots.push(bot);
      }
    }

    spawnStarterRingAround(cx, cy) {
      const nearColors = [0, 1, 2, 3, 4, 5];
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const r = 82 + (i % 3) * 34;
        const sx = cx + Math.cos(a) * r;
        const sy = cy + Math.sin(a) * r;
        if (this.isNearObstacle(sx, sy, OBSTACLE_SIZE * 1.1)) continue;
        this.strayBlocks.push({
          id: this.nextEntityId++,
          x: sx,
          y: sy,
          vx: 0,
          vy: 0,
          colorIdx: nearColors[i % nearColors.length],
          angle: 0,
          cooldown: 0
        });
      }
    }

    spawnStrayBlock(x, y, vx = 0, vy = 0, colorIdx = null, cooldown = 0) {
      const margin = 120;
      let sx = x;
      let sy = y;
      if (typeof sx !== "number" || typeof sy !== "number") {
        const pt = this.findSafeCoord(margin, OBSTACLE_SIZE * 1.25, 0);
        sx = pt.x;
        sy = pt.y;
      }
      const cIdx = colorIdx !== null ? colorIdx : Math.floor(this.rng() * 6);
      const blk = {
        id: this.nextEntityId++,
        x: sx,
        y: sy,
        vx,
        vy,
        colorIdx: cIdx,
        angle: 0,
        cooldown
      };
      this.strayBlocks.push(blk);
      return blk;
    }

    spawnFoodGem() {
      const margin = 280;
      const colorIdx = this.rng() < 0.55 ? 1 : 4;
      const size = this.rng() < 0.65 ? 3 : 4; // 3x3 or 4x4 gem
      const pt = this.findSafeCoord(margin, OBSTACLE_SIZE * 2.1, 220);
      this.foodGems.push({
        id: this.nextEntityId++,
        x: pt.x,
        y: pt.y,
        vx: 0,
        vy: 0,
        size,
        colorIdx,
        respawnTimer: 0
      });
    }

    addParticles(x, y, color, count = 10, speed = 180) {
      if (this.particles.length > 180) return;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = (0.3 + Math.random() * 0.7) * speed;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          color,
          size: 4 + Math.random() * 6,
          life: 0.35 + Math.random() * 0.25,
          maxLife: 0.6
        });
      }
    }

    addFloatText(x, y, text, color = "#ffffff") {
      if (this.floatTexts.length > 24) this.floatTexts.shift();
      this.floatTexts.push({
        x,
        y,
        text,
        color,
        life: 0.95,
        maxLife: 0.95
      });
    }

    // Scatter a list of dropped 1x1 cells into collectible blocks on the map, pushing clear of obstacles if needed
    scatterDroppedCells(dropped, originX, originY, minClearDist = 0) {
      const cap = Math.min(dropped.length, 36);
      for (let i = 0; i < cap; i++) {
        const d = dropped[i];
        const a = Math.atan2(d.wy - originY, d.wx - originX) + (Math.random() - 0.5) * 0.7;
        const spd = 95 + Math.random() * 185;
        let sx = d.wx;
        let sy = d.wy;
        if (minClearDist > 0) {
          const distFromOrigin = Math.hypot(sx - originX, sy - originY);
          if (distFromOrigin < minClearDist) {
            sx = originX + Math.cos(a) * (minClearDist + 8);
            sy = originY + Math.sin(a) * (minClearDist + 8);
          }
        }
        this.spawnStrayBlock(
          sx,
          sy,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          d.colorIdx,
          0.38
        );
      }
    }

    // Host serialization of AI bots so all multiplayer clients in the same room share identical bots & leaderboard
    serializeBots() {
      return this.bots.map((b) => ({
        id: b.id,
        n: b.name,
        sk: b.skinId,
        x: Math.round(b.x),
        y: Math.round(b.y),
        vx: Math.round(b.vx),
        vy: Math.round(b.vy),
        a: Number(b.angle.toFixed(3)),
        sc: b.score,
        sp: b.spinning ? 1 : 0,
        al: b.alive ? 1 : 0,
        sq: b.squares.map((s) => [s.gx, s.gy, s.size, s.isCore ? 1 : 0, s.isHeart ? 1 : 0])
      }));
    }

    // Non-host clients sync bot positions, scores, and squares from the room host
    applyHostBots(hostBots, dt) {
      if (!Array.isArray(hostBots)) return;
      for (let i = 0; i < hostBots.length && i < this.bots.length; i++) {
        const hb = hostBots[i];
        const bot = this.bots[i];
        if (!hb || !bot) continue;
        bot.name = hb.n || bot.name;
        bot.skinId = hb.sk || bot.skinId;
        bot.alive = !!hb.al;
        bot.spinning = !!hb.sp;
        if (bot.alive) {
          const dist = Math.hypot(hb.x - bot.x, hb.y - bot.y);
          if (dist > 300) {
            bot.x = hb.x;
            bot.y = hb.y;
          } else {
            bot.x += (hb.x - bot.x) * Math.min(1, 10 * dt);
            bot.y += (hb.y - bot.y) * Math.min(1, 10 * dt);
          }
          bot.angle = hb.a || 0;
          if (Array.isArray(hb.sq) && hb.sq.length > 0) {
            bot.squares = hb.sq.map((item) => ({
              gx: item[0],
              gy: item[1],
              size: item[2],
              isCore: !!item[3],
              isHeart: !!item[4]
            }));
            // Keep bot.cells count synced to host score so bot.score matches host leaderboard
            const targetSc = Math.max(1, hb.sc || 1);
            if (bot.cells.size !== targetSc) {
              bot.cells.clear();
              const cIdx = bot.getSkinColorIdx();
              for (let c = 0; c < targetSc; c++) {
                bot.cells.set(`${c},0`, { colorIdx: cIdx, addedAt: 0 });
              }
            }
            let maxR = UNIT * 0.75;
            let maxSz = 1;
            for (const sq of bot.squares) {
              if (sq.size > maxSz) maxSz = sq.size;
              const d = (Math.hypot(sq.gx + sq.size * 0.5, sq.gy + sq.size * 0.5) + sq.size * 0.75) * UNIT;
              if (d > maxR) maxR = d;
            }
            bot.radius = maxR;
            bot.maxSquareSize = maxSz;
          }
        }
      }
    }

    update(dt, localPlayer, callbacks = {}, net = null) {
      const isMultiplayerClient = !!(net && net.online && !net.isHost && net.shared && Array.isArray(net.shared.bots));

      // Keep stray block count healthy without overflowing
      while (this.strayBlocks.length < 440) {
        this.spawnStrayBlock();
      }
      if (this.strayBlocks.length > 620) {
        this.strayBlocks.splice(0, this.strayBlocks.length - 620);
      }

      const activeClusters = [];
      if (localPlayer && localPlayer.alive) activeClusters.push(localPlayer);
      for (const b of this.bots) {
        if (b.alive) activeClusters.push(b);
      }

      for (let i = this.strayBlocks.length - 1; i >= 0; i--) {
        const sb = this.strayBlocks[i];
        if (sb.cooldown > 0) sb.cooldown = Math.max(0, sb.cooldown - dt);

        sb.x += sb.vx * dt;
        sb.y += sb.vy * dt;
        sb.vx *= Math.pow(0.04, dt);
        sb.vy *= Math.pow(0.04, dt);

        // Clamp within arena
        const lim = ARENA_HALF - UNIT * 1.5;
        if (sb.x < -lim) { sb.x = -lim; sb.vx = Math.abs(sb.vx); }
        if (sb.x > lim) { sb.x = lim; sb.vx = -Math.abs(sb.vx); }
        if (sb.y < -lim) { sb.y = -lim; sb.vy = Math.abs(sb.vy); }
        if (sb.y > lim) { sb.y = lim; sb.vy = -Math.abs(sb.vy); }

        if (sb.cooldown > 0) continue;

        // Check attachment against active clusters
        let attached = false;
        for (const cl of activeClusters) {
          // Cap AI bot size at 72 blocks so bots never balloon into 150-cell lag monsters
          if (cl.isBot && (isMultiplayerClient || cl.score >= 72)) continue;

          const dx = sb.x - cl.x;
          const dy = sb.y - cl.y;
          const maxCheck = cl.radius + UNIT * 2.0;
          if (dx * dx + dy * dy > maxCheck * maxCheck) continue;

          const loc = cl.worldToLocal(sb.x, sb.y);
          const snap = cl.findSnapCell(loc.lx, loc.ly);
          if (snap) {
            const wSnap = cl.localToWorld(snap.gx, snap.gy);
            const distSnap = Math.hypot(sb.x - wSnap.wx, sb.y - wSnap.wy);
            if (distSnap < UNIT * 1.12) {
              const res = cl.attachAtLocal(loc.lx, loc.ly, sb.colorIdx);
              if (res) {
                this.strayBlocks.splice(i, 1);
                attached = true;
                if (cl === localPlayer && callbacks.onLocalPickup) {
                  callbacks.onLocalPickup(res, wSnap.wx, wSnap.wy, sb.colorIdx);
                }
                break;
              }
            } else if (distSnap < UNIT * 1.65) {
              // Gentle magnetic pull toward the best pocket snap slot
              sb.vx += ((wSnap.wx - sb.x) / distSnap) * 440 * dt;
              sb.vy += ((wSnap.wy - sb.y) / distSnap) * 440 * dt;
            }
          }
        }
        if (attached) continue;
      }

      // Update obstacles & check collisions with clusters (Rules 17, 18, 19)
      for (const obs of this.obstacles) {
        if (obs.respawnTimer > 0) {
          obs.respawnTimer -= dt;
          if (obs.respawnTimer <= 0) {
            obs.hp = obs.maxHp;
            obs.respawnTimer = 0;
          }
          continue;
        }

        for (const cl of activeClusters) {
          if (cl.isBot && isMultiplayerClient) continue;
          if (!cl.alive || cl.invuln > 0) continue;
          const distCenter = Math.hypot(cl.x - obs.x, cl.y - obs.y);
          if (distCenter > cl.radius + OBSTACLE_SIZE) continue;

          // Check outer/non-core squares first so brushing an obstacle sheds outer blocks before threatening core
          const orderedSquares = [...cl.squares].sort((a, b) => (a.isCore ? 1 : 0) - (b.isCore ? 1 : 0));

          for (const sq of orderedSquares) {
            const b = cl.getSquareWorldBounds(sq);
            const hitDist = b.half + OBSTACLE_SIZE * 0.42;
            if (Math.abs(b.wx - obs.x) < hitDist && Math.abs(b.wy - obs.y) < hitDist) {
              // Forgiving obstacle bounce for small 1x1 and 2x2 core squares (Video C 03:28-03:34, Video E 01:40)
              if ((sq.isCore || sq.isHeart) && sq.size <= 2) {
                const outerSq = cl.squares.find((s) => !s.isCore && !s.isHeart);
                if (outerSq) {
                  const sh = cl.shatterSquare(outerSq);
                  this.scatterDroppedCells(sh.dropped, obs.x, obs.y, OBSTACLE_SIZE * 0.95);
                }
                const coreWorld = cl.getCoreWorldCenter();
                const pushA = Math.atan2(coreWorld.wy - obs.y, coreWorld.wx - obs.x);
                cl.vx = Math.cos(pushA) * 280;
                cl.vy = Math.sin(pushA) * 280;
                cl.x += Math.cos(pushA) * 14;
                cl.y += Math.sin(pushA) * 14;
                cl.invuln = Math.max(cl.invuln, 0.35);
                this.addParticles(b.wx, b.wy, "#ffffff", 8, 180);
                break;
              }

              const sh = cl.shatterSquare(sq);
              this.scatterDroppedCells(sh.dropped, obs.x, obs.y, OBSTACLE_SIZE * 0.95);
              this.addParticles(b.wx, b.wy, "#ffffff", 14, 240);

              obs.hp -= 1;
              if (obs.hp <= 0) {
                obs.respawnTimer = 18;
              }

              if (!cl.alive && cl.isBot) {
                cl.respawnTimer = 5;
              }

              if (cl === localPlayer && callbacks.onLocalHitObstacle) {
                callbacks.onLocalHitObstacle(sh.fatal, sq.size, b.wx, b.wy);
              }
              break;
            }
          }
        }
      }

      // Update Giant Neutral Food Gems (Rule 20)
      for (const fg of this.foodGems) {
        if (fg.respawnTimer > 0) {
          fg.respawnTimer -= dt;
          if (fg.respawnTimer <= 0) {
            fg.respawnTimer = 0;
            const pt = this.findSafeCoord(280, OBSTACLE_SIZE * 2.1, 220);
            fg.x = pt.x;
            fg.y = pt.y;
          }
          continue;
        }

        fg.x += fg.vx * dt;
        fg.y += fg.vy * dt;
        fg.vx *= Math.pow(0.05, dt);
        fg.vy *= Math.pow(0.05, dt);

        const fgSide = fg.size * UNIT;
        const fgHalf = fgSide * 0.5;

        for (const cl of activeClusters) {
          if (cl.isBot && isMultiplayerClient) continue;
          if (!cl.alive) continue;
          if (Math.hypot(cl.x - fg.x, cl.y - fg.y) > cl.radius + fgSide) continue;

          for (const sq of cl.squares) {
            const b = cl.getSquareWorldBounds(sq);
            const overlap = b.half + fgHalf * 0.88;
            if (Math.abs(b.wx - fg.x) < overlap && Math.abs(b.wy - fg.y) < overlap) {
              if (sq.size >= 2 || cl.score >= 6) {
                const count = fg.size * fg.size + 4;
                for (let k = 0; k < count; k++) {
                  const a = (k / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
                  const spd = 70 + Math.random() * 140;
                  this.spawnStrayBlock(
                    fg.x + (Math.random() - 0.5) * fgSide * 0.5,
                    fg.y + (Math.random() - 0.5) * fgSide * 0.5,
                    Math.cos(a) * spd,
                    Math.sin(a) * spd,
                    fg.colorIdx,
                    0.12
                  );
                }
                const pal = window.Skins.getPalette(fg.colorIdx);
                this.addParticles(fg.x, fg.y, pal.top, 18, 250);
                fg.respawnTimer = 14;
                cl.angle += (Math.random() - 0.5) * 0.35;
                if (cl === localPlayer && callbacks.onLocalShatterFoodGem) {
                  callbacks.onLocalShatterFoodGem(fg.x, fg.y, count);
                }
              } else {
                const coreWorld = cl.getCoreWorldCenter();
                const pushA = Math.atan2(fg.y - coreWorld.wy, fg.x - coreWorld.wx);
                fg.vx = Math.cos(pushA) * 140;
                fg.vy = Math.sin(pushA) * 140;
                cl.vx = -Math.cos(pushA) * 160;
                cl.vy = -Math.sin(pushA) * 160;
              }
              break;
            }
          }
        }
      }

      // Update AI Bots (Host runs AI simulation; non-host clients sync from net.shared.bots)
      if (isMultiplayerClient) {
        this.applyHostBots(net.shared.bots, dt);
      } else {
        for (const bot of this.bots) {
          if (!bot.alive) {
            bot.respawnTimer -= dt;
            if (bot.respawnTimer <= 0) {
              const pt = this.findSafeCoord(400, OBSTACLE_SIZE * 2.3, 520);
              bot.x = pt.x;
              bot.y = pt.y;
              bot.vx = 0;
              bot.vy = 0;
              bot.alive = true;
              bot.invuln = 2.0;
              bot.initStarter(1 + Math.floor(this.rng() * 2));
            }
            continue;
          }

          // Apply score decay to large AI bots (> 68 cells) just like large players so bots stay compact & fast
          if (bot.score > 68) {
            bot.decayTimer = (bot.decayTimer || 0) + dt;
            if (bot.decayTimer >= 1.1) {
              bot.decayTimer = 0;
              bot.detachOuterUnmerged();
            }
          }

          bot.aiTimer -= dt;
          let rotLeft = false;
          let rotRight = false;

          if (bot.aiTimer <= 0) {
            bot.aiTimer = 0.65 + this.rng() * 0.9;
            let bestX = bot.x + (this.rng() - 0.5) * 700;
            let bestY = bot.y + (this.rng() - 0.5) * 700;

            for (const obs of this.obstacles) {
              if (obs.respawnTimer > 0) continue;
              const d = Math.hypot(bot.x - obs.x, bot.y - obs.y);
              if (d < bot.radius + OBSTACLE_SIZE * 2.2) {
                bestX = bot.x + (bot.x - obs.x) * 2.5;
                bestY = bot.y + (bot.y - obs.y) * 2.5;
                break;
              }
            }

            bot.aiTargetX = Math.max(-ARENA_HALF + 250, Math.min(ARENA_HALF - 250, bestX));
            bot.aiTargetY = Math.max(-ARENA_HALF + 250, Math.min(ARENA_HALF - 250, bestY));
            bot.aiSpin = this.rng() < 0.2 && bot.energy > 45 ? (this.rng() < 0.5 ? -1 : 1) : 0;
          }

          if (bot.aiSpin < 0) rotLeft = true;
          if (bot.aiSpin > 0) rotRight = true;

          const res = bot.update(
            dt,
            {
              targetX: bot.aiTargetX,
              targetY: bot.aiTargetY,
              rotLeft,
              rotRight
            },
            ARENA_HALF
          );

          if (res.detachedBlock && this.strayBlocks.length < 480) {
            const d = res.detachedBlock;
            this.spawnStrayBlock(d.wx, d.wy, d.vx, d.vy, d.colorIdx, 0.45);
          }
        }
      }

      // Bot-vs-Player & Bot-vs-Bot Block Combat (Rules 14, 15, 16)
      for (let i = 0; i < activeClusters.length; i++) {
        const a = activeClusters[i];
        if (!a.alive || a.invuln > 0) continue;
        for (let j = i + 1; j < activeClusters.length; j++) {
          const b = activeClusters[j];
          if (!b.alive || b.invuln > 0) continue;
          if (isMultiplayerClient && a.isBot && b.isBot) continue;
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist > a.radius + b.radius) continue;

          this.resolveClusterCollision(a, b, localPlayer, callbacks);
        }
      }

      // Real Multiplayer Player-vs-Player (PvP) Block Combat against net.players (Rules 14, 15, 26)
      if (net && net.players && localPlayer && localPlayer.alive && localPlayer.invuln <= 0) {
        for (const rp of net.players.values()) {
          if (!rp || !rp.s || !rp.s.al || rp.s.iv || !Array.isArray(rp.s.sq)) continue;
          this.resolveRemotePlayerCollision(localPlayer, rp, callbacks, net);
        }
      }

      // Update particles & floating texts
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(0.08, dt);
        p.vy *= Math.pow(0.08, dt);
        p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
      }

      for (let i = this.floatTexts.length - 1; i >= 0; i--) {
        const ft = this.floatTexts[i];
        ft.y -= 36 * dt;
        ft.life -= dt;
        if (ft.life <= 0) this.floatTexts.splice(i, 1);
      }
    }

    // Resolve direct block-vs-block combat between localPlayer and a remote human player in net.players
    resolveRemotePlayerCollision(localPlayer, rp, callbacks, net) {
      const s = rp.s;
      const distCenters = Math.hypot(localPlayer.x - s.x, localPlayer.y - s.y);
      if (distCenters > localPlayer.radius + 450) return;

      const c = Math.cos(s.a || 0);
      const sn = Math.sin(s.a || 0);
      const now = performance.now();

      for (let ia = localPlayer.squares.length - 1; ia >= 0; ia--) {
        const sqA = localPlayer.squares[ia];
        if (!sqA) continue;
        const ba = localPlayer.getSquareWorldBounds(sqA);

        for (let ib = s.sq.length - 1; ib >= 0; ib--) {
          const item = s.sq[ib];
          if (!item) continue;
          const [gx, gy, sizeB, isCoreB, isHeartB] = item;
          const lx = (gx + (sizeB - 1) * 0.5) * UNIT;
          const ly = (gy + (sizeB - 1) * 0.5) * UNIT;
          const bwx = s.x + (lx * c - ly * sn);
          const bwy = s.y + (lx * sn + ly * c);
          const bHalf = (sizeB * UNIT) * 0.5;

          const overlap = (ba.half + bHalf) * 0.88;
          if (Math.abs(ba.wx - bwx) < overlap && Math.abs(ba.wy - bwy) < overlap) {
            const effA = sqA.size + (localPlayer.spinning ? 0.35 : 0);
            const effB = sizeB + (s.sp ? 0.35 : 0);
            const remoteName = s.n || rp.name || "Player";

            if (effA > effB) {
              // Local player's block is larger: shatter remote player's block!
              const hitKey = `${rp.id}:${gx},${gy},${sizeB}`;
              const lastHit = this.pvpHitCooldowns.get(hitKey) || 0;
              if (now - lastHit > 320) {
                this.pvpHitCooldowns.set(hitKey, now);
                const fatal = !!(isCoreB || isHeartB || s.sq.length <= 1);
                const rSkin = window.Skins.getSkin(s.sk || "gem_cyan");
                const rPal = window.Skins.getPalette(rSkin.paletteIndex);
                this.addParticles(bwx, bwy, rPal.top, 14, 240);
                // Optimistically remove shattered square from remote snapshot until next state packet
                s.sq.splice(ib, 1);
                if (fatal) s.al = 0;
                net.send("pvp_hit", {
                  targetId: rp.id,
                  gx,
                  gy,
                  size: sizeB,
                  fatal,
                  attackerName: localPlayer.name,
                  wx: Math.round(bwx),
                  wy: Math.round(bwy)
                });
                if (callbacks.onLocalCombatHit) {
                  callbacks.onLocalCombatHit(true, fatal, remoteName, bwx, bwy);
                }
              }
              return;
            } else if (effB > effA) {
              // Remote player's block is larger: shatter local player's block!
              const sh = localPlayer.shatterSquare(sqA);
              this.scatterDroppedCells(sh.dropped, bwx, bwy);
              const pal = window.Skins.getPalette(localPlayer.getSkinColorIdx());
              this.addParticles(ba.wx, ba.wy, pal.top, 14, 240);
              net.send("pvp_shatter", {
                attackerId: rp.id,
                victimName: localPlayer.name,
                fatal: sh.fatal,
                wx: Math.round(ba.wx),
                wy: Math.round(ba.wy),
                colorIdx: localPlayer.getSkinColorIdx(),
                count: Math.min(16, sh.dropped.length)
              });
              if (callbacks.onLocalCombatHit) {
                callbacks.onLocalCombatHit(false, sh.fatal, remoteName, ba.wx, ba.wy);
              }
              return;
            } else {
              // Equal-size blocks: crisp physical ricochet between both players!
              const pushA = Math.atan2(ba.wy - bwy, ba.wx - bwx);
              localPlayer.vx = Math.cos(pushA) * 230;
              localPlayer.vy = Math.sin(pushA) * 230;
              localPlayer.x += Math.cos(pushA) * 8;
              localPlayer.y += Math.sin(pushA) * 8;
              this.addParticles((ba.wx + bwx) * 0.5, (ba.wy + bwy) * 0.5, "#ffffff", 6, 130);
              const bumpKey = `bump:${rp.id}`;
              if (now - (this.pvpHitCooldowns.get(bumpKey) || 0) > 180) {
                this.pvpHitCooldowns.set(bumpKey, now);
                net.send("pvp_bump", {
                  targetId: rp.id,
                  vx: Math.round(-Math.cos(pushA) * 230),
                  vy: Math.round(-Math.sin(pushA) * 230)
                });
              }
              return;
            }
          }
        }
      }
    }

    resolveClusterCollision(a, b, localPlayer, callbacks) {
      for (let ia = a.squares.length - 1; ia >= 0; ia--) {
        const sqA = a.squares[ia];
        if (!sqA) continue;
        const ba = a.getSquareWorldBounds(sqA);

        for (let ib = b.squares.length - 1; ib >= 0; ib--) {
          const sqB = b.squares[ib];
          if (!sqB) continue;
          const bb = b.getSquareWorldBounds(sqB);

          const overlap = (ba.half + bb.half) * 0.88;
          if (Math.abs(ba.wx - bb.wx) < overlap && Math.abs(ba.wy - bb.wy) < overlap) {
            const effA = sqA.size + (a.spinning ? 0.35 : 0);
            const effB = sqB.size + (b.spinning ? 0.35 : 0);

            if (effA > effB) {
              const sh = b.shatterSquare(sqB);
              this.scatterDroppedCells(sh.dropped, ba.wx, ba.wy);
              const pal = window.Skins.getPalette(window.Skins.getSkin(b.skinId).paletteIndex);
              this.addParticles(bb.wx, bb.wy, pal.top, 14, 240);
              if (!b.alive && b.isBot) b.respawnTimer = 6;
              if (a === localPlayer && callbacks.onLocalCombatHit) {
                callbacks.onLocalCombatHit(true, sh.fatal, b.name, bb.wx, bb.wy);
              } else if (b === localPlayer && callbacks.onLocalCombatHit) {
                callbacks.onLocalCombatHit(false, sh.fatal, a.name, bb.wx, bb.wy);
              }
              return;
            } else if (effB > effA) {
              const sh = a.shatterSquare(sqA);
              this.scatterDroppedCells(sh.dropped, bb.wx, bb.wy);
              const pal = window.Skins.getPalette(window.Skins.getSkin(a.skinId).paletteIndex);
              this.addParticles(ba.wx, ba.wy, pal.top, 14, 240);
              if (!a.alive && a.isBot) a.respawnTimer = 6;
              if (b === localPlayer && callbacks.onLocalCombatHit) {
                callbacks.onLocalCombatHit(true, sh.fatal, a.name, ba.wx, ba.wy);
              } else if (a === localPlayer && callbacks.onLocalCombatHit) {
                callbacks.onLocalCombatHit(false, sh.fatal, b.name, ba.wx, ba.wy);
              }
              return;
            } else {
              const pushA = Math.atan2(ba.wy - bb.wy, ba.wx - bb.wx);
              a.vx = Math.cos(pushA) * 210;
              a.vy = Math.sin(pushA) * 210;
              b.vx = -Math.cos(pushA) * 210;
              b.vy = -Math.sin(pushA) * 210;
              this.addParticles((ba.wx + bb.wx) * 0.5, (ba.wy + bb.wy) * 0.5, "#ffffff", 6, 130);
              return;
            }
          }
        }
      }
    }

    draw(ctx, camera, isDark, localPlayer, remotePlayersMap, leaderId) {
      const vw = camera.width / camera.zoom;
      const vh = camera.height / camera.zoom;
      const left = camera.x - vw * 0.55;
      const right = camera.x + vw * 0.55;
      const top = camera.y - vh * 0.55;
      const bottom = camera.y + vh * 0.55;

      // 1. Void outside arena border
      ctx.fillStyle = isDark ? "#0d0f14" : "#d8dce6";
      ctx.fillRect(left, top, right - left, bottom - top);

      // 2. Arena background with cached repeating diamond grid pattern
      const pattern = getCachedPattern(ctx, isDark);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-ARENA_HALF, -ARENA_HALF, ARENA_HALF * 2, ARENA_HALF * 2);
      ctx.clip();
      ctx.fillStyle = pattern || (isDark ? "#171920" : "#f3f4f7");
      ctx.fillRect(
        Math.max(-ARENA_HALF, left),
        Math.max(-ARENA_HALF, top),
        Math.min(ARENA_HALF, right) - Math.max(-ARENA_HALF, left),
        Math.min(ARENA_HALF, bottom) - Math.max(-ARENA_HALF, top)
      );
      ctx.restore();

      // 3. Draw Perimeter Wall of white/grey obstacle blocks (Rule 17)
      this.drawPerimeterWall(ctx, left, right, top, bottom);

      // 4. Draw Stray 1x1 collectible gem blocks in view
      for (const sb of this.strayBlocks) {
        if (sb.x < left - UNIT || sb.x > right + UNIT || sb.y < top - UNIT || sb.y > bottom + UNIT) continue;
        const pal = window.Skins.getPalette(sb.colorIdx);
        window.Skins.drawGemBlock(ctx, sb.x, sb.y, UNIT * 0.92, pal);
      }

      // 5. Draw Giant Neutral Food Gems (Rule 20)
      for (const fg of this.foodGems) {
        if (fg.respawnTimer > 0) continue;
        const w = fg.size * UNIT;
        if (fg.x < left - w || fg.x > right + w || fg.y < top - w || fg.y > bottom + w) continue;
        const pal = window.Skins.getPalette(fg.colorIdx);
        window.Skins.drawGemBlock(ctx, fg.x, fg.y, w, pal, { sparkle: true });
      }

      // 6. Draw Interior White Obstacle Blocks
      for (const obs of this.obstacles) {
        if (obs.respawnTimer > 0) continue;
        if (obs.x < left - OBSTACLE_SIZE || obs.x > right + OBSTACLE_SIZE || obs.y < top - OBSTACLE_SIZE || obs.y > bottom + OBSTACLE_SIZE) continue;
        const dmg = 1 - obs.hp / obs.maxHp;
        window.Skins.drawObstacleBlock(ctx, obs.x, obs.y, OBSTACLE_SIZE, dmg);
      }

      // 7. Draw AI Bot Clusters
      for (const bot of this.bots) {
        if (!bot.alive) continue;
        if (bot.x < left - bot.radius - 60 || bot.x > right + bot.radius + 60 || bot.y < top - bot.radius - 60 || bot.y > bottom + bot.radius + 60) continue;
        bot.draw(ctx, bot.id === leaderId);
      }

      // 8. Draw Remote Multiplayer Players
      if (remotePlayersMap) {
        for (const rp of remotePlayersMap.values()) {
          if (!rp.s || !rp.s.al || !Array.isArray(rp.s.sq)) continue;
          this.drawRemotePlayer(ctx, rp.s, rp.id === leaderId);
        }
      }

      // 9. Draw Local Player Cluster on top
      if (localPlayer && localPlayer.alive) {
        localPlayer.draw(ctx, localPlayer.id === leaderId);
      }

      // 10. Draw Particles
      for (const p of this.particles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // 11. Draw Floating Pop Texts
      for (const ft of this.floatTexts) {
        const alpha = Math.max(0, ft.life / ft.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = '800 18px "Trebuchet MS", sans-serif';
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.lineWidth = 3.5;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }
    }

    drawRemotePlayer(ctx, s, isLeader) {
      const skin = window.Skins.getSkin(s.sk || "gem_cyan");
      const palette = window.Skins.getPalette(skin.paletteIndex);

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.a || 0);

      if (s.sp) {
        ctx.strokeStyle = "rgba(255, 244, 130, 0.85)";
        ctx.lineWidth = 3;
        for (const item of s.sq) {
          const [gx, gy, size] = item;
          const cx = (gx + (size - 1) * 0.5) * UNIT;
          const cy = (gy + (size - 1) * 0.5) * UNIT;
          const w = size * UNIT;
          ctx.strokeRect(cx - w * 0.5 - 1.5, cy - w * 0.5 - 1.5, w + 3, w + 3);
        }
      }

      let coreSq = s.sq[0];
      for (const item of s.sq) {
        const [gx, gy, size, isCore, isHeart] = item;
        if (isCore) coreSq = item;
        const cx = (gx + (size - 1) * 0.5) * UNIT;
        const cy = (gy + (size - 1) * 0.5) * UNIT;
        const w = size * UNIT;
        window.Skins.drawGemBlock(ctx, cx, cy, w, palette, {
          emblem: skin.emblem,
          isHeart: !!isHeart
        });
      }
      ctx.restore();

      if (coreSq) {
        const [gx, gy, size] = coreSq;
        const lx = (gx + (size - 1) * 0.5) * UNIT;
        const ly = (gy + (size - 1) * 0.5) * UNIT;
        const c = Math.cos(s.a || 0);
        const sn = Math.sin(s.a || 0);
        const wx = s.x + (lx * c - ly * sn);
        const wy = s.y + (lx * sn + ly * c);

        ctx.save();
        const fontSize = Math.max(13, Math.min(24, 11 + size * 2.2));
        ctx.font = `800 ${fontSize}px "Trebuchet MS", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = "rgba(10, 12, 18, 0.92)";
        ctx.fillStyle = "#ffffff";
        const label = isLeader ? `♛ ${s.n || "Player"}` : (s.n || "Player");
        ctx.strokeText(label, wx, wy);
        ctx.fillText(label, wx, wy);
        ctx.restore();
      }
    }

    drawPerimeterWall(ctx, left, right, top, bottom) {
      const step = OBSTACLE_SIZE;
      const b = ARENA_HALF;

      if (top < -b + step) {
        const startX = Math.max(-b, Math.floor(left / step) * step);
        const endX = Math.min(b, Math.ceil(right / step) * step);
        for (let x = startX; x <= endX; x += step) {
          window.Skins.drawObstacleBlock(ctx, x, -b, step, 0);
        }
      }
      if (bottom > b - step) {
        const startX = Math.max(-b, Math.floor(left / step) * step);
        const endX = Math.min(b, Math.ceil(right / step) * step);
        for (let x = startX; x <= endX; x += step) {
          window.Skins.drawObstacleBlock(ctx, x, b, step, 0);
        }
      }
      if (left < -b + step) {
        const startY = Math.max(-b + step, Math.floor(top / step) * step);
        const endY = Math.min(b - step, Math.ceil(bottom / step) * step);
        for (let y = startY; y <= endY; y += step) {
          window.Skins.drawObstacleBlock(ctx, -b, y, step, 0);
        }
      }
      if (right > b - step) {
        const startY = Math.max(-b + step, Math.floor(top / step) * step);
        const endY = Math.min(b - step, Math.ceil(bottom / step) * step);
        for (let y = startY; y <= endY; y += step) {
          window.Skins.drawObstacleBlock(ctx, b, y, step, 0);
        }
      }
    }
  }

  window.GameWorld = {
    ARENA_HALF,
    OBSTACLE_SIZE,
    World
  };
})();
