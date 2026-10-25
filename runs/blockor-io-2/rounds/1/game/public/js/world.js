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
    { name: "MasterOv", skinId: "gem_cyan", starter: 3 },
    { name: "Kwebbelkop", skinId: "kops_flame", starter: 4 },
    { name: "Jelly", skinId: "green_jelly", starter: 3 },
    { name: "AzzyLand", skinId: "gem_red", starter: 2 },
    { name: "M7mdShaRK", skinId: "shark_diamond", starter: 3 },
    { name: "KingMuqeem", skinId: "king_crown", starter: 2 },
    { name: "Slogoman", skinId: "gem_orange", starter: 2 },
    { name: "ZephPlayz", skinId: "gem_purple", starter: 2 },
    { name: "FaZe_Mojo", skinId: "gem_magenta", starter: 1 },
    { name: "PerolaPro", skinId: "holiday_bear", starter: 3 },
    { name: "Pop_SK", skinId: "gem_yellow", starter: 1 }
  ];

  // Offscreen pattern tile cache for crisp 60fps diamond grid rendering
  let lightTile = null;
  let darkTile = null;

  function buildDiamondTile(isDark) {
    const size = 88; // Repeat period of rotated diamond pattern
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const g = c.getContext("2d");

    g.fillStyle = isDark ? "#171920" : "#f3f4f7";
    g.fillRect(0, 0, size, size);

    const half = size * 0.5;
    // Subtle checkerboard diamond fill in dark mode
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

      this.initWorld();
    }

    initWorld() {
      this.strayBlocks = [];
      this.obstacles = [];
      this.foodGems = [];
      this.bots = [];

      // 1. Scattered interior white obstacle blocks (Rules 17, 18, 19)
      const obsCount = 46;
      for (let i = 0; i < obsCount; i++) {
        const angle = this.rng() * Math.PI * 2;
        const dist = 280 + this.rng() * (ARENA_HALF - 420);
        const ox = Math.round((Math.cos(angle) * dist) / OBSTACLE_SIZE) * OBSTACLE_SIZE;
        const oy = Math.round((Math.sin(angle) * dist) / OBSTACLE_SIZE) * OBSTACLE_SIZE;
        this.obstacles.push({
          id: this.nextEntityId++,
          x: ox,
          y: oy,
          hp: 3,
          maxHp: 3,
          respawnTimer: 0
        });
      }

      // 2. Large neutral glossy Food Gems (Rule 20 - Video D pink & green 4x4/5x5 gems)
      const foodGemCount = 18;
      for (let i = 0; i < foodGemCount; i++) {
        this.spawnFoodGem();
      }

      // 3. Abundant stray 1x1 gem blocks across the arena (Rule 2)
      const initialStrays = 520;
      for (let i = 0; i < initialStrays; i++) {
        this.spawnStrayBlock();
      }

      // 4. Populate initial starter ring near origin (0,0) so the player can immediately collect & merge in the first 5 seconds!
      const nearColors = [0, 1, 2, 3, 4, 5];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const r = 95 + (i % 3) * 42;
        this.strayBlocks.push({
          id: this.nextEntityId++,
          x: Math.cos(a) * r,
          y: Math.sin(a) * r,
          vx: 0,
          vy: 0,
          colorIdx: nearColors[i % nearColors.length],
          angle: 0,
          cooldown: 0
        });
      }

      // 5. Spawn active AI rival block clusters
      for (let i = 0; i < BOT_PROFILES.length; i++) {
        const prof = BOT_PROFILES[i];
        const a = (i / BOT_PROFILES.length) * Math.PI * 2 + 0.35;
        const dist = 480 + (i % 3) * 440;
        const bot = new window.Cluster.BlockCluster({
          id: `bot_${i + 1}`,
          name: prof.name,
          skinId: prof.skinId,
          isBot: true,
          x: Math.cos(a) * dist,
          y: Math.sin(a) * dist,
          starterSize: prof.starter
        });
        // Add a few extra attached 1x1 blocks so bots have interesting composite shapes
        const extra = Math.floor(this.rng() * 6);
        for (let e = 0; e < extra; e++) {
          bot.attachAtLocal((this.rng() - 0.5) * 3, (this.rng() - 0.5) * 3, i % 6);
        }
        bot.aiTargetX = bot.x;
        bot.aiTargetY = bot.y;
        bot.aiTimer = 0;
        bot.respawnTimer = 0;
        this.bots.push(bot);
      }
    }

    spawnStrayBlock(x, y, vx = 0, vy = 0, colorIdx = null, cooldown = 0) {
      const margin = 120;
      const sx = typeof x === "number" ? x : (this.rng() * 2 - 1) * (ARENA_HALF - margin);
      const sy = typeof y === "number" ? y : (this.rng() * 2 - 1) * (ARENA_HALF - margin);
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
      const margin = 260;
      // Color index 1 (magenta/pink) or 4 (bright green) as seen in Video D
      const colorIdx = this.rng() < 0.55 ? 1 : 4;
      const size = this.rng() < 0.65 ? 3 : 4; // 3x3 or 4x4 gem
      this.foodGems.push({
        id: this.nextEntityId++,
        x: (this.rng() * 2 - 1) * (ARENA_HALF - margin),
        y: (this.rng() * 2 - 1) * (ARENA_HALF - margin),
        vx: 0,
        vy: 0,
        size,
        colorIdx,
        respawnTimer: 0
      });
    }

    addParticles(x, y, color, count = 10, speed = 180) {
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
      this.floatTexts.push({
        x,
        y,
        text,
        color,
        life: 0.95,
        maxLife: 0.95
      });
    }

    // Scatter a list of dropped 1x1 cells into collectible blocks on the map
    scatterDroppedCells(dropped, originX, originY) {
      const cap = Math.min(dropped.length, 48); // Prevent lag spikes when huge blocks shatter
      for (let i = 0; i < cap; i++) {
        const d = dropped[i];
        const a = Math.atan2(d.wy - originY, d.wx - originX) + (Math.random() - 0.5) * 0.8;
        const spd = 90 + Math.random() * 190;
        this.spawnStrayBlock(
          d.wx,
          d.wy,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          d.colorIdx,
          0.35
        );
      }
    }

    update(dt, localPlayer, callbacks = {}) {
      // Keep stray block count healthy
      while (this.strayBlocks.length < 480) {
        this.spawnStrayBlock();
      }

      // Update stray blocks (velocity damping & magnetic pull toward nearby clusters)
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
        const lim = ARENA_HALF - UNIT;
        if (sb.x < -lim) { sb.x = -lim; sb.vx = Math.abs(sb.vx); }
        if (sb.x > lim) { sb.x = lim; sb.vx = -Math.abs(sb.vx); }
        if (sb.y < -lim) { sb.y = -lim; sb.vy = Math.abs(sb.vy); }
        if (sb.y > lim) { sb.y = lim; sb.vy = -Math.abs(sb.vy); }

        if (sb.cooldown > 0) continue;

        // Check attachment against active clusters
        let attached = false;
        for (const cl of activeClusters) {
          const dx = sb.x - cl.x;
          const dy = sb.y - cl.y;
          const maxCheck = cl.radius + UNIT * 2.2;
          if (dx * dx + dy * dy > maxCheck * maxCheck) continue;

          const loc = cl.worldToLocal(sb.x, sb.y);
          // Gentle magnetic attraction when very close to a cell
          const snap = cl.findSnapCell(loc.lx, loc.ly);
          if (snap) {
            const wSnap = cl.localToWorld(snap.gx, snap.gy);
            const distSnap = Math.hypot(sb.x - wSnap.wx, sb.y - wSnap.wy);
            if (distSnap < UNIT * 1.18) {
              const res = cl.attachAtLocal(loc.lx, loc.ly, sb.colorIdx);
              if (res) {
                this.strayBlocks.splice(i, 1);
                attached = true;
                if (cl === localPlayer && callbacks.onLocalPickup) {
                  callbacks.onLocalPickup(res, wSnap.wx, wSnap.wy, sb.colorIdx);
                }
                break;
              }
            } else if (distSnap < UNIT * 2.1) {
              // Magnetic pull toward snap slot
              sb.vx += ((wSnap.wx - sb.x) / distSnap) * 520 * dt;
              sb.vy += ((wSnap.wy - sb.y) / distSnap) * 520 * dt;
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
          if (!cl.alive || cl.invuln > 0) continue;
          const distCenter = Math.hypot(cl.x - obs.x, cl.y - obs.y);
          if (distCenter > cl.radius + OBSTACLE_SIZE) continue;

          // Check each merged square of the cluster
          for (let sIdx = cl.squares.length - 1; sIdx >= 0; sIdx--) {
            const sq = cl.squares[sIdx];
            const b = cl.getSquareWorldBounds(sq);
            const hitDist = b.half + OBSTACLE_SIZE * 0.44;
            if (Math.abs(b.wx - obs.x) < hitDist && Math.abs(b.wy - obs.y) < hitDist) {
              // If player only has a single 1x1 block, bounce off obstacle forgivingly instead of instant frustrating death
              if (cl.cells.size <= 2 && sq.isCore) {
                const pushA = Math.atan2(cl.y - obs.y, cl.x - obs.x);
                cl.vx = Math.cos(pushA) * 260;
                cl.vy = Math.sin(pushA) * 260;
                cl.x += Math.cos(pushA) * 10;
                cl.y += Math.sin(pushA) * 10;
                break;
              }

              const sh = cl.shatterSquare(sq);
              this.scatterDroppedCells(sh.dropped, obs.x, obs.y);
              this.addParticles(b.wx, b.wy, "#ffffff", 14, 240);

              obs.hp -= 1;
              if (obs.hp <= 0) {
                obs.respawnTimer = 18;
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
            const margin = 260;
            fg.x = (this.rng() * 2 - 1) * (ARENA_HALF - margin);
            fg.y = (this.rng() * 2 - 1) * (ARENA_HALF - margin);
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
          if (!cl.alive) continue;
          if (Math.hypot(cl.x - fg.x, cl.y - fg.y) > cl.radius + fgSide) continue;

          for (const sq of cl.squares) {
            const b = cl.getSquareWorldBounds(sq);
            const overlap = b.half + fgHalf * 0.88;
            if (Math.abs(b.wx - fg.x) < overlap && Math.abs(b.wy - fg.y) < overlap) {
              // If player's hitting square is at least size 2 (or total score >= 6), shatter the food gem into a feast of 1x1s!
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
                this.addParticles(fg.x, fg.y, pal.top, 20, 260);
                fg.respawnTimer = 14;
                // Slight tilt/recoil on impact as seen in Video D 02:53
                cl.angle += (Math.random() - 0.5) * 0.35;
                if (cl === localPlayer && callbacks.onLocalShatterFoodGem) {
                  callbacks.onLocalShatterFoodGem(fg.x, fg.y, count);
                }
              } else {
                // Too small: bump the food gem slightly without breaking it (Video D 01:29)
                const pushA = Math.atan2(fg.y - cl.y, fg.x - cl.x);
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

      // Update AI Bots & AI behavior
      for (const bot of this.bots) {
        if (!bot.alive) {
          bot.respawnTimer -= dt;
          if (bot.respawnTimer <= 0) {
            const a = this.rng() * Math.PI * 2;
            const d = 600 + this.rng() * (ARENA_HALF - 800);
            bot.x = Math.cos(a) * d;
            bot.y = Math.sin(a) * d;
            bot.vx = 0;
            bot.vy = 0;
            bot.alive = true;
            bot.invuln = 2.0;
            bot.initStarter(1 + Math.floor(this.rng() * 2));
          }
          continue;
        }

        bot.aiTimer -= dt;
        let rotLeft = false;
        let rotRight = false;

        if (bot.aiTimer <= 0) {
          bot.aiTimer = 0.65 + this.rng() * 0.9;
          // Look for nearest food gem, smaller player, or cluster of stray blocks
          let bestX = bot.x + (this.rng() - 0.5) * 700;
          let bestY = bot.y + (this.rng() - 0.5) * 700;

          // Avoid obstacles
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
          bot.aiSpin = this.rng() < 0.22 && bot.energy > 45 ? (this.rng() < 0.5 ? -1 : 1) : 0;
        }

        if (bot.aiSpin < 0) rotLeft = true;
        if (bot.aiSpin > 0) rotRight = true;

        const res = bot.update(dt, {
          targetX: bot.aiTargetX,
          targetY: bot.aiTargetY,
          rotLeft,
          rotRight
        }, ARENA_HALF);

        if (res.detachedBlock) {
          const d = res.detachedBlock;
          this.spawnStrayBlock(d.wx, d.wy, d.vx, d.vy, d.colorIdx, 0.45);
        }
      }

      // Player-vs-Player / Bot-vs-Player Block Combat (Rules 14, 15, 16)
      for (let i = 0; i < activeClusters.length; i++) {
        const a = activeClusters[i];
        if (!a.alive || a.invuln > 0) continue;
        for (let j = i + 1; j < activeClusters.length; j++) {
          const b = activeClusters[j];
          if (!b.alive || b.invuln > 0) continue;
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist > a.radius + b.radius) continue;

          this.resolveClusterCollision(a, b, localPlayer, callbacks);
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
            // Larger square destroys smaller square! Tie broken by total cluster score if spinning
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
              // Equal size blocks bounce off each other with a crisp clack
              const pushA = Math.atan2(a.y - b.y, a.x - b.x);
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
      if (!lightTile) lightTile = buildDiamondTile(false);
      if (!darkTile) darkTile = buildDiamondTile(true);

      const vw = camera.width / camera.zoom;
      const vh = camera.height / camera.zoom;
      const left = camera.x - vw * 0.55;
      const right = camera.x + vw * 0.55;
      const top = camera.y - vh * 0.55;
      const bottom = camera.y + vh * 0.55;

      // 1. Void outside arena border
      ctx.fillStyle = isDark ? "#0d0f14" : "#d8dce6";
      ctx.fillRect(left, top, right - left, bottom - top);

      // 2. Arena background with repeating diamond grid pattern
      const tile = isDark ? darkTile : lightTile;
      const pattern = ctx.createPattern(tile, "repeat");
      ctx.save();
      ctx.beginPath();
      ctx.rect(-ARENA_HALF, -ARENA_HALF, ARENA_HALF * 2, ARENA_HALF * 2);
      ctx.clip();
      ctx.fillStyle = pattern;
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

      // Top & Bottom horizontal walls if visible
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
      // Left & Right vertical walls if visible
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
