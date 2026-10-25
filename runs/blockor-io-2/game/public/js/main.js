// Main Game Loop, Menu & Skin Selector, Camera, Input & Test Contract (window.State / window.__events)
(function () {
  const startTime = performance.now();
  window.__events = window.__events || [];

  function pushEvent(type, data = {}) {
    window.__events.push({
      t: Math.round(performance.now() - startTime),
      type,
      ...data
    });
    if (window.__events.length > 250) {
      window.__events.shift();
    }
  }

  const params = new URLSearchParams(location.search);
  const initialName = (params.get("name") || "MasterOv").slice(0, 18);
  const initialRoom = (params.get("room") || "main").slice(0, 24);
  const initialSeed = params.get("seed") || "gemblox-2025";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // UI DOM elements
  const menuOverlay = document.getElementById("menuOverlay");
  const skinOverlay = document.getElementById("skinOverlay");
  const nameInput = document.getElementById("nameInput");
  const playBtn = document.getElementById("playBtn");
  const skinBtn = document.getElementById("skinBtn");
  const gearBtn = document.getElementById("gearBtn");
  const settingsDropdown = document.getElementById("settingsDropdown");
  const darkThemeCheckbox = document.getElementById("darkThemeCheckbox");
  const heartModeCheckbox = document.getElementById("heartModeCheckbox");
  const regionSelect = document.getElementById("regionSelect");
  const partyCreateBtn = document.getElementById("partyCreateBtn");
  const partyJoinBtn = document.getElementById("partyJoinBtn");
  const partyCodeBadge = document.getElementById("partyCodeBadge");

  const skinPrevBtn = document.getElementById("skinPrevBtn");
  const skinNextBtn = document.getElementById("skinNextBtn");
  const skinSaveBtn = document.getElementById("skinSaveBtn");
  const skinPreviewCanvas = document.getElementById("skinPreviewCanvas");
  const skinNameLabel = document.getElementById("skinNameLabel");

  if (nameInput) nameInput.value = initialName;

  // Game settings & state
  let currentArea = "arena"; // Start directly playable; menu can be toggled or clicked through
  let isDarkTheme = false;
  let isHeartMode = false;
  let selectedSkinIdx = 0;
  let decayTimer = 0;

  // World & Local Player initialization
  const world = new window.GameWorld.World(initialSeed);
  const localPlayer = new window.Cluster.BlockCluster({
    id: "local",
    name: initialName,
    skinId: window.Skins.SKINS[selectedSkinIdx].id,
    heartMode: isHeartMode,
    x: 0,
    y: 0,
    starterSize: 1
  });

  // Camera state (top-down 2D centered on player's core block, zooms out as cluster grows - Rule 13)
  const camera = {
    x: localPlayer.x,
    y: localPlayer.y,
    zoom: 1.0,
    targetZoom: 1.0,
    width: window.innerWidth,
    height: window.innerHeight,
    shake: 0
  };

  // Input state
  const keys = new Set();
  const mouse = {
    screenX: window.innerWidth * 0.62,
    screenY: window.innerHeight * 0.48,
    worldX: 120,
    worldY: -20,
    hasMoved: false
  };

  let ejectCooldown = 0;
  let pickupCombo = 0;
  let pickupComboTimer = 0;

  // Connect Multiplayer via public/net.js
  const net = window.Net.connect({
    name: initialName,
    room: initialRoom,
    onWelcome() {
      pushEvent("join", { id: net.me, name: localPlayer.name, room: initialRoom });
    },
    onJoin(p) {
      pushEvent("player_join", { id: p.id, name: p.name });
    },
    onLeave(p) {
      pushEvent("player_leave", { id: p.id, name: p.name });
    },
    onMsg(m) {
      if (m.t === "chat") {
        pushEvent("chat", { from: m.from, text: m.text });
        if (localPlayer.alive) {
          world.addFloatText(localPlayer.x, localPlayer.y - 45, m.text, "#ffe033");
        }
      } else if (m.t === "eject_block" && typeof m.x === "number") {
        world.spawnStrayBlock(m.x, m.y, m.vx || 0, m.vy || 0, m.c || 0, 0.25);
      }
    }
  });

  // Resize handler
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    camera.width = canvas.width;
    camera.height = canvas.height;
  }
  window.addEventListener("resize", resize);
  resize();

    // Render Skin Preview Canvas in Skin Selector Modal
  function renderSkinPreview() {
    if (!skinPreviewCanvas) return;
    const sctx = skinPreviewCanvas.getContext("2d");
    const w = skinPreviewCanvas.width;
    const h = skinPreviewCanvas.height;
    sctx.clearRect(0, 0, w, h);

    const skin = window.Skins.SKINS[selectedSkinIdx];
    const pal = window.Skins.getPalette(skin.paletteIndex);
    window.Skins.drawGemBlock(sctx, w * 0.5, h * 0.5, w * 0.82, pal, {
      emblem: skin.emblem,
      isHeart: isHeartMode
    });
    if (skinNameLabel) {
      skinNameLabel.textContent = skin.name;
    }
  }
  renderSkinPreview();

  // Floating decorative 3D gem blocks for the purple Main Menu background (Video A 00:00)
  const menuDecoGems = [];
  for (let i = 0; i < 16; i++) {
    menuDecoGems.push({
      rx: ((i * 73) % 100) / 100,
      ry: ((i * 41) % 100) / 100,
      size: 28 + (i % 4) * 14,
      colorIdx: i % 6,
      speedX: (i % 2 === 0 ? 1 : -1) * (8 + (i % 5) * 3),
      speedY: -10 - (i % 4) * 4,
      angle: (i * 0.6) % (Math.PI * 2),
      rotSpd: (i % 2 === 0 ? 1 : -1) * 0.45
    });
  }

  function renderMenuBackground() {
    const mc = document.getElementById("menuBgCanvas");
    if (!mc || currentArea !== "menu") return;
    if (mc.width !== window.innerWidth || mc.height !== window.innerHeight) {
      mc.width = window.innerWidth;
      mc.height = window.innerHeight;
    }
    const mctx = mc.getContext("2d");
    const w = mc.width;
    const h = mc.height;
    mctx.clearRect(0, 0, w, h);

    // Subtle 3D perspective purple grid lines
    mctx.strokeStyle = "rgba(165, 110, 255, 0.14)";
    mctx.lineWidth = 1.5;
    const step = 80;
    const offset = (performance.now() * 0.015) % step;
    for (let x = -step + offset; x < w + step; x += step) {
      mctx.beginPath();
      mctx.moveTo(x, 0);
      mctx.lineTo(x, h);
      mctx.stroke();
    }
    for (let y = -step + offset; y < h + step; y += step) {
      mctx.beginPath();
      mctx.moveTo(0, y);
      mctx.lineTo(w, y);
      mctx.stroke();
    }

    const t = performance.now() * 0.001;
    for (const g of menuDecoGems) {
      const gx = ((g.rx * w + g.speedX * t) % (w + 80) + (w + 80)) % (w + 80) - 40;
      const gy = ((g.ry * h + g.speedY * t) % (h + 80) + (h + 80)) % (h + 80) - 40;
      mctx.save();
      mctx.translate(gx, gy);
      mctx.rotate(g.angle + t * g.rotSpd);
      mctx.globalAlpha = 0.65;
      const pal = window.Skins.getPalette(g.colorIdx);
      window.Skins.drawGemBlock(mctx, 0, 0, g.size, pal);
      mctx.restore();
    }
  }

  function openMenu() {
    currentArea = "menu";
    if (menuOverlay) menuOverlay.classList.remove("hidden");
    if (skinOverlay) skinOverlay.classList.add("hidden");
    pushEvent("area_change", { area: "menu" });
  }

  function closeMenuAndPlay() {
    window.AudioFX.unlock();
    const enteredName = nameInput && nameInput.value.trim() ? nameInput.value.trim().slice(0, 18) : initialName;
    localPlayer.name = enteredName;
    localPlayer.skinId = window.Skins.SKINS[selectedSkinIdx].id;
    localPlayer.heartMode = isHeartMode;

    if (!localPlayer.alive) {
      respawnLocalPlayer();
    } else {
      localPlayer.rebuildSquares(true);
    }

    currentArea = isDarkTheme ? "arena_dark" : "arena";
    if (menuOverlay) menuOverlay.classList.add("hidden");
    if (skinOverlay) skinOverlay.classList.add("hidden");
    pushEvent("area_change", { area: currentArea });
  }

  function respawnLocalPlayer() {
    localPlayer.x = (Math.random() - 0.5) * 320;
    localPlayer.y = (Math.random() - 0.5) * 320;
    localPlayer.vx = 0;
    localPlayer.vy = 0;
    localPlayer.angle = 0;
    localPlayer.energy = 100;
    localPlayer.alive = true;
    localPlayer.invuln = 2.2;
    localPlayer.heartMode = isHeartMode;
    localPlayer.initStarter(isHeartMode ? 2 : 1);
    pushEvent("respawn", { x: Math.round(localPlayer.x), y: Math.round(localPlayer.y) });
  }

  // UI Button Listeners
  if (playBtn) {
    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeMenuAndPlay();
    });
  }

  if (skinBtn) {
    skinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.AudioFX.unlock();
      currentArea = "skin_selector";
      if (menuOverlay) menuOverlay.classList.add("hidden");
      if (skinOverlay) skinOverlay.classList.remove("hidden");
      renderSkinPreview();
      pushEvent("area_change", { area: "skin_selector" });
    });
  }

  if (skinPrevBtn) {
    skinPrevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedSkinIdx = (selectedSkinIdx - 1 + window.Skins.SKINS.length) % window.Skins.SKINS.length;
      renderSkinPreview();
      window.AudioFX.playPickup(2);
    });
  }

  if (skinNextBtn) {
    skinNextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedSkinIdx = (selectedSkinIdx + 1) % window.Skins.SKINS.length;
      renderSkinPreview();
      window.AudioFX.playPickup(4);
    });
  }

  if (skinSaveBtn) {
    skinSaveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      localPlayer.skinId = window.Skins.SKINS[selectedSkinIdx].id;
      localPlayer.rebuildSquares(true);
      window.AudioFX.playMerge(3);
      closeMenuAndPlay();
    });
  }

  if (gearBtn && settingsDropdown) {
    gearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      settingsDropdown.classList.toggle("hidden");
    });
  }

  if (darkThemeCheckbox) {
    darkThemeCheckbox.addEventListener("change", () => {
      isDarkTheme = !!darkThemeCheckbox.checked;
      pushEvent("theme_change", { dark: isDarkTheme });
    });
  }

  if (heartModeCheckbox) {
    heartModeCheckbox.addEventListener("change", () => {
      isHeartMode = !!heartModeCheckbox.checked;
      localPlayer.heartMode = isHeartMode;
      if (isHeartMode) localPlayer.ensureHeartBlock();
      localPlayer.rebuildSquares(true);
      renderSkinPreview();
    });
  }

  if (partyCreateBtn && partyCodeBadge) {
    partyCreateBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const code = "PARTY-" + Math.random().toString(36).slice(2, 6).toUpperCase();
      partyCodeBadge.textContent = `Room: ${code} (Copied!)`;
      partyCodeBadge.classList.remove("hidden");
      pushEvent("party_create", { code });
    });
  }

  if (partyJoinBtn && partyCodeBadge) {
    partyJoinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      partyCodeBadge.textContent = `Joined Room: ${initialRoom}`;
      partyCodeBadge.classList.remove("hidden");
      pushEvent("party_join", { room: initialRoom });
    });
  }

  // Clicking anywhere on the canvas or pressing any movement/action key enters play immediately!
  canvas.addEventListener("mousedown", (e) => {
    window.AudioFX.unlock();
    mouse.screenX = e.clientX;
    mouse.screenY = e.clientY;
    mouse.hasMoved = true;
    if (currentArea !== "arena" && currentArea !== "arena_dark") {
      closeMenuAndPlay();
    }
  });

  window.addEventListener("mousemove", (e) => {
    mouse.screenX = e.clientX;
    mouse.screenY = e.clientY;
    mouse.hasMoved = true;
  });

  window.addEventListener("keydown", (e) => {
    window.AudioFX.unlock();
    if (document.activeElement === nameInput) {
      if (e.key === "Enter") {
        nameInput.blur();
        closeMenuAndPlay();
      }
      return;
    }

    keys.add(e.code);

    // If on menu or skin screen, pressing Enter, Space, W, A, S, D or Arrow keys jumps right into the arena
    if (currentArea !== "arena" && currentArea !== "arena_dark") {
      if (
        e.code === "Enter" ||
        e.code === "Space" ||
        e.code === "KeyW" ||
        e.code === "KeyA" ||
        e.code === "KeyD" ||
        e.code.startsWith("Arrow")
      ) {
        closeMenuAndPlay();
      }
    }

    if (e.code === "KeyM" || e.code === "Escape") {
      if (currentArea === "menu" || currentArea === "skin_selector") {
        closeMenuAndPlay();
      } else {
        openMenu();
      }
    }

    if (e.code === "KeyT") {
      isDarkTheme = !isDarkTheme;
      if (darkThemeCheckbox) darkThemeCheckbox.checked = isDarkTheme;
      currentArea = isDarkTheme ? "arena_dark" : "arena";
      pushEvent("area_change", { area: currentArea });
    }

    if (e.code === "KeyH") {
      isHeartMode = !isHeartMode;
      if (heartModeCheckbox) heartModeCheckbox.checked = isHeartMode;
      localPlayer.heartMode = isHeartMode;
      if (isHeartMode) localPlayer.ensureHeartBlock();
      localPlayer.rebuildSquares(true);
      renderSkinPreview();
      pushEvent("mode_change", { heartMode: isHeartMode });
    }
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.code);
  });

  // Perform W-block ejection
  function tryEjectBlock() {
    if (!localPlayer.alive || ejectCooldown > 0) return;
    const res = localPlayer.ejectToward(mouse.worldX, mouse.worldY);
    if (res) {
      ejectCooldown = 0.12;
      world.spawnStrayBlock(res.wx, res.wy, res.vx, res.vy, res.colorIdx, 0.32);
      if (res.orphaned && res.orphaned.length > 0) {
        world.scatterDroppedCells(res.orphaned, localPlayer.x, localPlayer.y);
      }
      window.AudioFX.playEject();
      net.send("eject_block", {
        x: Math.round(res.wx),
        y: Math.round(res.wy),
        vx: Math.round(res.vx),
        vy: Math.round(res.vy),
        c: res.colorIdx
      });
      pushEvent("item_use", { action: "eject_block", score: localPlayer.score });
      pushEvent("score_change", { score: localPlayer.score, reason: "eject" });
    }
  }

  // Compute Leaderboard & Rank
  function computeLeaderboard() {
    const list = [];
    if (localPlayer.alive) {
      list.push({ id: localPlayer.id, name: localPlayer.name, score: localPlayer.score });
    }
    for (const bot of world.bots) {
      if (bot.alive) {
        list.push({ id: bot.id, name: bot.name, score: bot.score });
      }
    }
    for (const rp of net.players.values()) {
      if (rp.s && rp.s.al) {
        list.push({ id: rp.id, name: rp.s.n || rp.name || "Player", score: rp.s.sc || 1 });
      }
    }
    list.sort((a, b) => b.score - a.score);
    let myRank = list.findIndex((x) => x.id === localPlayer.id) + 1;
    if (myRank === 0) myRank = list.length + 1;
    return { leaderboard: list, myRank, leaderId: list[0] ? list[0].id : null };
  }

  // Fixed-timestep simulation update
  function updateSimulation(dt) {
    if (ejectCooldown > 0) ejectCooldown = Math.max(0, ejectCooldown - dt);
    if (pickupComboTimer > 0) {
      pickupComboTimer -= dt;
      if (pickupComboTimer <= 0) pickupCombo = 0;
    }

    // Update world cursor target from mouse or keyboard directional fallback (for automated tests that hold ArrowUp/Down)
    let dirX = 0;
    let dirY = 0;
    if (keys.has("ArrowUp")) dirY -= 1;
    if (keys.has("ArrowDown")) dirY += 1;

    if (dirY !== 0) {
      mouse.worldX = localPlayer.x + Math.cos(localPlayer.angle) * 220;
      mouse.worldY = localPlayer.y + dirY * 220;
    } else if (mouse.hasMoved) {
      mouse.worldX = camera.x + (mouse.screenX - camera.width * 0.5) / camera.zoom;
      mouse.worldY = camera.y + (mouse.screenY - camera.height * 0.5) / camera.zoom;
    } else {
      // Gentle default forward glide toward nearby starter gems so even before moving the mouse the player is in motion
      const t = performance.now() * 0.00075;
      mouse.worldX = localPlayer.x + Math.cos(t) * 180;
      mouse.worldY = localPlayer.y + Math.sin(t) * 180;
    }

    const rotLeft = keys.has("KeyA") || keys.has("ArrowLeft");
    const rotRight = keys.has("KeyD") || keys.has("ArrowRight");
    const wantsEject = keys.has("KeyW") || keys.has("Space");

    if (wantsEject) {
      tryEjectBlock();
    }

    // Update Local Player Cluster
    const pRes = localPlayer.update(
      dt,
      {
        targetX: mouse.worldX,
        targetY: mouse.worldY,
        rotLeft,
        rotRight
      },
      window.GameWorld.ARENA_HALF
    );

    if (pRes.detachedBlock) {
      const d = pRes.detachedBlock;
      world.spawnStrayBlock(d.wx, d.wy, d.vx, d.vy, d.colorIdx, 0.45);
      pushEvent("score_change", { score: localPlayer.score, reason: "spin_detach" });
    }

    // Slow score decay for giant clusters (> 85 blocks) to prevent passive camping (Rule 22)
    if (localPlayer.alive && localPlayer.score > 85) {
      decayTimer += dt;
      if (decayTimer >= 1.2) {
        decayTimer = 0;
        const d = localPlayer.detachOuterUnmerged();
        if (d) {
          world.spawnStrayBlock(d.wx, d.wy, d.vx * 0.4, d.vy * 0.4, d.colorIdx, 0.6);
        }
      }
    }

    // Update World (Stray blocks, Obstacles, Giant Food Gems, AI Rivals, Combat)
    world.update(dt, localPlayer, {
      onLocalPickup(res, wx, wy, colorIdx) {
        pickupCombo++;
        pickupComboTimer = 1.4;
        const pal = window.Skins.getPalette(colorIdx);
        world.addParticles(wx, wy, pal.top, 6, 130);

        if (res.maxMergedNew >= 2) {
          window.AudioFX.playMerge(res.maxMergedNew);
          world.addFloatText(
            localPlayer.x,
            localPlayer.y - localPlayer.radius * 0.6 - 16,
            `${res.maxMergedNew}x${res.maxMergedNew} MERGE!`,
            "#ffe033"
          );
          camera.shake = Math.min(10, res.maxMergedNew * 1.8);
          pushEvent("merge", { size: res.maxMergedNew, score: localPlayer.score });
        } else {
          window.AudioFX.playPickup(pickupCombo);
          world.addFloatText(wx, wy - 10, "+1", "#70ff4d");
        }

        pushEvent("pickup", { score: localPlayer.score, x: Math.round(wx), y: Math.round(wy) });
        pushEvent("score_change", { score: localPlayer.score, reason: "pickup" });
      },

      onLocalHitObstacle(fatal, sqSize, wx, wy) {
        window.AudioFX.playShatter(sqSize >= 3 || fatal);
        camera.shake = Math.min(16, 4 + sqSize * 2.5);
        pushEvent("hit", { source: "obstacle", fatal, sqSize, score: localPlayer.score });
        pushEvent("score_change", { score: localPlayer.score, reason: "obstacle" });

        if (fatal) {
          window.AudioFX.playDeath();
          world.addFloatText(wx, wy, "SHATTERED!", "#ff4d4d");
          pushEvent("death", { by: "obstacle" });
          setTimeout(() => {
            if (!localPlayer.alive) respawnLocalPlayer();
          }, 900);
        }
      },

      onLocalShatterFoodGem(fx, fy, count) {
        window.AudioFX.playShatter(true);
        camera.shake = 9;
        world.addFloatText(fx, fy - 20, `GEM BURST +${count}!`, "#ff7bc0");
        pushEvent("hit", { source: "food_gem", burst: count });
      },

      onLocalCombatHit(dealtByMe, fatal, otherName, wx, wy) {
        window.AudioFX.playShatter(fatal);
        camera.shake = fatal ? 14 : 7;
        if (dealtByMe) {
          world.addFloatText(wx, wy - 16, fatal ? `KO ${otherName}!` : "SMASH!", "#2ce8f5");
          pushEvent("hit", { target: otherName, fatal });
          if (fatal) {
            pushEvent("win", { defeated: otherName, score: localPlayer.score });
          }
        } else {
          pushEvent("hit", { by: otherName, fatal, score: localPlayer.score });
          if (fatal) {
            window.AudioFX.playDeath();
            pushEvent("death", { by: otherName });
            setTimeout(() => {
              if (!localPlayer.alive) respawnLocalPlayer();
            }, 900);
          }
        }
      }
    });

    // Update Smooth Dynamic Zoom Camera centered on Player's Core Block (Rule 13)
    if (localPlayer.alive && localPlayer.squares.length > 0) {
      const coreSq = localPlayer.squares.find((s) => s.isCore) || localPlayer.squares[0];
      const coreBounds = localPlayer.getSquareWorldBounds(coreSq);
      camera.x += (coreBounds.wx - camera.x) * Math.min(1, 10 * dt);
      camera.y += (coreBounds.wy - camera.y) * Math.min(1, 10 * dt);

      const span = Math.max(1, (localPlayer.radius - 28) / 340);
      camera.targetZoom = Math.max(0.42, Math.min(1.08, 1.04 / (1 + span * 0.58)));
      camera.zoom += (camera.targetZoom - camera.zoom) * Math.min(1, 3.5 * dt);
    }

    if (camera.shake > 0) {
      camera.shake = Math.max(0, camera.shake - 28 * dt);
    }

    // Broadcast our state at 15Hz via Net
    net.state(localPlayer.serialize());
  }

  // Update live `window.State` contract every frame
  function syncWindowState(lbData) {
    window.State = {
      area: currentArea,
      player: {
        id: localPlayer.id,
        name: localPlayer.name,
        x: Math.round(localPlayer.x),
        y: Math.round(localPlayer.y),
        vx: Math.round(localPlayer.vx),
        vy: Math.round(localPlayer.vy),
        angle: Number(localPlayer.angle.toFixed(3)),
        score: localPlayer.score,
        maxSquareSize: localPlayer.maxSquareSize,
        squaresCount: localPlayer.squares.length,
        energy: Math.round(localPlayer.energy),
        spinning: localPlayer.spinning,
        skinId: localPlayer.skinId,
        heartMode: localPlayer.heartMode,
        alive: localPlayer.alive
      },
      score: localPlayer.score,
      health: localPlayer.alive ? 100 : 0,
      rank: lbData.myRank,
      leaderboardTop: lbData.leaderboard.slice(0, 5),
      camera: {
        x: Math.round(camera.x),
        y: Math.round(camera.y),
        zoom: Number(camera.zoom.toFixed(3))
      },
      world: {
        strayBlocksCount: world.strayBlocks.length,
        obstaclesCount: world.obstacles.filter((o) => o.respawnTimer <= 0).length,
        foodGemsCount: world.foodGems.filter((f) => f.respawnTimer <= 0).length,
        botsCount: world.bots.filter((b) => b.alive).length,
        onlinePlayers: net.players.size + 1,
        darkTheme: isDarkTheme
      }
    };
  }

  // Main 60fps Fixed-Timestep Render & Simulation Loop
  let lastFrame = performance.now();
  let accumulator = 0;
  const FIXED_DT = 1 / 60;

  function frame(now) {
    const frameDt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    accumulator += frameDt;

    while (accumulator >= FIXED_DT) {
      updateSimulation(FIXED_DT);
      accumulator -= FIXED_DT;
    }

    const lbData = computeLeaderboard();
    syncWindowState(lbData);

    // Render World
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const shakeX = camera.shake > 0 ? (Math.random() - 0.5) * camera.shake : 0;
    const shakeY = camera.shake > 0 ? (Math.random() - 0.5) * camera.shake : 0;

    ctx.translate(canvas.width * 0.5 + shakeX, canvas.height * 0.5 + shakeY);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    world.draw(ctx, camera, isDarkTheme, localPlayer, net.players, lbData.leaderId);
    ctx.restore();

    // Render HUD on top
    const allEntities = [
      localPlayer,
      ...world.bots,
      ...[...net.players.values()].filter((p) => p.s && p.s.al).map((p) => ({
        x: p.s.x,
        y: p.s.y,
        alive: true,
        isLeader: p.id === lbData.leaderId
      }))
    ];
    for (const ent of allEntities) {
      if (ent && ent.id) ent.isLeader = ent.id === lbData.leaderId;
    }

    window.HUD.drawHUD(ctx, canvas.width, canvas.height, {
      localPlayer,
      leaderboard: lbData.leaderboard,
      myRank: lbData.myRank,
      arenaHalf: window.GameWorld.ARENA_HALF,
      isDark: isDarkTheme,
      roomName: initialRoom,
      onlineCount: net.players.size + 1,
      allEntities
    });

    if (currentArea === "menu") {
      renderMenuBackground();
    }

    requestAnimationFrame(frame);
  }

  // Emit initial area event and start loop
  pushEvent("area_change", { area: currentArea });
  syncWindowState(computeLeaderboard());
  requestAnimationFrame(frame);
})();
