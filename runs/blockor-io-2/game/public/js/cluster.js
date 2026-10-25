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

  function numKey(gx, gy) {
    return ((gx + 512) << 10) | ((gy + 512) & 1023);
  }

  const HEART_KEYS = new Set(["0,0", "1,0", "0,1", "1,1"]);

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
      this.cells = new Map();
      this.squares = []; // Merged squares: [{ gx, gy, size, isCore, isHeart, flash }]
      this.maxSquareSize = 1;
      this.radius = UNIT * 0.8;
      this.alive = true;
      this.invuln = 2.0; // Brief spawn protection

      // Track recent merge animations: Map<"gx,gy,size", flashAlpha>
      this.mergeFlashes = new Map();

      this.initStarter(opts.starterSize || (this.heartMode ? 2 : 1));
    }

    getSkinColorIdx() {
      const skin = window.Skins.getSkin(this.skinId);
      return skin ? skin.paletteIndex : 0;
    }

    initStarter(size = 1) {
      this.cells.clear();
      const colorIdx = this.getSkinColorIdx();
      const actualSize = this.heartMode ? Math.max(2, size) : size;
      // Use Math.floor((actualSize - 1) / 2) so a 2x2 starter sits at (0,0)..(1,1), matching Heart Block coordinates
      const half = Math.floor((actualSize - 1) / 2);
      const now = performance.now();
      for (let dy = 0; dy < actualSize; dy++) {
        for (let dx = 0; dx < actualSize; dx++) {
          const gx = dx - half;
          const gy = dy - half;
          this.cells.set(keyOf(gx, gy), { colorIdx, addedAt: now });
        }
      }
      if (!this.cells.has("0,0")) {
        this.cells.set("0,0", { colorIdx, addedAt: now });
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

    // Return local center (cx, cy) of the main named core / heart square
    getCoreLocalCenter() {
      if (this.squares.length === 0) return { cx: 0, cy: 0 };
      const coreSq = this.squares.find((s) => s.isCore) || this.squares[0];
      return {
        cx: coreSq.gx + (coreSq.size - 1) * 0.5,
        cy: coreSq.gy + (coreSq.size - 1) * 0.5
      };
    }

    // Return world center (wx, wy) of the main named core / heart square
    getCoreWorldCenter() {
      const lc = this.getCoreLocalCenter();
      return this.localToWorld(lc.cx, lc.cy);
    }

    // If heartMode is enabled, ensure the 2x2 Heart Block cells at (0,0)..(1,1) exist cleanly
    ensureHeartBlock() {
      if (!this.heartMode) return;
      const colorIdx = this.getSkinColorIdx();
      const now = performance.now();
      // If cluster had <= 4 cells from a misaligned starter, reset cleanly to the 2x2 Heart Block
      if (this.cells.size <= 4) {
        this.cells.clear();
      }
      const coords = [[0, 0], [1, 0], [0, 1], [1, 1]];
      for (const [gx, gy] of coords) {
        const k = keyOf(gx, gy);
        if (!this.cells.has(k)) {
          this.cells.set(k, { colorIdx, addedAt: now });
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
      const unassigned = new Set();
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

      for (const k of this.cells.keys()) {
        const [gx, gy] = parseKey(k);
        unassigned.add(numKey(gx, gy));
        if (gx < minX) minX = gx;
        if (gx > maxX) maxX = gx;
        if (gy < minY) minY = gy;
        if (gy > maxY) maxY = gy;
      }

      const squares = [];

      // Rule 5: In Heart Block mode, if the 2x2 Heart cells at (0,0)..(1,1) are present, lock them first as the dedicated 2x2 Heart Block
      if (
        this.heartMode &&
        unassigned.has(numKey(0, 0)) &&
        unassigned.has(numKey(1, 0)) &&
        unassigned.has(numKey(0, 1)) &&
        unassigned.has(numKey(1, 1))
      ) {
        unassigned.delete(numKey(0, 0));
        unassigned.delete(numKey(1, 0));
        unassigned.delete(numKey(0, 1));
        unassigned.delete(numKey(1, 1));
        squares.push({
          gx: 0,
          gy: 0,
          size: 2,
          containsOrigin: true,
          isCore: true,
          isHeart: true
        });
      }

      // Greedily pack the largest possible NxN squares first using fast integer keys
      while (unassigned.size > 0) {
        let bestSq = null;

        for (let gy = minY; gy <= maxY; gy++) {
          for (let gx = minX; gx <= maxX; gx++) {
            if (!unassigned.has(numKey(gx, gy))) continue;

            let maxN = 1;
            const limit = Math.min(maxX - gx + 1, maxY - gy + 1, 14);
            while (maxN < limit) {
              const nextN = maxN + 1;
              let ok = true;
              for (let dy = 0; dy < nextN && ok; dy++) {
                for (let dx = 0; dx < nextN; dx++) {
                  if (!unassigned.has(numKey(gx + dx, gy + dy))) {
                    ok = false;
                    break;
                  }
                }
              }
              if (ok) maxN = nextN;
              else break;
            }

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
            unassigned.delete(numKey(bestSq.gx + dx, bestSq.gy + dy));
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

      // Identify the Core / Main block
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

      for (let i = 0; i < squares.length; i++) {
        squares[i].isCore = i === coreIdx;
        squares[i].isHeart = i === coreIdx && this.heartMode;
      }

      // In Classic Mode, keep the main named core square anchored over local (0,0) so steering & rotation never drift off-center
      const coreSq = squares[coreIdx];
      if (!this.heartMode && coreSq) {
        const shiftX = Math.round(coreSq.gx + (coreSq.size - 1) * 0.5);
        const shiftY = Math.round(coreSq.gy + (coreSq.size - 1) * 0.5);
        if (shiftX !== 0 || shiftY !== 0) {
          const shiftedCells = new Map();
          for (const [k, val] of this.cells.entries()) {
            const [gx, gy] = parseKey(k);
            shiftedCells.set(keyOf(gx - shiftX, gy - shiftY), val);
          }
          this.cells = shiftedCells;
          for (const sq of squares) {
            sq.gx -= shiftX;
            sq.gy -= shiftY;
            sq.containsOrigin = sq.gx <= 0 && sq.gx + sq.size > 0 && sq.gy <= 0 && sq.gy + sq.size > 0;
          }
          const c = Math.cos(this.angle);
          const s = Math.sin(this.angle);
          this.x += (shiftX * c - shiftY * s) * UNIT;
          this.y += (shiftX * s + shiftY * c) * UNIT;
        }
      }

      let maxMergedNew = 0;
      for (let i = 0; i < squares.length; i++) {
        const sq = squares[i];
        const sig = `${sq.gx},${sq.gy},${sq.size}`;
        if (!silent && sq.size >= 2 && !prevSet.has(sig)) {
          this.mergeFlashes.set(sig, 1.0);
          if (sq.size > maxMergedNew) maxMergedNew = sq.size;
        }
      }

      this.squares = squares;
      this.maxSquareSize = maxSz;

      // Update bounding radius in world pixels relative to local (0,0)
      let maxR = UNIT * 0.75;
      for (const k of this.cells.keys()) {
        const [gx, gy] = parseKey(k);
        const d = (Math.hypot(gx, gy) + 0.75) * UNIT;
        if (d > maxR) maxR = d;
      }
      this.radius = maxR;

      return { maxMergedNew };
    }

    // Count how many orthogonal neighbors of (nx, ny) are occupied in `this.cells`
    countOrthoNeighbors(nx, ny) {
      let c = 0;
      if (this.cells.has(keyOf(nx + 1, ny))) c++;
      if (this.cells.has(keyOf(nx - 1, ny))) c++;
      if (this.cells.has(keyOf(nx, ny + 1))) c++;
      if (this.cells.has(keyOf(nx, ny - 1))) c++;
      return c;
    }

    // Check if placing a cell at (nx, ny) immediately completes at least one 2x2 square
    completes2x2At(nx, ny) {
      const quads = [
        [[1, 0], [0, 1], [1, 1]],
        [[-1, 0], [0, 1], [-1, 1]],
        [[1, 0], [0, -1], [1, -1]],
        [[-1, 0], [0, -1], [-1, -1]]
      ];
      let completed = 0;
      for (const q of quads) {
        if (
          this.cells.has(keyOf(nx + q[0][0], ny + q[0][1])) &&
          this.cells.has(keyOf(nx + q[1][0], ny + q[1][1])) &&
          this.cells.has(keyOf(nx + q[2][0], ny + q[2][1]))
        ) {
          completed++;
        }
      }
      return completed;
    }

    // Find the best empty orthogonal neighbor cell near local coordinates (lx, ly),
    // favoring concave pockets (2+ orthogonal neighbors) and 2x2 completions over coral tendrils
    findSnapCell(lx, ly) {
      let best = null;
      let bestCost = Infinity;
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ];
      const coreCenter = this.getCoreLocalCenter();
      const checked = new Set();

      for (const k of this.cells.keys()) {
        const [gx, gy] = parseKey(k);
        const distToExisting = Math.hypot(lx - gx, ly - gy);
        if (distToExisting > 2.65) continue;

        for (const [dx, dy] of dirs) {
          const nx = gx + dx;
          const ny = gy + dy;
          const nk = keyOf(nx, ny);
          if (checked.has(nk) || this.cells.has(nk)) continue;
          checked.add(nk);

          const distTouch = Math.hypot(lx - nx, ly - ny);
          if (distTouch > 2.25) continue;

          const ortho = this.countOrthoNeighbors(nx, ny);
          const comp2x2 = this.completes2x2At(nx, ny);
          const distCore = Math.hypot(nx - coreCenter.cx, ny - coreCenter.cy);

          // Lower cost is better: strongly reward completing 2x2 squares & filling concave pockets (2+ neighbors),
          // and keep growth consolidated near the core block instead of chaining on outer tips
          const pocketBonus = (ortho >= 2 ? (ortho - 1) * 1.15 : 0) + (comp2x2 > 0 ? 1.85 : 0);
          const cost = distTouch * (this.isBot ? 0.35 : 0.72) + distCore * 0.42 - pocketBonus;

          if (cost < bestCost) {
            bestCost = cost;
            best = { gx: nx, gy: ny, key: nk };
          }
        }
      }
      return best;
    }

    // Attach a 1x1 block at local position (lx, ly) using the player's own skin color (Rule 2, 10, 14)
    attachAtLocal(lx, ly, colorIdx = null) {
      const snap = this.findSnapCell(lx, ly);
      if (!snap) return null;
      const myColorIdx = this.getSkinColorIdx();
      this.cells.set(snap.key, { colorIdx: myColorIdx, addedAt: performance.now() });
      const res = this.rebuildSquares(false);
      this.energy = Math.min(100, this.energy + (res.maxMergedNew >= 2 ? 6 : 1.5));
      return { gx: snap.gx, gy: snap.gy, maxMergedNew: res.maxMergedNew };
    }

    // Remove any cells disconnected from the core block so floating islands don't remain
    pruneDisconnected() {
      if (this.cells.size <= 1) return [];
      const myColorIdx = this.getSkinColorIdx();
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
      for (const [k] of this.cells.entries()) {
        if (!visited.has(k)) {
          const [gx, gy] = parseKey(k);
          const w = this.localToWorld(gx, gy);
          detached.push({ wx: w.wx, wy: w.wy, colorIdx: myColorIdx });
          this.cells.delete(k);
        }
      }
      return detached;
    }

    // Eject a single 1x1 block from the outer edge facing world target (tx, ty)
    ejectToward(tx, ty) {
      const minRequired = this.heartMode ? 5 : 2;
      if (this.cells.size < minRequired || this.energy < 4) return null;

      const coreWorld = this.getCoreWorldCenter();
      const dirAngle = Math.atan2(ty - coreWorld.wy, tx - coreWorld.wx);
      const localDirX = Math.cos(dirAngle - this.angle);
      const localDirY = Math.sin(dirAngle - this.angle);
      const coreLocal = this.getCoreLocalCenter();

      // Find the outermost cell in the direction of the cursor (never ejecting protected Heart cells)
      let bestKey = null;
      let bestScore = -Infinity;
      for (const k of this.cells.keys()) {
        if (this.heartMode && HEART_KEYS.has(k)) continue;
        if (!this.heartMode && k === "0,0" && this.cells.size <= 1) continue;

        const [gx, gy] = parseKey(k);
        const rx = gx - coreLocal.cx;
        const ry = gy - coreLocal.cy;
        const dot = rx * localDirX + ry * localDirY;
        const dist = Math.hypot(rx, ry);
        const score = dot * 2.0 + dist * 0.8 + (!this.heartMode && k === "0,0" ? -100 : 0);
        if (score > bestScore) {
          bestScore = score;
          bestKey = k;
        }
      }

      if (!bestKey) return null;
      const myColorIdx = this.getSkinColorIdx();
      const [gx, gy] = parseKey(bestKey);
      this.cells.delete(bestKey);

      const orphaned = this.pruneDisconnected();
      this.rebuildSquares(true);
      this.energy = Math.max(0, this.energy - 5);

      const w = this.localToWorld(gx, gy);
      return {
        wx: w.wx + Math.cos(dirAngle) * UNIT * 0.85,
        wy: w.wy + Math.sin(dirAngle) * UNIT * 0.85,
        vx: Math.cos(dirAngle) * 460 + this.vx * 0.35,
        vy: Math.sin(dirAngle) * 460 + this.vy * 0.35,
        colorIdx: myColorIdx,
        orphaned
      };
    }

    // Detach 1 unmerged outer 1x1 block while high-speed spinning (Rule 9) or during score decay (Rule 22)
    detachOuterUnmerged() {
      const minKeep = this.heartMode ? 5 : 4;
      if (this.cells.size <= minKeep) return null;
      const myColorIdx = this.getSkinColorIdx();
      const coreLocal = this.getCoreLocalCenter();
      const unmerged = this.squares.filter(
        (sq) => sq.size === 1 && !sq.isCore && !(this.heartMode && HEART_KEYS.has(keyOf(sq.gx, sq.gy)))
      );

      let targetGx = null;
      let targetGy = null;

      if (unmerged.length > 0) {
        unmerged.sort(
          (a, b) =>
            Math.hypot(b.gx - coreLocal.cx, b.gy - coreLocal.cy) -
            Math.hypot(a.gx - coreLocal.cx, a.gy - coreLocal.cy)
        );
        targetGx = unmerged[0].gx;
        targetGy = unmerged[0].gy;
      } else {
        // Fallback: pick furthest non-protected cell
        let maxD = -1;
        for (const k of this.cells.keys()) {
          if (this.heartMode && HEART_KEYS.has(k)) continue;
          if (k === "0,0") continue;
          const [gx, gy] = parseKey(k);
          const d = Math.hypot(gx - coreLocal.cx, gy - coreLocal.cy);
          if (d > maxD) {
            maxD = d;
            targetGx = gx;
            targetGy = gy;
          }
        }
      }

      if (targetGx === null) return null;
      const k = keyOf(targetGx, targetGy);
      this.cells.delete(k);
      this.pruneDisconnected();
      this.rebuildSquares(true);

      const w = this.localToWorld(targetGx, targetGy);
      const coreWorld = this.getCoreWorldCenter();
      const outAngle = Math.atan2(w.wy - coreWorld.wy, w.wx - coreWorld.wx) + this.spinDir * 0.6;
      return {
        wx: w.wx,
        wy: w.wy,
        vx: Math.cos(outAngle) * 260,
        vy: Math.sin(outAngle) * 260,
        colorIdx: myColorIdx
      };
    }

    // Destroy a specific merged square `sq` (from obstacle or larger enemy block impact)
    shatterSquare(sq) {
      const dropped = [];
      const myColorIdx = this.getSkinColorIdx();
      for (let dy = 0; dy < sq.size; dy++) {
        for (let dx = 0; dx < sq.size; dx++) {
          const gx = sq.gx + dx;
          const gy = sq.gy + dy;
          const k = keyOf(gx, gy);
          if (this.cells.has(k)) {
            const w = this.localToWorld(gx, gy);
            dropped.push({ wx: w.wx, wy: w.wy, colorIdx: myColorIdx });
            this.cells.delete(k);
          }
        }
      }

      // If the core / heart square was shattered, the entire player dies and shatters! (Rules 15, 16, 18)
      if (sq.isCore || sq.isHeart || this.cells.size === 0) {
        for (const [k] of this.cells.entries()) {
          const [gx, gy] = parseKey(k);
          const w = this.localToWorld(gx, gy);
          dropped.push({ wx: w.wx, wy: w.wy, colorIdx: myColorIdx });
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

      // Rotate around the center of the main named Core / Heart block so pivoting never swings the core block in an arc
      const dAngle = this.angVel * dt;
      if (Math.abs(dAngle) > 1e-6) {
        const pivotBefore = this.getCoreWorldCenter();
        this.angle += dAngle;
        const pivotAfter = this.getCoreWorldCenter();
        this.x += pivotBefore.wx - pivotAfter.wx;
        this.y += pivotBefore.wy - pivotAfter.wy;
      }

      // Continuous movement toward cursor target measured from the main named Core / Heart block (Rule 6)
      const coreWorld = this.getCoreWorldCenter();
      if (inputState && typeof inputState.targetX === "number" && typeof inputState.targetY === "number") {
        const dx = inputState.targetX - coreWorld.wx;
        const dy = inputState.targetY - coreWorld.wy;
        const dist = Math.hypot(dx, dy);
        const maxSpd = this.getMaxSpeed();
        const throttle = Math.min(1, dist / 48);
        const desiredVx = dist > 2 ? (dx / dist) * maxSpd * throttle : 0;
        const desiredVy = dist > 2 ? (dy / dist) * maxSpd * throttle : 0;
        const accel = 9.5;
        this.vx += (desiredVx - this.vx) * Math.min(1, accel * dt);
        this.vy += (desiredVy - this.vy) * Math.min(1, accel * dt);
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Clamp all squares inside the perimeter wall so off-center squares never clip outside [-arenaHalf, arenaHalf]
      const wallMargin = UNIT * 1.45;
      const wallLimit = arenaHalf - wallMargin;
      if (this.squares.length > 0) {
        let minWx = Infinity, maxWx = -Infinity, minWy = Infinity, maxWy = -Infinity;
        for (const sq of this.squares) {
          const b = this.getSquareWorldBounds(sq);
          if (b.wx - b.half < minWx) minWx = b.wx - b.half;
          if (b.wx + b.half > maxWx) maxWx = b.wx + b.half;
          if (b.wy - b.half < minWy) minWy = b.wy - b.half;
          if (b.wy + b.half > maxWy) maxWy = b.wy + b.half;
        }
        if (minWx < -wallLimit) {
          this.x += -wallLimit - minWx;
          this.vx = Math.max(0, this.vx);
        } else if (maxWx > wallLimit) {
          this.x -= maxWx - wallLimit;
          this.vx = Math.min(0, this.vx);
        }
        if (minWy < -wallLimit) {
          this.y += -wallLimit - minWy;
          this.vy = Math.max(0, this.vy);
        } else if (maxWy > wallLimit) {
          this.y -= maxWy - wallLimit;
          this.vy = Math.min(0, this.vy);
        }
      } else {
        if (this.x < -wallLimit) { this.x = -wallLimit; this.vx = Math.max(0, this.vx); }
        if (this.x > wallLimit) { this.x = wallLimit; this.vx = Math.min(0, this.vx); }
        if (this.y < -wallLimit) { this.y = -wallLimit; this.vy = Math.max(0, this.vy); }
        if (this.y > wallLimit) { this.y = wallLimit; this.vy = Math.min(0, this.vy); }
      }

      return { detachedBlock };
    }

    draw(ctx, isLeader = false) {
      if (!this.alive || this.squares.length === 0) return;
      const skin = window.Skins.getSkin(this.skinId);
      const palette = window.Skins.getPalette(skin.paletteIndex);

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      // Fast golden spin boost aura without expensive GPU shadowBlur stalls (Video D 03:23)
      if (this.spinning) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 224, 66, 0.34)";
        ctx.lineWidth = 8;
        for (const sq of this.squares) {
          const cx = (sq.gx + (sq.size - 1) * 0.5) * UNIT;
          const cy = (sq.gy + (sq.size - 1) * 0.5) * UNIT;
          const w = sq.size * UNIT;
          ctx.strokeRect(cx - w * 0.5 - 3, cy - w * 0.5 - 3, w + 6, w + 6);
        }
        ctx.strokeStyle = "rgba(255, 244, 130, 0.88)";
        ctx.lineWidth = 3;
        for (const sq of this.squares) {
          const cx = (sq.gx + (sq.size - 1) * 0.5) * UNIT;
          const cy = (sq.gy + (sq.size - 1) * 0.5) * UNIT;
          const w = sq.size * UNIT;
          ctx.strokeRect(cx - w * 0.5 - 1.5, cy - w * 0.5 - 1.5, w + 3, w + 3);
        }
        ctx.restore();
      }

      // Spawn protection pulse
      if (this.invuln > 0) {
        ctx.globalAlpha = 0.72 + Math.sin(performance.now() * 0.018) * 0.22;
      }

      // Draw each merged square
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

      // Draw player nickname centered directly over the Core / Heart block (Rule 1, Video D 01:21)
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
      ctx.strokeText(label, coreWorld.wx, coreWorld.wy);
      ctx.fillText(label, coreWorld.wx, coreWorld.wy);
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
        iv: this.invuln > 0 ? 1 : 0,
        sq: sqs
      };
    }
  }

  window.Cluster = {
    UNIT,
    BlockCluster
  };
})();
