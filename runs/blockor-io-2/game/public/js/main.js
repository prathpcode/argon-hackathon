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
  }

  const params = new URLSearchParams(location.search);
  const initialName = (params.get("name") || "MasterOv").slice(0, 18);
  let currentRoomName = (params.get("room") || "main").slice(0, 24);
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
  const partyCodeInput = document.getElementById("partyCodeInput");
  const partyCodeBadge = document.getElementById("partyCodeBadge");

  const skinPrevBtn = document.getElementById("skinPrevBtn");
  const skinNextBtn = document.getElementById("skinNextBtn");
  const skinSaveBtn = document.getElementById("skinSaveBtn");
  const skinPreviewCanvas = document.getElementById("skinPreviewCanvas");
  const skinNameLabel = document.getElementById("skinNameLabel");

  if (nameInput) nameInput.value = initialName;

  // Deterministic skin index from player name so different players don't all default to identical cyan
  let nameHash = 0;
  for (let i = 0; i < initialName.length; i++) {
    nameHash = (nameHash * 31 + initialName.charCodeAt(i)) >>> 0;
  }

  // Game settings & state
  let currentArea = "arena"; // Start directly playable; menu can be toggled with [M] or [Esc]
  let isDarkTheme = false;
  let isHeartMode = false;
  let selectedSkinIdx = nameHash % 7; // Default to one of the 7 solid gem colors
  let decayTimer = 0;
  let hostSyncTimer = 0;
  let pendingEject = false;

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
  let hasAdjustedMultiplayerSpawn = false;

  // Connect Multiplayer via public/net.js
  const net = window.Net.connect({
    name: initialName,
    room: currentRoomName,
    onWelcome() {
      // Give each player in a multiplayer room a distinct color and non-overlapping nearby spawn if they just loaded
      if (!hasAdjustedMultiplayerSpawn && net.me && net.players.size > 0 && localPlayer.score <= 2) {
        hasAdjustedMultiplayerSpawn = true;
        selectedSkinIdx = (net.me - 1) % 7;
        localPlayer.skinId = window.Skins.SKINS[selectedSkinIdx].id;
        const spawnAngle = ((net.me - 1) * 2.094) % (Math.PI * 2);
        const spawnDist = 96;
        localPlayer.x = Math.cos(spawnAngle) * spawnDist;
        localPlayer.y = Math.sin(spawnAngle) * spawnDist;
        localPlayer.initStarter(isHeartMode ? 2 : 1);
        world.spawnStarterRingAround(localPlayer.x, localPlayer.y);
        renderSkinPreview();
      }
      if (net.shared && Array.isArray(net.shared.bots) && !net.isHost) {
        world.applyHostBots(net.shared.bots, 1);
      }
      pushEvent("join", { id: net.me, name: localPlayer.name, room: currentRoomName });
    },
    onJoin(p) {
      pushEvent("player_join", { id: p.id, name: p.name });
      if (net.isHost) {
        net.set("bots", world.serializeBots());
      }
    },
    onLeave(p) {
      pushEvent("player_leave", { id: p.id, name: p.name });
    },
    onSet(key, val) {
      if (key === "bots" && !net.isHost && Array.isArray(val)) {
        world.applyHostBots(val, 0.25);
      }
    },
    onMsg(m) {
      if (m.t === "chat") {
        pushEvent("chat", { from: m.from, text: m.text });
        if (localPlayer.alive) {
          world.addFloatText(localPlayer.x, localPlayer.y - 45, m.text, "#ffe033");
        }
      } else if (m.t === "eject_block" && typeof m.x === "number") {
        world.spawnStrayBlock(m.x, m.y, m.vx || 0, m.vy || 0, m.c || 0, 0.25);
      } else if (m.t === "pvp_hit" && m.targetId === net.me && localPlayer.alive && localPlayer.invuln <= 0) {
        // A larger remote player smashed one of our squares!
        let targetSq = localPlayer.squares.find((s) => s.gx === m.gx && s.gy === m.gy && s.size === m.size);
        if (!targetSq) {
          targetSq = m.fatal
            ? localPlayer.squares.find((s) => s.isCore) || localPlayer.squares[0]
            : localPlayer.squares.find((s) => !s.isCore) || localPlayer.squares[0];
        }
        if (targetSq) {
          const sh = localPlayer.shatterSquare(targetSq);
          world.scatterDroppedCells(sh.dropped, m.wx || localPlayer.x, m.wy || localPlayer.y);
          const pal = window.Skins.getPalette(localPlayer.getSkinColorIdx());
          world.addParticles(m.wx || localPlayer.x, m.wy || localPlayer.y, pal.top, 14, 240);
          net.send("pvp_shatter", {
            attackerId: m.from,
            victimName: localPlayer.name,
            fatal: sh.fatal,
            wx: Math.round(localPlayer.x),
            wy: Math.round(localPlayer.y),
            colorIdx: localPlayer.getSkinColorIdx(),
            count: Math.min(16, sh.dropped.length)
          });
          window.AudioFX.playShatter(sh.fatal);
          camera.shake = sh.fatal ? 14 : 7;
          pushEvent("hit", { by: m.attackerName || "Player", fatal: sh.fatal, score: localPlayer.score });
          if (sh.fatal) {
            window.AudioFX.playDeath();
            pushEvent("death", { by: m.attackerName || "Player" });
            setTimeout(() => {
              if (!localPlayer.alive) respawnLocalPlayer();
            }, 900);
          }
        }
      } else if (m.t === "pvp_shatter" && typeof m.wx === "number") {
        const count = Math.min(16, m.count || 6);
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
          const spd = 90 + Math.random() * 170;
          world.spawnStrayBlock(
            m.wx,
            m.wy,
            Math.cos(a) * spd,
            Math.sin(a) * spd,
            typeof m.colorIdx === "number" ? m.colorIdx : 0,
            0.35
          );
        }
      } else if (m.t === "pvp_bump" && m.targetId === net.me && localPlayer.alive) {
        localPlayer.vx = m.vx || 0;
        localPlayer.vy = m.vy || 0;
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
      isHeart: isHeartMode && !skin.emblem
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
    localPlayer.vx = 0;
    localPlayer.vy = 0;
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
      if (isHeartMode) localPlayer.ensureHeartBlock();
      localPlayer.rebuildSquares(true);
    }

    currentArea = isDarkTheme ? "arena_dark" : "arena";
    if (menuOverlay) menuOverlay.classList.add("hidden");
    if (skinOverlay) skinOverlay.classList.add("hidden");
    pushEvent("area_change", { area: currentArea });
  }

  function respawnLocalPlayer() {
    const safePt = world.findSafeCoord(350, window.GameWorld.OBSTACLE_SIZE * 2.2, 0);
    localPlayer.x = safePt.x * 0.25;
    localPlayer.y = safePt.y * 0.25;
    localPlayer.vx = 0;
    localPlayer.vy = 0;
    localPlayer.angle = 0;
    localPlayer.energy = 100;
    localPlayer.alive = true;
    localPlayer.invuln = 2.2;
    localPlayer.heartMode = isHeartMode;
    localPlayer.initStarter(isHeartMode ? 2 : 1);
    world.spawnStarterRingAround(localPlayer.x, localPlayer.y);
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
      localPlayer.vx = 0;
      localPlayer.vy = 0;
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

  // Clicking SAVE in the Skin Selector saves the skin and returns to the Main Menu (Video E 00:17, Video F 08:17)
  if (skinSaveBtn) {
    skinSaveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      localPlayer.skinId = window.Skins.SKINS[selectedSkinIdx].id;
      const myColorIdx = localPlayer.getSkinColorIdx();
      for (const cell of localPlayer.cells.values()) {
        cell.colorIdx = myColorIdx;
      }
      localPlayer.rebuildSquares(true);
      window.AudioFX.playMerge(3);
      openMenu();
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
      pushEvent("mode_change", { heartMode: isHeartMode });
    });
  }

  // Functional Region Selector
  if (regionSelect) {
    regionSelect.addEventListener("change", () => {
      const reg = regionSelect.value || "eu";
      const base = currentRoomName.replace(/^(eu|na|asia)-/, "");
      currentRoomName = `${reg}-${base}`;
      if (net && net.switchRoom) {
        net.switchRoom(currentRoomName, localPlayer.name);
      }
      try {
        const u = new URL(location.href);
        u.searchParams.set("room", currentRoomName);
        history.replaceState(null, "", u.toString());
      } catch {}
      if (partyCodeBadge) {
        partyCodeBadge.textContent = `Region: ${reg.toUpperCase()} (${currentRoomName})`;
        partyCodeBadge.classList.remove("hidden");
      }
      pushEvent("region_change", { region: reg, room: currentRoomName });
    });
  }

  // Functional Party Create & Join
  if (partyCreateBtn && partyCodeBadge) {
    partyCreateBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const code = "PARTY-" + Math.random().toString(36).slice(2, 6).toUpperCase();
      currentRoomName = code;
      if (partyCodeInput) partyCodeInput.value = code;
      if (net && net.switchRoom) {
        net.switchRoom(code, localPlayer.name);
      }
      try {
        const u = new URL(location.href);
        u.searchParams.set("room", code);
        history.replaceState(null, "", u.toString());
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(u.toString()).catch(() => {});
        }
      } catch {}
      partyCodeBadge.textContent = `Room: ${code} (Copied!)`;
      partyCodeBadge.classList.remove("hidden");
      pushEvent("party_create", { code, room: currentRoomName });
    });
  }

  if (partyJoinBtn && partyCodeBadge) {
    partyJoinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const entered = partyCodeInput && partyCodeInput.value.trim()
        ? partyCodeInput.value.trim().toUpperCase().slice(0, 24)
        : currentRoomName;
      currentRoomName = entered;
      if (partyCodeInput) partyCodeInput.value = entered;
      if (net && net.switchRoom) {
        net.switchRoom(entered, localPlayer.name);
      }
      try {
        const u = new URL(location.href);
        u.searchParams.set("room", entered);
        history.replaceState(null, "", u.toString());
      } catch {}
      partyCodeBadge.textContent = `Joined Room: ${entered}`;
      partyCodeBadge.classList.remove("hidden");
      pushEvent("party_join", { room: entered });
    });
  }

  // Clicking anywhere on the canvas enters play immediately!
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
    if (document.activeElement === nameInput || document.activeElement === partyCodeInput) {
      if (e.key === "Enter") {
        if (document.activeElement === partyCodeInput && partyJoinBtn) {
          partyJoinBtn.click();
          partyCodeInput.blur();
        } else {
          nameInput.blur();
          closeMenuAndPlay();
        }
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
        return;
      }
    } else if (e.code === "KeyW" || e.code === "Space") {
      // Latch & fire immediately so quick sub-frame taps on W / Space never get dropped
      pendingEject = true;
      tryEjectBlock();
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
      if (currentArea === "arena" || currentArea === "arena_dark") {
        currentArea = isDarkTheme ? "arena_dark" : "arena";
      }
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
    if (currentArea !== "arena" && currentArea !== "arena_dark") return;
    pendingEject = false;
    const res = localPlayer.ejectToward(mouse.worldX, mouse.worldY);
    if (res) {
      ejectCooldown = 0.11;
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

  // Compute Leaderboard & Rank (including each entry's skinId so rows match player colors)
  function computeLeaderboard() {
    const list = [];
    if (localPlayer.alive) {
      list.push({
        id: localPlayer.id,
        name: localPlayer.name,
        score: localPlayer.score,
        skinId: localPlayer.skinId
      });
    }
    for (const bot of world.bots) {
      if (bot.alive) {
        list.push({
          id: bot.id,
          name: bot.name,
          score: bot.score,
          skinId: bot.skinId
        });
      }
    }
    for (const rp of net.players.values()) {
      if (rp.s && rp.s.al) {
        list.push({
          id: rp.id,
          name: rp.s.n || rp.name || "Player",
          score: rp.s.sc || 1,
          skinId: rp.s.sk || "gem_cyan"
        });
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

    const inOverlayMenu = currentArea === "menu" || currentArea === "skin_selector";

    if (inOverlayMenu) {
      // Pause local player movement and protect from hits while Menu or Skin Selector is open
      localPlayer.vx = 0;
      localPlayer.vy = 0;
      localPlayer.spinning = false;
      localPlayer.invuln = Math.max(localPlayer.invuln, 0.5);
    } else {
      const coreWorld = localPlayer.getCoreWorldCenter();

      // Update world cursor target from mouse or keyboard directional fallback
      let dirY = 0;
      if (keys.has("ArrowUp")) dirY -= 1;
      if (keys.has("ArrowDown")) dirY += 1;

      if (dirY !== 0) {
        mouse.worldX = coreWorld.wx + Math.cos(localPlayer.angle) * 220;
        mouse.worldY = coreWorld.wy + dirY * 220;
      } else if (mouse.hasMoved) {
        mouse.worldX = camera.x + (mouse.screenX - camera.width * 0.5) / camera.zoom;
        mouse.worldY = camera.y + (mouse.screenY - camera.height * 0.5) / camera.zoom;
      } else {
        const t = performance.now() * 0.00075;
        mouse.worldX = coreWorld.wx + Math.cos(t) * 180;
        mouse.worldY = coreWorld.wy + Math.sin(t) * 180;
      }

      const rotLeft = keys.has("KeyA") || keys.has("ArrowLeft");
      const rotRight = keys.has("KeyD") || keys.has("ArrowRight");
      const wantsEject = pendingEject || keys.has("KeyW") || keys.has("Space");

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

      // Slow score decay for giant clusters (> 85 blocks) to prevent passive camping without dropping re-collectible blocks (Rule 22, Video D 12:48)
      if (localPlayer.alive && localPlayer.score > 85) {
        decayTimer += dt;
        if (decayTimer >= 1.2) {
          decayTimer = 0;
          const d = localPlayer.detachOuterUnmerged();
          if (d) {
            const pal = window.Skins.getPalette(d.colorIdx);
            world.addParticles(d.wx, d.wy, pal.top, 4, 80);
            pushEvent("score_change", { score: localPlayer.score, reason: "decay" });
          }
        }
      }
    }

    // Update World (Stray blocks, Obstacles, Giant Food Gems, AI Rivals, PvP Combat)
    world.update(
      dt,
      localPlayer,
      {
        onLocalPickup(res, wx, wy, colorIdx) {
          pickupCombo++;
          pickupComboTimer = 1.4;
          const pal = window.Skins.getPalette(colorIdx);
          world.addParticles(wx, wy, pal.top, 5, 130);

          if (res.maxMergedNew >= 2) {
            window.AudioFX.playMerge(res.maxMergedNew);
            const cw = localPlayer.getCoreWorldCenter();
            world.addFloatText(
              cw.wx,
              cw.wy - localPlayer.radius * 0.5 - 16,
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
      },
      net
    );

    // Update Smooth Dynamic Zoom Camera centered on Player's Core Block (Rule 13)
    if (localPlayer.alive && localPlayer.squares.length > 0) {
      const coreBounds = localPlayer.getCoreWorldCenter();
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

    // Host broadcasts shared AI bot state so all multiplayer clients share identical bots & leaderboard
    if (net.online && net.isHost && net.players.size > 0) {
      hostSyncTimer += dt;
      if (hostSyncTimer >= 0.14) {
        hostSyncTimer = 0;
        net.set("bots", world.serializeBots());
      }
    }
  }

  // Update live `window.State` contract every frame
  function syncWindowState(lbData) {
    const coreWorld = localPlayer.getCoreWorldCenter();
    window.State = {
      area: currentArea,
      player: {
        id: localPlayer.id,
        name: localPlayer.name,
        x: Math.round(coreWorld.wx),
        y: Math.round(coreWorld.wy),
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
        room: currentRoomName,
        darkTheme: isDarkTheme
      }
    };
  }

  // Main 60fps Fixed-Timestep Render & Simulation Loop
  let lastFrame = performance.now();
  let accumulator = 0;
  const FIXED_DT = 1 / 60;

  function stepSimulationToNow(now) {
    const frameDt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    accumulator += frameDt;

    while (accumulator >= FIXED_DT) {
      updateSimulation(FIXED_DT);
      accumulator -= FIXED_DT;
    }

    const lbData = computeLeaderboard();
    syncWindowState(lbData);
    return lbData;
  }

  function frame(now) {
    const lbData = stepSimulationToNow(now);

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
      roomName: currentRoomName,
      onlineCount: net.players.size + 1,
      allEntities
    });

    if (currentArea === "menu") {
      renderMenuBackground();
    }

    requestAnimationFrame(frame);
  }

  // Fallback timer so backgrounded/occluded multi-player tabs never freeze their simulation or network sync
  setInterval(() => {
    const now = performance.now();
    if (now - lastFrame > 65) {
      stepSimulationToNow(now);
    }
  }, 50);

  // Emit initial area event and start loop
  pushEvent("area_change", { area: currentArea });
  syncWindowState(computeLeaderboard());
  requestAnimationFrame(frame);
})();
