// Player / Bot Block Cluster with local rotating grid & maximal NxN square merging
(function () {
  const UNIT = 28; // World pixel size of a 1x1 block

  function keyOf(gx, gy) {
    return `${gx},${gy}`;
  }

  function parseKey(k) {
    const idx = k.indexOf(",");
    return [Number(k.slice(0, idx)), Number(k.slice(idx + 1))];
  }

  class BlockCluster {
    constructor(opts = {}) {
      this.id = opts.id || "local";
      this.name = opts.name || "Player";
      this.skinId = opts.skinId || "gem_cyan";
      this.isBot = !!opts.isBot;
      this.heartMode = !!opts.heartMode;

      this.x = opts.x || 0;
      this.y = opts.y || 0;
      this.vx = 0;
      this.vy = 0;
      this.angle = opts.angle || 0;
      this.angVel = 0;

      // Energy bar (0..100) for rotation boost & W-shooting
      this.energy = 100;
      this.spinning = false;
      this.spinDir = 0;
      this.spinDetachTimer = 0;

      // Occupied unit cells on the local grid: Map<"gx,gy", { colorIdx, addedAt }>
      // Cell (0,0) is always the anchor core / heart seed
      this.cells = new Map();
      this.squares = []; // Merged squares: [{ gx, gy, size, isCore, isHeart, flash }]
      this.maxSquareSize = 1;
      this.radius = UNIT * 0.8;
      this.alive = true;
      this.invuln = 2.0; // Brief spawn protection

      // Track recent merge animations: Map<"gx,gy,size", flashAlpha>
      this.mergeFlashes = new Map();

      this.initStarter(opts.starterSize || 1);
    }

    initStarter(size = 1) {
      this.cells.clear();
      const skin = window.Skins.getSkin(this.skinId);
      const half = Math.floor(size / 2);
      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          const gx = dx - half;
          const gy = dy - half;
          this.cells.set(keyOf(gx, gy), { colorIdx: skin.paletteIndex, addedAt: performance.now() });
        }
      }
      if (!this.cells.has("0,0")) {
        this.cells.set("0,0", { colorIdx: skin.paletteIndex, addedAt: performance.now() });
      }
      this.rebuildSquares(true);
    }

    get score() {
      return this.cells.size;
    }

    // Transform world point (wx, wy) to local grid float coordinates (lx, ly) where 1 unit = 1 cell
    worldToLocal(wx, wy) {
      const dx = wx - this.x;
      const dy = wy - this.y;
      const c = Math.cos(-this.angle);
      const s = Math.sin(-this.angle);
      return {
        lx: (dx * c - dy * s) / UNIT,
        ly: (dx * s + dy * c) / UNIT
      };
    }

    // Transform local grid center (gx, gy) to world coordinates (wx, wy)
    localToWorld(gx, gy) {
      const lx = gx * UNIT;
      const ly = gy * UNIT;
      const c = Math.cos(this.angle);
      const s = Math.sin(this.angle);
      return {
        wx: this.x + (lx * c - ly * s),
        wy: this.y + (lx * s + ly * c)
      };
    }

    // If heartMode is enabled, ensure the 2x2 Heart Block cells around (0,0) exist
    ensureHeartBlock() {
      if (!this.heartMode) return;
      const skin = window.Skins.getSkin(this.skinId);
      const coords = [[0, 0], [1, 0], [0, 1], [1, 1]];
      for (const [gx, gy] of coords) {
        const k = keyOf(gx, gy);
        if (!this.cells.has(k)) {
          this.cells.set(k, { colorIdx: skin.paletteIndex, addedAt: performance.now() });
        }
      }
    }

    // Recompute maximal NxN square decomposition from `this.cells`
    rebuildSquares(silent = false) {
      if (this.cells.size === 0) {
        this.squares = [];
        this.maxSquareSize = 0;
        return { maxMergedNew: 0 };
      }

      const prevSet = new Set(this.squares.map((sq) => `${sq.gx},${sq.gy},${sq.size}`));
      const unassigned = new Set(this.cells.keys());
      const squares = [];

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const k of unassigned) {
        const [gx, gy] = parseKey(k);
        if (gx < minX) minX = gx;
        if (gx > maxX) maxX = gx;
        if (gy < minY) minY = gy;
        if (gy > maxY) maxY = gy;
      }

      // Rule 5: In Heart Block mode, if the 2x2 Heart cells at (0,0)..(1,1) are present, lock them first as the dedicated 2x2 Heart Block
      if (
        this.heartMode &&
        unassigned.has("0,0") &&
        unassigned.has("1,0") &&
        unassigned.has("0,1") &&
        unassigned.has("1,1")
      ) {
        unassigned.delete("0,0");
        unassigned.delete("1,0");
        unassigned.delete("0,1");
        unassigned.delete("1,1");
        squares.push({
          gx: 0,
          gy: 0,
          size: 2,
          containsOrigin: true,
          isCore: true,
          isHeart: true
        });
      }

      // If heartMode is enabled and a 2x2 around (0,0) is available, lock it as the 2x2 Heart Block
      // Otherwise greedily pack the largest possible NxN squares first
      while (unassigned.size > 0) {
        let bestSq = null;

        for (let gy = minY; gy <= maxY; gy++) {
          for (let gx = minX; gx <= maxX; gx++) {
            if (!unassigned.has(keyOf(gx, gy))) continue;

            // Find maximal square starting at top-left (gx, gy)
            let maxN = 1;
            const limit = Math.min(maxX - gx + 1, maxY - gy + 1, 14);
            while (maxN < limit) {
              const nextN = maxN + 1;
              let ok = true;
              for (let dy = 0; dy < nextN && ok; dy++) {
                for (let dx = 0; dx < nextN; dx++) {
                  if (!unassigned.has(keyOf(gx + dx, gy + dy))) {
                    ok = false;
                    break;
                  }
                }
              }
              if (ok) maxN = nextN;
              else break;
            }

            // Prefer larger squares; tie-break by proximity to (0,0) so core stays consolidated
            const centerDist = Math.hypot(gx + (maxN - 1) * 0.5, gy + (maxN - 1) * 0.5);
            const containsOrigin = gx <= 0 && gx + maxN > 0 && gy <= 0 && gy + maxN > 0;
            const score = maxN * 1000 + (containsOrigin ? 50 : 0) - centerDist;

            if (!bestSq || score > bestSq.score) {
              bestSq = { gx, gy, size: maxN, score, containsOrigin };
            }
          }
        }

        if (!bestSq) break;

        for (let dy = 0; dy < bestSq.size; dy++) {
          for (let dx = 0; dx < bestSq.size; dx++) {
            unassigned.delete(keyOf(bestSq.gx + dx, bestSq.gy + dy));
          }
        }

        squares.push({
          gx: bestSq.gx,
          gy: bestSq.gy,
          size: bestSq.size,
          containsOrigin: bestSq.containsOrigin,
          isCore: false,
          isHeart: false
        });
      }

      // Identify the Core / Main block:
      // In classic mode, the largest merged square (tie-broken by containing (0,0)) is the main named block
      // In Heart mode, the square containing (0,0) is the Heart Block
      let coreIdx = 0;
      let maxSz = 1;
      for (let i = 0; i < squares.length; i++) {
        if (squares[i].size > maxSz) maxSz = squares[i].size;
      }

      if (this.heartMode) {
        const heartIdx = squares.findIndex((s) => s.gx === 0 && s.gy === 0 && s.size === 2);
        const originIdx = heartIdx >= 0 ? heartIdx : squares.findIndex((s) => s.containsOrigin);
        coreIdx = originIdx >= 0 ? originIdx : 0;
      } else {
        let bestCoreScore = -Infinity;
        for (let i = 0; i < squares.length; i++) {
          const s = squares[i];
          const sc = s.size * 100 + (s.containsOrigin ? 25 : 0) - Math.hypot(s.gx, s.gy);
          if (sc > bestCoreScore) {
            bestCoreScore = sc;
            coreIdx = i;
          }
        }
      }

      let maxMergedNew = 0;
      for (let i = 0; i < squares.length; i++) {
        const sq = squares[i];
        sq.isCore = i === coreIdx;
        sq.isHeart = i === coreIdx && this.heartMode;
        const sig = `${sq.gx},${sq.gy},${sq.size}`;
        if (!silent && sq.size >= 2 && !prevSet.has(sig)) {
          this.mergeFlashes.set(sig, 1.0);
          if (sq.size > maxMergedNew) maxMergedNew = sq.size;
        }
      }

      this.squares = squares;
      this.maxSquareSize = maxSz;

      // Update bounding radius in world pixels
      let maxR = UNIT * 0.75;
      for (const k of this.cells.keys()) {
        const [gx, gy] = parseKey(k);
        const d = (Math.hypot(gx, gy) + 0.75) * UNIT;
        if (d > maxR) maxR = d;
      }
      this.radius = maxR;

      return { maxMergedNew };
    }

    // Find the nearest empty orthogonal neighbor cell to local coordinates (lx, ly)
    findSnapCell(lx, ly) {
      let best = null;
      let bestDist = Infinity;
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ];
      for (const k of this.cells.keys()) {
        const [gx, gy] = parseKey(k);
        // Must be within touch range of an existing cell
        const distToExisting = Math.hypot(lx - gx, ly - gy);
        if (distToExisting > 2.35) continue;

        for (const [dx, dy] of dirs) {
          const nx = gx + dx;
          const ny = gy + dy;
          const nk = keyOf(nx, ny);
          if (this.cells.has(nk)) continue;
          const d = Math.hypot(lx - nx, ly - ny) + Math.hypot(nx, ny) * 0.04;
          if (d < bestDist) {
            bestDist = d;
            best = { gx: nx, gy: ny, key: nk };
          }
        }
      }
      return best;
    }

    // Attach a 1x1 block at local position (lx, ly)
    attachAtLocal(lx, ly, colorIdx = 0) {
      const snap = this.findSnapCell(lx, ly);
      if (!snap) return null;
      this.cells.set(snap.key, { colorIdx, addedAt: performance.now() });
      // Ensure connectivity and rebuild squares
      const res = this.rebuildSquares(false);
      // Small energy bonus on pickup/merge
      this.energy = Math.min(100, this.energy + (res.maxMergedNew >= 2 ? 6 : 1.5));
      return { gx: snap.gx, gy: snap.gy, maxMergedNew: res.maxMergedNew };
    }

    // Remove any cells disconnected from the core block so floating islands don't remain
    pruneDisconnected() {
      if (this.cells.size <= 1) return [];
      // Seed BFS from core square's cells (or 0,0)
      let startKey = this.cells.has("0,0") ? "0,0" : this.cells.keys().next().value;
      if (this.squares.length > 0) {
        const coreSq = this.squares.find((s) => s.isCore) || this.squares[0];
        const ck = keyOf(coreSq.gx, coreSq.gy);
        if (this.cells.has(ck)) startKey = ck;
      }

      const visited = new Set([startKey]);
      const queue = [parseKey(startKey)];
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

      while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        for (const [dx, dy] of dirs) {
          const nk = keyOf(cx + dx, cy + dy);
          if (this.cells.has(nk) && !visited.has(nk)) {
            visited.add(nk);
            queue.push([cx + dx, cy + dy]);
          }
        }
      }

      const detached = [];
      for (const [k, val] of this.cells.entries()) {
        if (!visited.has(k)) {
          const [gx, gy] = parseKey(k);
          const w = this.localToWorld(gx, gy);
          detached.push({ wx: w.wx, wy: w.wy, colorIdx: val.colorIdx });
          this.cells.delete(k);
        }
      }
      return detached;
    }

    // Eject a single 1x1 block from the outer edge facing world target (tx, ty)
    ejectToward(tx, ty) {
      if (this.cells.size <= 1 || this.energy < 4) return null;
      const dirAngle = Math.atan2(ty - this.y, tx - this.x);
      const localDirX = Math.cos(dirAngle - this.angle);
      const localDirY = Math.sin(dirAngle - this.angle);

      // Find the outermost cell in the direction of the cursor (excluding the last remaining core cell)
      let bestKey = null;
      let bestScore = -Infinity;
      for (const k of this.cells.keys()) {
        if (k === "0,0" && this.cells.size === 1) continue;
        const [gx, gy] = parseKey(k);
        // Prefer outer perimeter cells aligned with cursor direction
        const dot = gx * localDirX + gy * localDirY;
        const dist = Math.hypot(gx, gy);
        const score = dot * 2.0 + dist * 0.8 + (k === "0,0" ? -100 : 0);
        if (score > bestScore) {
          bestScore = score;
          bestKey = k;
        }
      }

      if (!bestKey) return null;
      const cellData = this.cells.get(bestKey);
      const [gx, gy] = parseKey(bestKey);
      this.cells.delete(bestKey);

      // Keep at least 1 cell at (0,0) if needed
      const orphaned = this.pruneDisconnected();
      this.rebuildSquares(true);
      this.energy = Math.max(0, this.energy - 5);

      const w = this.localToWorld(gx, gy);
      return {
        wx: w.wx + Math.cos(dirAngle) * UNIT * 0.85,
        wy: w.wy + Math.sin(dirAngle) * UNIT * 0.85,
        vx: Math.cos(dirAngle) * 460 + this.vx * 0.35,
        vy: Math.sin(dirAngle) * 460 + this.vy * 0.35,
        colorIdx: cellData ? cellData.colorIdx : 0,
        orphaned
      };
    }

    // Detach 1 unmerged outer 1x1 block while high-speed spinning (Rule 9)
    detachOuterUnmerged() {
      if (this.cells.size <= 4) return null;
      const unmerged = this.squares.filter((sq) => sq.size === 1 && !sq.isCore);
      if (unmerged.length === 0) return null;
      // Pick the furthest 1x1 square from origin
      unmerged.sort((a, b) => Math.hypot(b.gx, b.gy) - Math.hypot(a.gx, a.gy));
      const target = unmerged[0];
      const k = keyOf(target.gx, target.gy);
      const cellData = this.cells.get(k);
      this.cells.delete(k);
      this.pruneDisconnected();
      this.rebuildSquares(true);

      const w = this.localToWorld(target.gx, target.gy);
      const outAngle = Math.atan2(w.wy - this.y, w.wx - this.x) + this.spinDir * 0.6;
      return {
        wx: w.wx,
        wy: w.wy,
        vx: Math.cos(outAngle) * 260,
        vy: Math.sin(outAngle) * 260,
        colorIdx: cellData ? cellData.colorIdx : 0
      };
    }

    // Destroy a specific merged square `sq` (from obstacle or larger enemy block impact)
    shatterSquare(sq) {
      const dropped = [];
      for (let dy = 0; dy < sq.size; dy++) {
        for (let dx = 0; dx < sq.size; dx++) {
          const gx = sq.gx + dx;
          const gy = sq.gy + dy;
          const k = keyOf(gx, gy);
          if (this.cells.has(k)) {
            const val = this.cells.get(k);
            const w = this.localToWorld(gx, gy);
            dropped.push({ wx: w.wx, wy: w.wy, colorIdx: val.colorIdx });
            this.cells.delete(k);
          }
        }
      }

      // If the core / heart square was shattered, the entire player dies and shatters! (Rules 15, 16, 18)
      if (sq.isCore || sq.isHeart || this.cells.size === 0) {
        for (const [k, val] of this.cells.entries()) {
          const [gx, gy] = parseKey(k);
          const w = this.localToWorld(gx, gy);
          dropped.push({ wx: w.wx, wy: w.wy, colorIdx: val.colorIdx });
        }
        this.cells.clear();
        this.squares = [];
        this.alive = false;
        return { fatal: true, dropped };
      }

      const orphaned = this.pruneDisconnected();
      for (const o of orphaned) dropped.push(o);
      this.rebuildSquares(true);
      return { fatal: false, dropped };
    }

    // World center and radius of a merged square `sq`
    getSquareWorldBounds(sq) {
      const centerGx = sq.gx + (sq.size - 1) * 0.5;
      const centerGy = sq.gy + (sq.size - 1) * 0.5;
      const w = this.localToWorld(centerGx, centerGy);
      const side = sq.size * UNIT;
      return {
        wx: w.wx,
        wy: w.wy,
        side,
        half: side * 0.5,
        radius: side * 0.56
      };
    }

    // Max movement speed decreases smoothly as largest block & total mass grow (Rule 12)
    getMaxSpeed() {
      const massPenalty = Math.pow(Math.max(1, this.score), 0.19);
      const sizePenalty = 1 + (this.maxSquareSize - 1) * 0.065;
      const base = 315 / (massPenalty * 0.68 + sizePenalty * 0.32);
      const boost = this.spinning ? 1.34 : 1.0;
      return Math.max(115, base) * boost;
    }

    update(dt, inputState, arenaHalf) {
      if (!this.alive) return { detachedBlock: null };
      if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);

      // Decay merge flashes
      for (const [sig, val] of this.mergeFlashes.entries()) {
        const next = val - dt * 2.8;
        if (next <= 0) this.mergeFlashes.delete(sig);
        else this.mergeFlashes.set(sig, next);
      }

      // Rotation via A / D keys (Rules 7, 8, 9)
      let rotDir = 0;
      if (inputState && inputState.rotLeft) rotDir -= 1;
      if (inputState && inputState.rotRight) rotDir += 1;

      let detachedBlock = null;
      if (rotDir !== 0 && this.energy > 1.5) {
        this.spinning = true;
        this.spinDir = rotDir;
        const rotSpeed = Math.max(1.85, 3.6 - this.maxSquareSize * 0.18);
        this.angVel = rotDir * rotSpeed;
        this.energy = Math.max(0, this.energy - 26 * dt);

        // Detach loose outer 1x1 blocks occasionally during sustained high-speed spin (Rule 9)
        this.spinDetachTimer += dt;
        if (this.spinDetachTimer > 0.55 && this.cells.size > 10) {
          this.spinDetachTimer = 0;
          detachedBlock = this.detachOuterUnmerged();
        }
      } else {
        this.spinning = false;
        this.spinDir = 0;
        this.spinDetachTimer = 0;
        this.angVel *= Math.pow(0.08, dt);
        this.energy = Math.min(100, this.energy + 16 * dt);
      }

      this.angle += this.angVel * dt;

      // Continuous movement toward cursor target (Rule 6)
      if (inputState && typeof inputState.targetX === "number" && typeof inputState.targetY === "number") {
        const dx = inputState.targetX - this.x;
        const dy = inputState.targetY - this.y;
        const dist = Math.hypot(dx, dy);
        const maxSpd = this.getMaxSpeed();
        // Smooth deadzone right on top of cursor so block doesn't jitter
        const throttle = Math.min(1, dist / 48);
        const desiredVx = dist > 2 ? (dx / dist) * maxSpd * throttle : 0;
        const desiredVy = dist > 2 ? (dy / dist) * maxSpd * throttle : 0;
        const accel = 9.5;
        this.vx += (desiredVx - this.vx) * Math.min(1, accel * dt);
        this.vy += (desiredVy - this.vy) * Math.min(1, accel * dt);
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Keep inside arena bounds
      const margin = Math.max(UNIT, this.radius * 0.55);
      const limit = arenaHalf - margin;
      if (this.x < -limit) { this.x = -limit; this.vx = Math.max(0, this.vx); }
      if (this.x > limit) { this.x = limit; this.vx = Math.min(0, this.vx); }
      if (this.y < -limit) { this.y = -limit; this.vy = Math.max(0, this.vy); }
      if (this.y > limit) { this.y = limit; this.vy = Math.min(0, this.vy); }

      return { detachedBlock };
    }

    draw(ctx, isLeader = false) {
      if (!this.alive || this.squares.length === 0) return;
      const skin = window.Skins.getSkin(this.skinId);
      const palette = window.Skins.getPalette(skin.paletteIndex);

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      // Golden/yellow spin boost aura (Video D 03:23)
      if (this.spinning) {
        ctx.save();
        ctx.shadowColor = "#ffe247";
        ctx.shadowBlur = 22;
        ctx.strokeStyle = "rgba(255, 228, 77, 0.72)";
        ctx.lineWidth = 4;
        for (const sq of this.squares) {
          const cx = (sq.gx + (sq.size - 1) * 0.5) * UNIT;
          const cy = (sq.gy + (sq.size - 1) * 0.5) * UNIT;
          const w = sq.size * UNIT;
          ctx.strokeRect(cx - w * 0.5 - 2, cy - w * 0.5 - 2, w + 4, w + 4);
        }
        ctx.restore();
      }

      // Spawn protection pulse
      if (this.invuln > 0) {
        ctx.globalAlpha = 0.72 + Math.sin(performance.now() * 0.018) * 0.22;
      }

      // Draw each merged square (smaller first, core on top)
      for (const sq of this.squares) {
        const cx = (sq.gx + (sq.size - 1) * 0.5) * UNIT;
        const cy = (sq.gy + (sq.size - 1) * 0.5) * UNIT;
        const w = sq.size * UNIT;
        const sig = `${sq.gx},${sq.gy},${sq.size}`;
        const flash = this.mergeFlashes.get(sig) || 0;

        window.Skins.drawGemBlock(ctx, cx, cy, w, palette, {
          emblem: skin.emblem,
          isHeart: sq.isHeart,
          flash
        });
      }

      ctx.restore();

      // Draw player nickname horizontally over the Core / Heart block (Rule 1)
      const coreSq = this.squares.find((s) => s.isCore) || this.squares[0];
      const coreWorld = this.getSquareWorldBounds(coreSq);
      ctx.save();
      const fontSize = Math.max(13, Math.min(24, 11 + coreSq.size * 2.2));
      ctx.font = `800 ${fontSize}px "Trebuchet MS", "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = Math.max(3, fontSize * 0.22);
      ctx.strokeStyle = "rgba(10, 12, 18, 0.92)";
      ctx.fillStyle = "#ffffff";
      const label = isLeader ? `♛ ${this.name}` : this.name;
      const textOffsetY = coreSq.isHeart ? coreWorld.half + 10 : 0;
      ctx.strokeText(label, coreWorld.wx, coreWorld.wy + textOffsetY);
      ctx.fillText(label, coreWorld.wx, coreWorld.wy + textOffsetY);
      ctx.restore();
    }

    // Compact network snapshot for multiplayer state sync
    serialize() {
      const sqs = this.squares.map((s) => [s.gx, s.gy, s.size, s.isCore ? 1 : 0, s.isHeart ? 1 : 0]);
      return {
        x: Math.round(this.x),
        y: Math.round(this.y),
        a: Number(this.angle.toFixed(3)),
        n: this.name,
        sk: this.skinId,
        sc: this.score,
        sp: this.spinning ? 1 : 0,
        al: this.alive ? 1 : 0,
        sq: sqs
      };
    }
  }

  window.Cluster = {
    UNIT,
    BlockCluster
  };
})();
