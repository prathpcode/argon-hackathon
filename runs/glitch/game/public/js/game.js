// Main Game Loop, Physics, Interactions, Quests, Skills & Multiplayer Sync
(function () {
  const params = new URLSearchParams(location.search);
  const playerName = (params.get("name") || "Traveler").slice(0, 22);
  const seedParam = params.get("seed") || "whim-2025";

  // Seeded PRNG (mulberry32)
  function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }
  const rng = hashSeed(seedParam);

  const startTime = performance.now();
  window.__events = window.__events || [];
  function pushEvent(type, extra = {}) {
    window.__events.push({
      t: Math.round(performance.now() - startTime),
      type,
      ...extra,
    });
  }

  // Initial Inventory (matching Footage B 00:06bottom bar: grain, watering can, red apple, blender, shovel, pickaxe, lotion, milker, pumpkin ale, cubimal, musicblock)
  const initialInventory = new Array(16).fill(null);
  initialInventory[0] = { id: "grain", count: 15 };
  initialInventory[1] = { id: "watering_can", count: 1 };
  initialInventory[2] = { id: "red_apple", count: 8 };
  initialInventory[3] = { id: "blender", count: 1 };
  initialInventory[4] = { id: "shovel", count: 1 };
  initialInventory[5] = { id: "pickaxe", count: 1 };
  initialInventory[6] = { id: "butterfly_lotion", count: 4 };
  initialInventory[7] = { id: "butterfly_milker", count: 1 };
  initialInventory[8] = { id: "pumpkin_ale", count: 2 };
  initialInventory[9] = { id: "chick_cubimal", count: 1 };
  initialInventory[10] = { id: "shrinking_potion", count: 2 };
  initialInventory[11] = { id: "embiggening_tonic", count: 2 };
  initialInventory[12] = { id: "musicblock_gng", count: 1 };
  initialInventory[13] = { id: "emblem_of_friendly", count: 1 };

  const State = {
    started: false,
    area: "chego_chase",
    score: 120, // Mirrors iMG / Experience for test contract
    health: 100, // Mirrors Mood for test contract
    homeStyle: "spooky",
    visitedStreets: ["chego_chase"],
    waitingTimer: 0,
    waitingQualified: false,
    followingId: null,
    leaderPath: [],
    visitorsLog: ["CreepyBaldishG", "stormoffara", "Artichoke"],
    favor: { Grendaline: 10, Humbaba: 10, Lem: 10, Zille: 10, Mab: 10, Alph: 10, Friendly: 15 },
    learnedSkills: [],
    activeSkill: {
      id: "soil_appreciation",
      finishAt: Date.now() + 45000,
    },
    questProgress: {},
    inventory: initialInventory,
    bagSlots: new Array(6).fill(null),
    placedFurniture: [],
    activeCubimals: [],
    particles: [],
    floats: [],
    chatLogs: [],
    hoveredObj: null,
    actionMenu: null,
    camera: { x: 0, y: 0, vw: 920, vh: 560, shake: 0 },
    player: {
      id: 0,
      name: playerName,
      x: 520,
      y: 590,
      vx: 0,
      vy: 0,
      dir: 1,
      anim: "idle",
      animUntil: 0,
      scale: 1,
      scaleUntil: 0,
      squashX: 1,
      squashY: 1,
      grounded: true,
      coyoteTimer: 0,
      jumpBuffer: 0,
      onLadder: false,
      mood: 100,
      maxMood: 100,
      energy: 112,
      maxEnergy: 120,
      img: 120,
      level: 3,
      currants: 1447,
      dailySign: "o/",
      look: window.AvatarRenderer.defaultLook(
        playerName.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
      ),
      bubble: null,
    },
  };

  window.State = State;

  // Input Tracking
  const keys = new Set();
  let canvas = null;
  let ctx = null;
  let mouseWorld = { x: 0, y: 0, screenX: 0, screenY: 0 };

  const Game = {
    init() {
      canvas = document.getElementById("street-canvas");
      ctx = canvas.getContext("2d");

      this.resizeCanvas();
      window.addEventListener("resize", () => this.resizeCanvas());

      window.UI.init();
      window.UI.renderInventory();
      window.UI.updateHUD();

      // Initial Activity Feed Welcome
      window.UI.logActivity(
        `Welcome to <strong>Chego Chase</strong> in <strong>Andra</strong>! Jump through floating Quoins, click glowing objects, or walk past wooden signposts to explore.`,
        "system"
      );

      // Dismiss Title Splash on any key or click (Rule: Play starts within seconds)
      const startOverlay = document.getElementById("title-splash-overlay");
      const enterPlay = () => {
        if (State.started) return;
        State.started = true;
        startOverlay?.classList.add("hidden");
        window.AudioEngine.init();
        window.AudioEngine.playPop();
        window.AudioEngine.setTheme(window.GameData.STREETS[State.area].theme);
        pushEvent("game_start", { area: State.area, name: State.player.name });
      };
      startOverlay?.addEventListener("click", enterPlay);

      window.addEventListener("keydown", (e) => {
        if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
          return;
        }
        if (!State.started) enterPlay();

        keys.add(e.code);
        if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
          e.preventDefault();
          State.player.jumpBuffer = 0.14;
        }
        if (e.code === "KeyE" || e.code === "Enter") {
          const menu = document.getElementById("world-action-menu");
          if (menu && !menu.classList.contains("hidden")) {
            const firstBtn = menu.querySelector(".wa-btn:not(.disabled)");
            if (firstBtn) {
              firstBtn.click();
              return;
            }
          }
          this.interactNearest();
        }
        if (e.code === "KeyM") {
          window.UI.openModal("map");
        }
        if (e.code === "KeyK") {
          window.UI.openModal("skills");
        }
        if (e.code === "KeyQ") {
          window.UI.openModal("quests");
        }
        if (e.code === "KeyH") {
          this.sendChatMessage("o/", "local");
        }
      });

      window.addEventListener("keyup", (e) => {
        keys.delete(e.code);
      });

      // Canvas Mouse Hover & Click
      canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const sy = (e.clientY - rect.top) * (canvas.height / rect.height);
        mouseWorld.screenX = e.clientX;
        mouseWorld.screenY = e.clientY;
        mouseWorld.x = sx + State.camera.x;
        mouseWorld.y = sy + State.camera.y;
        this.updateHoveredObject();
      });

      canvas.addEventListener("click", (e) => {
        if (!State.started) {
          enterPlay();
          return;
        }
        window.AudioEngine.init();
        const rect = canvas.getBoundingClientRect();
        const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const sy = (e.clientY - rect.top) * (canvas.height / rect.height);
        mouseWorld.screenX = e.clientX;
        mouseWorld.screenY = e.clientY;
        mouseWorld.x = sx + State.camera.x;
        mouseWorld.y = sy + State.camera.y;
        this.updateHoveredObject();

        if (State.hoveredObj) {
          window.AudioEngine.playClick();
          this.onObjectClicked(State.hoveredObj, e.clientX, e.clientY);
        }
      });

      // Connect Multiplayer via Net
      this.initMultiplayer();

      // Start Fixed-Timestep 60Hz Loop
      let last = performance.now();
      let acc = 0;
      const dt = 1 / 60;
      const frame = (now) => {
        const elapsed = Math.min(0.1, (now - last) / 1000);
        last = now;
        acc += elapsed;
        while (acc >= dt) {
          this.update(dt, now / 1000);
          acc -= dt;
        }
        this.render(now / 1000);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },

    resizeCanvas() {
      if (!canvas) return;
      const wrap = canvas.parentElement;
      if (!wrap) return;
      canvas.width = Math.max(480, wrap.clientWidth);
      canvas.height = Math.max(320, wrap.clientHeight);
      State.camera.vw = canvas.width;
      State.camera.vh = canvas.height;
    },

    initMultiplayer() {
      if (!window.Net) return;
      const net = window.Net.connect({
        name: State.player.name,
        onWelcome: (n) => {
          State.player.id = n.me;
          if (n.me && n.me > 1 && Math.abs(State.player.x - 520) < 5) {
            State.player.x = 520 + ((n.me - 1) % 4) * 62;
          }
          if (n.shared && typeof n.shared.towerProgress === "number") {
            const tower = window.GameData.STREETS.beaus_home.entities.find((e) => e.id === "tower_project_home");
            if (tower) tower.progress = n.shared.towerProgress;
          }
          if (n.shared && n.shared.homeStyle) {
            State.homeStyle = n.shared.homeStyle;
          }
        },
        onJoin: (p) => {
          pushEvent("player_join", { id: p.id, name: p.name });
          if (!State.visitorsLog.includes(p.name)) State.visitorsLog.push(p.name);
          window.UI.logActivity(`<strong>${p.name}</strong> arrived in the world! (Say <em>o/</em> to greet)`, "system");
        },
        onLeave: (p) => {
          pushEvent("player_leave", { id: p.id, name: p.name });
          if (State.followingId === p.id) State.followingId = null;
          window.UI.logActivity(`<strong>${p.name || "A neighbor"}</strong> departed. Butler Roy waves "bye!"`, "system");
        },
        onSet: (key, value) => {
          if (key === "towerProgress") {
            const tower = window.GameData.STREETS.beaus_home.entities.find((e) => e.id === "tower_project_home");
            if (tower) tower.progress = value;
          } else if (key === "homeStyle") {
            State.homeStyle = value;
          }
        },
        onMsg: (m) => {
          this.handleNetworkMessage(m);
        },
      });
      window.net = net;
    },

    handleNetworkMessage(m) {
      const sender = window.net?.players.get(m.from);
      const senderName = sender?.name || m.name || `Player ${m.from}`;

      if (m.t === "chat") {
        window.UI.logActivity(`<strong>${senderName}:</strong> ${this.escapeHtml(m.text)}`, m.channel || "local");
        if (sender && sender.s) {
          sender.s.bubble = { text: m.text, until: performance.now() + 4500 };
        }
        pushEvent("chat_received", { from: m.from, text: m.text });

        // Check Daily Sign Match (Rule 39: 'o/', 'hi', 'bye')
        const norm = String(m.text).trim().toLowerCase();
        if (["o/", "hi", "hey", "bye", "wave"].includes(norm)) {
          this.changeMood(10);
          this.spawnFloat(State.player.x, State.player.y - 95, "2x / +10 mood! Sign Match!", "#6EEB83");
          window.AudioEngine.playSuccess();
          this.advanceQuestStep("social_act", 1);
        }
      } else if (m.t === "social") {
        if (m.kind === "highfive") {
          this.changeMood(8);
          this.spawnFloat(State.player.x, State.player.y - 95, `High-five from ${senderName}! +8 Mood`, "#6EEB83");
          window.AudioEngine.playSuccess();
        } else if (m.kind === "hug") {
          this.changeMood(10);
          this.spawnFloat(State.player.x, State.player.y - 95, `${senderName} hugged you! +10 Mood`, "#F598B6");
          window.AudioEngine.playPop();
        } else if (m.kind === "thriller") {
          // Group synchronized zombie dance (Rule 2)
          State.player.anim = "thriller";
          State.player.animUntil = performance.now() + 7000;
          window.AudioEngine.thrillerActive = true;
          setTimeout(() => {
            window.AudioEngine.thrillerActive = false;
          }, 7000);
          this.spawnFloat(State.player.x, State.player.y - 95, "Thriller Zombie Dance!", "#E87A24");
        } else if (m.kind === "follow_req" && m.targetId === State.player.id) {
          window.UI.showBanner(`${senderName} joined your Conga Line!`, 3500);
        } else if (m.kind === "give_item" && m.targetId === State.player.id) {
          this.addItemToInventory(m.itemId, 1);
          window.UI.logActivity(`<strong>${senderName}</strong> gave you a <strong>${m.itemName}</strong>!`, "local");
        }
      } else if (m.t === "cubimal_race") {
        State.activeCubimals.push({
          street: m.area,
          x: m.x,
          y: m.y,
          dir: m.dir || -1,
          color: m.color,
          owner: senderName,
          name: m.cubName,
          distPlanks: m.distPlanks,
          until: performance.now() + 2600,
        });
      }
    },

    update(dt, timeSec) {
      const p = State.player;
      const street = window.GameData.STREETS[State.area];
      if (!street) return;

      // 1. Scale potion expiration
      if (p.scaleUntil && performance.now() > p.scaleUntil) {
        p.scale = 1;
        p.scaleUntil = 0;
      }

      // 2. Skill real-time countdown completion (Rule 28)
      if (State.activeSkill && Date.now() >= State.activeSkill.finishAt) {
        const sk = window.GameData.SKILLS.find((s) => s.id === State.activeSkill.id);
        State.learnedSkills.push(State.activeSkill.id);
        State.activeSkill = null;
        if (sk) {
          this.gainImg(sk.rewardImg, `Skill Learned: ${sk.name}!`);
          window.AudioEngine.playSuccess();
          window.UI.showBanner(`Skill Learned: ${sk.name}! (+${sk.rewardImg} iMG)`, 4500);
          window.UI.logActivity(`You finished learning <strong>${sk.name}</strong> and earned <strong>+${sk.rewardImg} iMG</strong>!`, "system");
          pushEvent("skill_learned", { skill: sk.id });
        }
      }

      // 3. Conga Line Following (Rule 38)
      let moveDir = 0;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) moveDir -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) moveDir += 1;

      if (moveDir !== 0 || keys.has("Space")) {
        State.followingId = null; // Manual input breaks conga follow
      } else if (State.followingId && window.net?.players.has(State.followingId)) {
        const leader = window.net.players.get(State.followingId);
        if (leader?.s && leader.s.area === State.area) {
          const dx = leader.s.x - p.x;
          if (Math.abs(dx) > 52) {
            moveDir = dx > 0 ? 1 : -1;
          }
          if (leader.s.y < p.y - 35 && p.grounded) {
            p.jumpBuffer = 0.12;
          }
        }
      }

      // 4. Horizontal Acceleration & Friction
      const maxSpeed = 290;
      const accel = p.grounded ? 1950 : 1250;
      const friction = p.grounded ? 1700 : 400;

      if (moveDir !== 0) {
        p.vx += moveDir * accel * dt;
        p.vx = Math.max(-maxSpeed, Math.min(maxSpeed, p.vx));
        p.dir = moveDir;
      } else {
        if (Math.abs(p.vx) <= friction * dt) {
          p.vx = 0;
        } else {
          p.vx -= Math.sign(p.vx) * friction * dt;
        }
      }

      // 5. Ladder Climbing Check (Rule 2)
      const nearLadder = (street.ladders || []).find(
        (l) => Math.abs(p.x - l.x) < 24 && p.y >= l.y1 - 10 && p.y <= l.y2 + 12
      );
      if (nearLadder && (keys.has("ArrowUp") || keys.has("KeyW") || keys.has("ArrowDown") || keys.has("KeyS"))) {
        p.onLadder = true;
      } else if (!nearLadder) {
        p.onLadder = false;
      }

      if (p.onLadder && nearLadder) {
        p.vy = 0;
        p.grounded = true;
        if (keys.has("ArrowUp") || keys.has("KeyW")) p.y -= 170 * dt;
        if (keys.has("ArrowDown") || keys.has("KeyS")) p.y += 170 * dt;
        p.y = Math.max(nearLadder.y1, Math.min(nearLadder.y2, p.y));
      } else {
        // 6. Coyote Time & Jump Buffering (Rule 3)
        if (p.grounded) {
          p.coyoteTimer = 0.11;
        } else {
          p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
        }
        p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);

        if (p.jumpBuffer > 0 && p.coyoteTimer > 0) {
          p.vy = -590;
          p.grounded = false;
          p.coyoteTimer = 0;
          p.jumpBuffer = 0;
          p.squashX = 0.82;
          p.squashY = 1.22;
          window.AudioEngine.playJump();
        }

        // Gravity
        const prevY = p.y;
        p.vy += 1380 * dt;
        p.y += p.vy * dt;

        // Platform Landing Collisions (one-way top ledges & roofs)
        p.grounded = false;
        const dropDown = keys.has("ArrowDown") || keys.has("KeyS");
        if (p.vy >= 0 && !dropDown) {
          for (const plat of street.platforms) {
            if (
              p.x >= plat.x - 14 &&
              p.x <= plat.x + plat.w + 14 &&
              prevY <= plat.y + 8 &&
              p.y >= plat.y
            ) {
              p.y = plat.y;
              if (p.vy > 180) {
                p.squashX = 1.18;
                p.squashY = 0.84;
                window.AudioEngine.playLand();
              }
              p.vy = 0;
              p.grounded = true;
              break;
            }
          }
        }

        // Main Street Ground Plane
        if (p.y >= street.groundY) {
          if (p.vy > 220) {
            p.squashX = 1.2;
            p.squashY = 0.82;
            window.AudioEngine.playLand();
          }
          p.y = street.groundY;
          p.vy = 0;
          p.grounded = true;
        }
      }

      // Apply horizontal movement & boundary clamp
      p.x += p.vx * dt;
      p.x = Math.max(36, Math.min(street.width - 36, p.x));

      // Recover Squash & Stretch smoothly
      p.squashX += (1 - p.squashX) * 12 * dt;
      p.squashY += (1 - p.squashY) * 12 * dt;

      // Determine Animation State (Rule 2)
      if (performance.now() < p.animUntil) {
        // Keep active tool / thriller animation
      } else if (p.onLadder) {
        p.anim = "climb";
      } else if (!p.grounded) {
        p.anim = p.vy < 0 ? "jump" : "fall";
      } else if (Math.abs(p.vx) > 18) {
        p.anim = "walk";
        window.AudioEngine.playStep();
      } else {
        p.anim = "idle";
      }

      // 7. Signpost Boundary Walk-Past Street Transition (Rule 8)
      if (p.x <= 46) {
        const leftSign = street.signposts.find((s) => s.dir === "left");
        if (leftSign && leftSign.signs[0]) {
          this.transitionToStreet(leftSign.signs[0].target, leftSign.signs[0].spawnX);
          return;
        }
      } else if (p.x >= street.width - 46) {
        const rightSign = street.signposts.find((s) => s.dir === "right");
        if (rightSign && rightSign.signs[0]) {
          this.transitionToStreet(rightSign.signs[0].target, rightSign.signs[0].spawnX);
          return;
        }
      }

      // 8. Floating Quoin Collection (Rule 22)
      for (const q of street.quoins) {
        if (q.collectedUntil && q.collectedUntil > performance.now()) continue;
        const dx = p.x - q.x;
        const dy = (p.y - 42 * p.scale) - q.y;
        if (Math.hypot(dx, dy) < 42 * p.scale) {
          q.collectedUntil = performance.now() + 14000;
          this.onCollectQuoin(q);
        }
      }

      // 9. Update Wandering Creatures & Bureaucrats (Rules 15 & 17)
      for (const ent of street.entities) {
        if (["chicken", "piggy", "bureaucrat"].includes(ent.type) && ent.minX && ent.maxX) {
          if (typeof ent.vx !== "number") ent.vx = ent.type === "piggy" ? 28 : 42;
          ent.x += ent.vx * dt;
          if (ent.x < ent.minX) {
            ent.x = ent.minX;
            ent.vx = Math.abs(ent.vx);
          } else if (ent.x > ent.maxX) {
            ent.x = ent.maxX;
            ent.vx = -Math.abs(ent.vx);
          }
        } else if (ent.type === "butterfly" && ent.minX && ent.maxX) {
          if (typeof ent.vx !== "number") ent.vx = 52;
          ent.x += ent.vx * dt;
          ent.y = (ent.baseY || 430) + Math.sin(timeSec * 2.6 + ent.x * 0.02) * 22;
          if (ent.x < ent.minX) ent.vx = Math.abs(ent.vx);
          if (ent.x > ent.maxX) ent.vx = -Math.abs(ent.vx);
        }
      }

      // 10. Active Racing Cubimals Update (Rule 16)
      for (let i = State.activeCubimals.length - 1; i >= 0; i--) {
        const cub = State.activeCubimals[i];
        cub.x += cub.dir * 135 * dt;
        if (performance.now() > cub.until) {
          this.spawnParticles(cub.x, cub.y - 10, "#FFFFFF", 10);
          const msg = `${cub.owner}'s ${cub.name} went ${cub.distPlanks} planks before stopping.`;
          window.UI.showBanner(msg, 4000);
          window.UI.logActivity(msg, "local");
          State.activeCubimals.splice(i, 1);
        }
      }

      // 11. 15-Second Bureaucratic Hall Waiting Area Timer (Rule 17 & Footage B 04:45)
      if (State.area === "bureaucratic_hall" && !State.waitingQualified) {
        const inWaitingZone = p.x >= 710 && p.x <= 1070 && Math.abs(p.vx) < 8 && p.grounded;
        if (inWaitingZone) {
          State.waitingTimer += dt;
          if (State.waitingTimer >= 15) {
            State.waitingQualified = true;
            window.AudioEngine.playSuccess();
            this.spawnFloat(p.x, p.y - 95, "Waiting Complete! Talk to Magister Piksnikson!", "#6EEB83");
            window.UI.showBanner("You waited patiently for 15 seconds! Click Magister Piksnikson for your qualification.", 4500);
            this.advanceQuestStep("wait_hall", 1);
          }
        } else if (p.x >= 710 && p.x <= 1070 && Math.abs(p.vx) >= 8) {
          // Moving resets the waiting timer ("Do not move, just wait.")
          State.waitingTimer = Math.max(0, State.waitingTimer - dt * 2);
        }
      }

      // 12. Update Particles & Floating Numbers
      for (let i = State.particles.length - 1; i >= 0; i--) {
        const pt = State.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 320 * dt;
        pt.life -= dt;
        if (pt.life <= 0) State.particles.splice(i, 1);
      }
      for (let i = State.floats.length - 1; i >= 0; i--) {
        const fl = State.floats[i];
        fl.y -= 32 * dt;
        fl.life -= dt;
        if (fl.life <= 0) State.floats.splice(i, 1);
      }

      // 13. Smooth Camera Tracking with Look-Ahead (Rule 5)
      const targetCamX = Math.max(
        0,
        Math.min(street.width - State.camera.vw, p.x + p.dir * 65 - State.camera.vw * 0.5)
      );
      const targetCamY = Math.max(
        0,
        Math.min(street.height - State.camera.vh, p.y - State.camera.vh * 0.72)
      );
      State.camera.x += (targetCamX - State.camera.x) * 8 * dt;
      State.camera.y += (targetCamY - State.camera.y) * 8 * dt;

      if (State.camera.shake > 0) {
        State.camera.shake = Math.max(0, State.camera.shake - dt * 25);
      }

      // Sync Contract Values & Network State
      State.score = Math.round(p.img);
      State.health = Math.round(p.mood);

      if (window.net) {
        window.net.state({
          name: p.name,
          area: State.area,
          x: Math.round(p.x),
          y: Math.round(p.y),
          dir: p.dir,
          anim: p.anim,
          scale: p.scale,
          look: p.look,
          bubble: p.bubble,
        });
      }

      window.UI.updateHUD();
    },

    render(timeSec) {
      if (!ctx) return;
      const street = window.GameData.STREETS[State.area];
      if (!street) return;

      ctx.save();
      if (State.camera.shake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * State.camera.shake,
          (Math.random() - 0.5) * State.camera.shake
        );
      }
      window.WorldRenderer.drawStreet(ctx, street, State.camera, State, timeSec);
      ctx.restore();
    },

    onCollectQuoin(q) {
      const p = State.player;
      window.AudioEngine.playQuoin(q.type);
      this.spawnParticles(q.x, q.y, "#B47AEA", 14);

      if (q.type === "img") {
        this.gainImg(q.value, `+${q.value} iMG`);
      } else if (q.type === "mood") {
        this.changeMood(q.value);
        this.spawnFloat(q.x, q.y - 12, `+${q.value} Mood`, "#6EEB83");
      } else if (q.type === "currants") {
        p.currants += q.value;
        this.spawnFloat(q.x, q.y - 12, `+${q.value} Currants`, "#5CE1E6");
      } else if (q.type === "energy") {
        this.changeEnergy(q.value);
        this.spawnFloat(q.x, q.y - 12, `+${q.value} Energy`, "#FFD154");
      } else if (q.type === "qurazy") {
        this.gainImg(q.value, `Qurazy Quoin! +${q.value} iMG`);
        this.changeMood(15);
      }

      this.advanceQuestStep("collect_quoin", 1);
      pushEvent("pickup", { kind: "quoin", quoinType: q.type, value: q.value });
    },

    gainImg(amount, label = null) {
      const p = State.player;
      // High Mood multiplier (Rule 27)
      const mult = p.mood >= 80 ? 1.5 : 1.0;
      const finalAmt = Math.round(amount * mult);
      p.img += finalAmt;
      State.score = p.img;

      const newLevel = Math.max(3, Math.floor(p.img / 150) + 2);
      if (newLevel > p.level) {
        p.level = newLevel;
        window.AudioEngine.playSuccess();
        this.spawnFloat(p.x, p.y - 115, `Level Up! Level ${p.level}`, "#FFD154");
        pushEvent("level_up", { level: p.level });
      } else if (label) {
        this.spawnFloat(p.x, p.y - 90, label, "#D6A8FF");
      }
    },

    changeMood(delta) {
      const p = State.player;
      p.mood = Math.max(0, Math.min(p.maxMood, p.mood + delta));
      State.health = p.mood;
    },

    changeEnergy(delta) {
      const p = State.player;
      p.energy = Math.max(0, Math.min(p.maxEnergy, p.energy + delta));
    },

    spawnParticles(x, y, color, count = 10) {
      for (let i = 0; i < count; i++) {
        const ang = rng() * Math.PI * 2;
        const spd = 40 + rng() * 140;
        State.particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 60,
          size: 3 + rng() * 4,
          color,
          life: 0.45 + rng() * 0.35,
          maxLife: 0.8,
        });
      }
    },

    spawnFloat(x, y, text, color = "#FFFFFF") {
      State.floats.push({
        x,
        y,
        text,
        color,
        life: 1.35,
        maxLife: 1.35,
      });
    },

    updateHoveredObject() {
      const street = window.GameData.STREETS[State.area];
      if (!street) return;
      const mx = mouseWorld.x;
      const my = mouseWorld.y;

      let best = null;
      let bestDist = 78;

      // Check entities
      for (const ent of street.entities) {
        const ey = ent.y - 45;
        const d = Math.hypot(mx - ent.x, my - ey);
        if (d < bestDist) {
          bestDist = d;
          best = { ...ent, kind: "entity", topY: ent.y - 95, label: ent.name };
        }
      }

      // Check doors
      for (const door of street.doors) {
        if (Math.abs(mx - door.x) < door.w * 0.55 && my <= door.y && my >= door.y - door.h) {
          best = { ...door, kind: "door", topY: door.y - door.h - 10, label: `Enter ${door.name}` };
        }
      }

      // Check signposts
      for (const sp of street.signposts) {
        if (Math.abs(mx - sp.x) < 75 && my <= sp.y && my >= sp.y - 125) {
          best = {
            ...sp,
            kind: "signpost",
            topY: sp.y - 125,
            label: sp.signs.map((s) => s.label).join(" / "),
          };
        }
      }

      // Check other players on same street (Rule 37)
      if (window.net && window.net.players) {
        for (const [, rp] of window.net.players) {
          if (rp.s && rp.s.area === street.id) {
            const d = Math.hypot(mx - rp.s.x, my - (rp.s.y - 45));
            if (d < 55) {
              best = {
                id: `player_${rp.id}`,
                playerId: rp.id,
                name: rp.name || rp.s.name || `Player ${rp.id}`,
                x: rp.s.x,
                y: rp.s.y,
                topY: rp.s.y - 95,
                kind: "remote_player",
                label: `${rp.name || "Neighbor"} (Click for Social)`,
              };
            }
          }
        }
      }

      State.hoveredObj = best;
      if (canvas) {
        canvas.style.cursor = best ? "pointer" : "default";
      }
    },

    interactNearest() {
      const street = window.GameData.STREETS[State.area];
      if (!street) return;
      const p = State.player;

      // Find closest entity, door, or signpost within 110px
      let closest = null;
      let minDist = 115;

      for (const ent of street.entities) {
        const d = Math.hypot(p.x - ent.x, p.y - ent.y);
        if (d < minDist) {
          minDist = d;
          closest = { ...ent, kind: "entity" };
        }
      }
      for (const door of street.doors) {
        const d = Math.hypot(p.x - door.x, p.y - door.y);
        if (d < minDist) {
          minDist = d;
          closest = { ...door, kind: "door" };
        }
      }

      if (closest) {
        const rect = canvas.getBoundingClientRect();
        const sx = rect.left + (closest.x - State.camera.x);
        const sy = rect.top + (closest.y - 70 - State.camera.y);
        this.onObjectClicked(closest, sx, sy);
      }
    },

    onObjectClicked(obj, screenX, screenY) {
      if (obj.kind === "door") {
        this.transitionToStreet(obj.target, obj.spawnX);
        return;
      }
      if (obj.kind === "signpost") {
        const actions = obj.signs.map((s) => ({
          label: `Travel to ${s.label}`,
          fn: () => this.transitionToStreet(s.target, s.spawnX),
        }));
        window.UI.openWorldActionMenu(
          { title: "Wooden Signpost", subtitle: "Choose a destination street:", actions },
          screenX,
          screenY
        );
        return;
      }
      if (obj.kind === "remote_player") {
        this.openRemotePlayerMenu(obj, screenX, screenY);
        return;
      }

      // Entity Interaction Menus (matching Footage A 08:25, B 03:50, B 05:49)
      const ent = window.GameData.STREETS[State.area].entities.find((e) => e.id === obj.id) || obj;

      if (ent.type === "beryl_rock") {
        window.UI.openWorldActionMenu(
          {
            title: "Beryl Rock",
            subtitle: `This rock has ${Math.max(0, ent.health ?? 100)}% left`,
            lore: "you're the best",
            actions: [
              {
                label: "Mine / Help mine",
                cost: 7,
                disabled: (ent.health ?? 100) <= 0,
                fn: () => this.mineBerylRock(ent),
              },
              {
                label: "Talk to Rock",
                fn: () => {
                  this.changeMood(5);
                  this.spawnFloat(ent.x, ent.y - 80, "+5 Mood! The Beryl hums!", "#5CE1E6");
                },
              },
            ],
          },
          screenX,
          screenY
        );
      } else if (ent.type === "dirt_pile") {
        window.UI.openWorldActionMenu(
          {
            title: "Dirt Pile",
            subtitle: "Rich loamy earth ready for a Shovel.",
            actions: [
              {
                label: "Dig (Solo or Co-op)",
                cost: 5,
                fn: () => this.digDirtPile(ent),
              },
            ],
          },
          screenX,
          screenY
        );
      } else if (ent.type === "fruit_tree" || ent.type === "wood_tree" || ent.type === "gas_plant") {
        const harvestName =
          ent.type === "fruit_tree" ? "Harvest Cherries" : ent.type === "wood_tree" ? "Harvest Planks" : "Harvest Gas Pods";
        window.UI.openWorldActionMenu(
          {
            title: ent.name,
            subtitle: `${ent.harvestLeft ?? 4} harvests remaining today`,
            actions: [
              { label: harvestName, cost: 4, fn: () => this.harvestPlant(ent) },
              { label: "Water", cost: 2, fn: () => this.waterPlant(ent) },
              { label: "Pet", fn: () => this.petPlant(ent) },
            ],
          },
          screenX,
          screenY
        );
      } else if (ent.type === "chicken") {
        window.UI.openWorldActionMenu(
          {
            title: "Wandering Chicken",
            subtitle: "A plump, cheerful hen.",
            actions: [
              {
                label: "Squeeze (+Mood & Grain)",
                fn: () => {
                  window.AudioEngine.playSqueeze();
                  this.changeMood(8);
                  this.addItemToInventory("grain", 3);
                  this. gainImg(6, "+6 iMG & +3 Grain!");
                  this.spawnParticles(ent.x, ent.y - 16, "#FFFFFF", 12);
                  this.advanceQuestStep("animal_care", 1);
                  pushEvent("item_use", { action: "squeeze_chicken" });
                },
              },
            ],
          },
          screenX,
          screenY
        );
      } else if (ent.type === "piggy") {
        window.UI.openWorldActionMenu(
          {
            title: "Plump Piggy",
            subtitle: "Loves tummy rubs and crunchy Grain.",
            actions: [
              {
                label: "Pet (+6 Mood)",
                fn: () => {
                  window.AudioEngine.playPop();
                  this.changeMood(6);
                  this.gainImg(5, "+5 iMG & +6 Mood!");
                  this.advanceQuestStep("animal_care", 1);
                },
              },
              {
                label: "Feed Grain (Produces Plop)",
                fn: () => {
                  window.AudioEngine.playSqueeze();
                  this.addItemToInventory("piggy_plop", 1);
                  this.gainImg(10, "+1 Seed-Bearing Plop!");
                  this.advanceQuestStep("animal_care", 1);
                },
              },
            ],
          },
          screenX,
          screenY
        );
      } else if (ent.type === "butterfly") {
        window.UI.openWorldActionMenu(
          {
            title: ent.name,
            subtitle: "Fluttering gracefully in the breeze.",
            actions: [
              {
                label: "Massage with Lotion",
                fn: () => {
                  window.AudioEngine.playPop();
                  this.changeMood(10);
                  this.gainImg(8, "Butterfly Massaged! +8 iMG");
                  this.advanceQuestStep("animal_care", 1);
                },
              },
              {
                label: "Milk with Butterfly Milker",
                cost: 3,
                fn: () => {
                  window.AudioEngine.playSqueeze();
                  this.changeEnergy(-3);
                  this.addItemToInventory("butterfly_milk", 1);
                  this.gainImg(12, "+1 Butterfly Milk!");
                  this.advanceQuestStep("animal_care", 1);
                },
              },
            ],
          },
          screenX,
          screenY
        );
      } else if (ent.type === "shrine") {
        window.UI.openWorldActionMenu(
          {
            title: ent.name,
            subtitle: `Dedicated to ${ent.giant}. Current Favor: ${State.favor[ent.giant] || 10}`,
            actions: [
              {
                label: "Donate 15 Currants for Blessing",
                fn: () => {
                  if (State.player.currants < 15) {
                    window.UI.showBanner("You need 15 currants to make an offering.");
                    return;
                  }
                  State.player.currants -= 15;
                  State.favor[ent.giant] = (State.favor[ent.giant] || 10) + 15;
                  this.gainImg(22, `+15 ${ent.giant} Favor!`);
                  this.changeMood(12);
                  window.UI.showGiantVisage(ent.giant);
                  pushEvent("shrine_donate", { giant: ent.giant });
                },
              },
              {
                label: "Commune with Giant",
                fn: () => window.UI.showGiantVisage(ent.giant),
              },
            ],
          },
          screenX,
          screenY
        );
      } else if (ent.type === "vendor") {
        window.UI.openWorldActionMenu(
          {
            title: ent.name,
            subtitle: "Street Spirit Purveyor of Goods & Tools",
            actions: [
              {
                label: "Browse Buy / Sell Shop",
                fn: () => window.UI.openModal("vendor", ent),
              },
            ],
          },
          screenX,
          screenY
        );
      } else if (ent.type === "water_cooler") {
        // Footage B 03:50: "Get water from"
        window.UI.openWorldActionMenu(
          {
            title: "Water Cooler",
            subtitle: "Dispenses crisp Cups of Water (1 per backpack slot).",
            actions: [
              {
                label: "Get water from",
                fn: () => {
                  window.AudioEngine.playWater();
                  const ok = this.addItemToInventory("cup_of_water", 1);
                  if (ok) {
                    this.spawnFloat(ent.x, ent.y - 75, "+1 Cup of Water", "#8AD6F5");
                  }
                },
              },
            ],
          },
          screenX,
          screenY
        );
      } else if (ent.type === "waiting_area" || ent.type === "bureaucrat") {
        window.UI.openWorldActionMenu(
          {
            title: ent.name,
            subtitle: State.waitingQualified
              ? "Your patience has been verified by the Ministry!"
              : "Stand still in the WAITING AREA for 15 seconds (or use Fast-Track Stamp).",
            actions: [
              {
                label: "Purchase Card-Carrying Qualification (50c)",
                fn: () => {
                  if (State.player.currants < 50) {
                    window.UI.showBanner("You need 50 currants!");
                    return;
                  }
                  State.player.currants -= 50;
                  State.waitingQualified = true;
                  this.addItemToInventory("card_qualification", 1);
                  window.AudioEngine.playSuccess();
                  this.gainImg(30, "Card-Carrying Qualification Acquired!");
                  this.advanceQuestStep("wait_hall", 1);
                  this.advanceQuestStep("buy_qual", 1);
                },
              },
            ],
          },
          screenX,
          screenY
        );
      } else if (ent.type === "magic_rock") {
        window.UI.openWorldActionMenu(
          {
            title: "Magic Rock",
            subtitle: "Home Street Management & Style Customizer",
            actions: [
              { label: "Talk to Magic Rock", fn: () => window.UI.openModal("magic_rock") },
              { label: "Open Skills & Quests", fn: () => window.UI.openModal("skills") },
            ],
          },
          screenX,
          screenY
        );
      } else if (ent.type === "butler") {
        window.UI.openWorldActionMenu(
          {
            title: "Roy (Beau) — Home Butler",
            subtitle: "Records visitor traffic and manages street etiquette.",
            actions: [
              { label: "Open Butler Menu", fn: () => window.UI.openModal("butler") },
              { label: "Yahoo! (+8 Mood)", fn: () => this.butlerAction("yahoo") },
            ],
          },
          screenX,
          screenY
        );
      } else if (ent.type === "tower_project") {
        window.UI.openWorldActionMenu(
          {
            title: "Tower Construction Project",
            subtitle: `Currently ${Number(ent.progress || 11.4).toFixed(1)}% complete`,
            actions: [
              {
                label: "Contribute Materials & Labor",
                cost: 8,
                fn: () => this.contributeToTower(ent),
              },
            ],
          },
          screenX,
          screenY
        );
      } else if (ent.type === "ground_bag") {
        window.UI.openWorldActionMenu(
          {
            title: "Generic Green Bag",
            subtitle: "Give me a new home in your inventory bar!",
            actions: [
              {
                label: "Open & Equip Bag",
                fn: () => {
                  this.addItemToInventory("green_bag", 1);
                  window.UI.bagExpanded = true;
                  window.UI.renderInventory();
                  window.AudioEngine.playSuccess();
                  this.spawnFloat(ent.x, ent.y - 60, "Unlocked 6 Extra Bag Sub-Slots!", "#6EEB83");
                },
              },
            ],
          },
          screenX,
          screenY
        );
      }
    },

    openRemotePlayerMenu(obj, screenX, screenY) {
      // Rule 37 & 38: Social interaction menu & Conga line Follow
      const pid = obj.playerId;
      const pName = obj.name;
      window.UI.openWorldActionMenu(
        {
          title: pName,
          subtitle: "Neighbor in Ur",
          actions: [
            {
              label: "High five (+10 Mood)",
              fn: () => {
                this.changeMood(10);
                this.spawnFloat(State.player.x, State.player.y - 90, `High-fived ${pName}! +10 Mood`, "#6EEB83");
                window.net?.send("social", { kind: "highfive", targetId: pid });
                this.advanceQuestStep("social_act", 1);
              },
            },
            {
              label: "Hug",
              fn: () => {
                this.changeMood(10);
                this.spawnFloat(State.player.x, State.player.y - 90, `Hugged ${pName}!`, "#F598B6");
                window.net?.send("social", { kind: "hug", targetId: pid });
                this.advanceQuestStep("social_act", 1);
              },
            },
            {
              label: "Follow (Conga Line!)",
              fn: () => {
                State.followingId = pid;
                window.UI.showBanner(`Following ${pName} in a Conga Line! Move to break.`, 3500);
                window.net?.send("social", { kind: "follow_req", targetId: pid });
                this.advanceQuestStep("social_act", 1);
              },
            },
            {
              label: "Trigger Group Thriller Dance!",
              fn: () => {
                this.startThrillerDance();
                window.net?.send("social", { kind: "thriller" });
              },
            },
            {
              label: "Give Red Apple",
              fn: () => {
                window.net?.send("social", {
                  kind: "give_item",
                  targetId: pid,
                  itemId: "red_apple",
                  itemName: "Red Apple",
                });
                this.spawnFloat(State.player.x, State.player.y - 90, `Sent Red Apple to ${pName}!`, "#FFD154");
              },
            },
            {
              label: "Visit Home Street",
              fn: () => this.transitionToStreet("beaus_home", 980),
            },
          ],
        },
        screenX,
        screenY
      );
    },

    mineBerylRock(ent) {
      // Rule 20: Mining consumes -7 Energy, yields +10 iMG and +8 Chunks of Beryl, plus bonus chunks if co-op!
      const p = State.player;
      p.anim = "mine";
      p.animUntil = performance.now() + 900;
      State.camera.shake = 6;
      window.AudioEngine.playMine();

      this.changeEnergy(-7);
      ent.health = Math.max(0, (ent.health ?? 100) - 34);

      const coopCount = this.countNearbyPlayers(ent.x, 180);
      const chunks = 8 + (coopCount > 0 ? 4 : 0) + (State.learnedSkills.includes("mining_1") ? 3 : 0);
      this.addItemToInventory("beryl_chunk", chunks);
      this.gainImg(10, `-7 Energy, +10 iMG, +${chunks} Chunks of Beryl${coopCount > 0 ? " (Co-op Bonus!)" : ""}`);
      this.spawnParticles(ent.x, ent.y - 45, "#5CE1E6", 16);
      this.advanceQuestStep("mine_beryl", 1);
      if (coopCount > 0) this.advanceQuestStep("social_act", 1);

      pushEvent("item_use", { tool: "pickaxe", target: "beryl_rock", chunks });

      // Respawn rock after 18s if depleted
      if (ent.health <= 0) {
        window.UI.logActivity(`You mined the <strong>Beryl Rock</strong> down to teal rubble!`, "local");
        setTimeout(() => {
          ent.health = 100;
        }, 18000);
      }
    },

    digDirtPile(ent) {
      // Rule 21: Digging with Shovel (solo or co-op) yields Lumps of Earth
      const p = State.player;
      p.anim = "dig";
      p.animUntil = performance.now() + 850;
      State.camera.shake = 4;
      window.AudioEngine.playDig();

      this.changeEnergy(-5);
      const coopCount = this.countNearbyPlayers(ent.x, 180);
      const lumps = 3 + (coopCount > 0 ? 2 : 0) + (State.learnedSkills.includes("soil_appreciation") ? 2 : 0);
      this.addItemToInventory("lump_of_earth", lumps);
      this.gainImg(8, `+8 iMG, +${lumps} Lumps of Earth${coopCount > 0 ? " (Co-op Dig!)" : ""}`);
      this.spawnParticles(ent.x, ent.y - 12, "#7D5A3C", 14);
      this.advanceQuestStep("dig_dirt", 1);
      if (coopCount > 0) this.advanceQuestStep("social_act", 1);

      pushEvent("item_use", { tool: "shovel", target: "dirt_pile", lumps });
    },

    harvestPlant(ent) {
      window.AudioEngine.playPop();
      this.changeEnergy(-4);
      const itemMap = {
        fruit_tree: { id: "cherry", count: 4, label: "Cherries" },
        wood_tree: { id: "wood_plank", count: 4, label: "Wood Planks" },
        gas_plant: { id: "gas_pod", count: 3, label: "Gas Pods" },
      };
      const reward = itemMap[ent.type] || itemMap.fruit_tree;
      this.addItemToInventory(reward.id, reward.count);
      this.gainImg(9, `+9 iMG & +${reward.count} ${reward.label}`);
      this.spawnParticles(ent.x, ent.y - 80, "#6EEB83", 12);
    },

    waterPlant(ent) {
      const p = State.player;
      p.anim = "water";
      p.animUntil = performance.now() + 900;
      window.AudioEngine.playWater();
      this.changeEnergy(-2);
      ent.harvestLeft = 5;
      this.gainImg(7, "Watered! +7 iMG");
      this.spawnParticles(ent.x, ent.y - 75, "#8AD6F5", 14);
    },

    petPlant(ent) {
      window.AudioEngine.playPop();
      this.changeMood(6);
      this.gainImg(5, "Petted! +6 Mood, +5 iMG");
      this.spawnParticles(ent.x, ent.y - 80, "#F598B6", 10);
    },

    contributeToTower(ent) {
      // Rule 32: Multi-step Tower construction project
      window.AudioEngine.playMine();
      this.changeEnergy(-8);
      ent.progress = Math.min(100, Number((ent.progress + 8.6).toFixed(1)));
      if (window.net) {
        window.net.set("towerProgress", ent.progress);
      }
      this.gainImg(18, `Tower now ${ent.progress}% complete! +18 iMG`);
      this.spawnParticles(ent.x, ent.y - 60, "#FFD154", 16);
      this.advanceQuestStep("build_tower", 1);
    },

    countNearbyPlayers(x, radius) {
      if (!window.net || !window.net.players) return 0;
      let count = 0;
      for (const [, rp] of window.net.players) {
        if (rp.s && rp.s.area === State.area && Math.abs(rp.s.x - x) <= radius) {
          count++;
        }
      }
      return count;
    },

    addItemToInventory(itemId, count = 1) {
      // Rule 25: Stack limits & "Your bag is full!" warning
      const item = window.GameData.ITEMS[itemId];
      if (!item) return false;
      const limit = item.stackLimit || 16;

      let remaining = count;
      // First try stacking into existing slots (if limit > 1)
      if (limit > 1) {
        for (let i = 0; i < 16 && remaining > 0; i++) {
          const s = State.inventory[i];
          if (s && s.id === itemId && s.count < limit) {
            const add = Math.min(remaining, limit - s.count);
            s.count += add;
            remaining -= add;
          }
        }
      }

      // Then fill empty primary slots
      for (let i = 0; i < 16 && remaining > 0; i++) {
        if (!State.inventory[i]) {
          const add = Math.min(remaining, limit);
          State.inventory[i] = { id: itemId, count: add };
          remaining -= add;
        }
      }

      // If player owns Generic Green Bag, also check 6 bag sub-slots
      const hasBag = State.inventory.some((s) => s && s.id === "green_bag");
      if (hasBag && remaining > 0) {
        for (let i = 0; i < 6 && remaining > 0; i++) {
          if (!State.bagSlots[i]) {
            const add = Math.min(remaining, limit);
            State.bagSlots[i] = { id: itemId, count: add };
            remaining -= add;
          }
        }
      }

      window.UI.renderInventory();

      if (remaining > 0) {
        window.UI.showBanner("Your bag is full!", 3500);
        this.spawnFloat(State.player.x, State.player.y - 95, "Your bag is full!", "#FF6B6B");
        return false;
      }
      return true;
    },

    performItemAction(slot, idx, isBagSlot, action) {
      const item = window.GameData.ITEMS[slot.id];
      if (!item) return;
      const p = State.player;
      const arr = isBagSlot ? State.bagSlots : State.inventory;

      const consumeOne = () => {
        slot.count -= 1;
        if (slot.count <= 0) arr[idx] = null;
        window.UI.renderInventory();
      };

      if (["Eat", "Drink", "Taste", "Inhale"].includes(action)) {
        window.AudioEngine.playPop();
        if (item.energy) this.changeEnergy(item.energy);
        if (item.mood) this.changeMood(item.mood);

        if (slot.id === "pumpkin_ale") {
          // Rule 2 & 41: Drinking Pumpkin Ale triggers Thriller funk music & zombie dance!
          this.startThrillerDance();
          window.net?.send("social", { kind: "thriller" });
        } else if (slot.id === "shrinking_potion") {
          // Rule 4: Shrink avatar to miniature scale
          p.scale = 0.52;
          p.scaleUntil = performance.now() + 25000;
          this.spawnFloat(p.x, p.y - 80, "Shrunk to Miniature Size!", "#6EEB83");
        } else if (slot.id === "embiggening_tonic") {
          // Rule 4: Embiggen avatar to giant scale
          p.scale = 1.65;
          p.scaleUntil = performance.now() + 25000;
          this.spawnFloat(p.x, p.y - 110, "Embiggened to Giant Size!", "#B47AEA");
        } else {
          this.spawnFloat(
            p.x,
            p.y - 90,
            `${item.energy ? `+${item.energy} Energy ` : ""}${item.mood ? `+${item.mood} Mood` : ""}`,
            "#6EEB83"
          );
        }
        consumeOne();
        pushEvent("item_use", { item: slot.id, action });
      } else if (action === "Blend") {
        window.AudioEngine.playSuccess();
        consumeOne();
        this.addItemToInventory("savory_smoothie", 1);
        this.gainImg(12, "Blended Savory Smoothie! +12 iMG");
      } else if (action === "Release") {
        // Rule 16: Release Cubimal to race across the ground in planks!
        window.AudioEngine.playPop();
        const planks = (1.8 + rng() * 1.9).toFixed(2);
        const dir = p.dir || -1;
        State.activeCubimals.push({
          street: State.area,
          x: p.x + dir * 24,
          y: p.y,
          dir,
          color: item.color,
          owner: p.name,
          name: item.name,
          distPlanks: planks,
          until: performance.now() + 2500,
        });
        window.net?.send("cubimal_race", {
          area: State.area,
          x: Math.round(p.x),
          y: Math.round(p.y),
          dir,
          color: item.color,
          cubName: item.name,
          distPlanks: planks,
        });
      } else if (action === "Play" || action === "Play for") {
        // Rule 41: Play Musicblock GNG or DG-2
        const kind = slot.id === "musicblock_dg2" ? "DG-2" : "GNG";
        window.AudioEngine.playMusicblock(kind);
        this.changeMood(10);
        this.spawnFloat(p.x, p.y - 90, `Playing ${item.name}! +10 Mood`, "#5CC9A7");
      } else if (action === "Set out") {
        // Furniture placement on street (Rule 23 & 33)
        State.placedFurniture.push({
          street: State.area,
          itemId: slot.id,
          x: p.x + p.dir * 45,
          y: p.y,
        });
        consumeOne();
        window.AudioEngine.playPop();
        this.spawnFloat(p.x, p.y - 90, `Placed ${item.name}!`, "#FFD154");
      } else if (action === "Contribute to Tower") {
        const tower = window.GameData.STREETS.beaus_home.entities.find((e) => e.id === "tower_project_home");
        if (tower) {
          consumeOne();
          this.contributeToTower(tower);
        }
      } else if (action === "Drop") {
        consumeOne();
        window.UI.logActivity(`Dropped 1 <strong>${item.name}</strong>.`, "local");
      } else if (action === "Inspect" || action === "Info (stats)") {
        window.UI.showBanner(`${item.name}: ${item.desc} (Value: ${item.price}c)`, 4000);
      } else {
        // Generic Use
        this.interactNearest();
      }
    },

    startThrillerDance() {
      const p = State.player;
      p.anim = "thriller";
      p.animUntil = performance.now() + 7500;
      window.AudioEngine.thrillerActive = true;
      setTimeout(() => {
        window.AudioEngine.thrillerActive = false;
      }, 7500);
      this.spawnFloat(p.x, p.y - 95, "Thriller Zombie Dance! +30 Mood", "#E87A24");
    },

    transitionToStreet(targetId, spawnX = null, isTeleport = false) {
      const target = window.GameData.STREETS[targetId];
      if (!target) return;

      if (isTeleport) {
        this.changeEnergy(-10);
      }

      // Show authentic Glitch Street Transition Loading Banner (Rule 8 & 10)
      const overlay = document.getElementById("street-loading-overlay");
      const firstVisit = !State.visitedStreets.includes(targetId);
      if (overlay) {
        document.getElementById("loading-street-title").textContent = `Entering ${target.name} in ${target.region}`;
        document.getElementById("loading-first-badge").classList.toggle("hidden", !firstVisit);
        overlay.classList.remove("hidden");
        setTimeout(() => overlay.classList.add("hidden"), 750);
      }

      State.area = targetId;
      State.player.x = spawnX ?? target.spawnX ?? 400;
      State.player.y = target.groundY;
      State.player.vx = 0;
      State.player.vy = 0;
      State.hoveredObj = null;

      window.AudioEngine.setTheme(target.theme);

      if (firstVisit) {
        State.visitedStreets.push(targetId);
        this.gainImg(2, `First time in ${target.name}! +2 iMG`);
        window.UI.logActivity(
          `Entered <strong>${target.name}</strong> in <strong>${target.region}</strong>. <em>First time here! You received +2 iMG!</em>`,
          "system"
        );
      } else {
        window.UI.logActivity(`Entered <strong>${target.name}</strong> in <strong>${target.region}</strong>.`, "system");
      }

      pushEvent("area_change", { area: targetId, region: target.region, firstVisit });
    },

    sendChatMessage(text, channel = "local") {
      const p = State.player;
      p.bubble = { text, until: performance.now() + 4500 };
      window.UI.logActivity(`<strong>${this.escapeHtml(p.name)}:</strong> ${this.escapeHtml(text)}`, channel);
      window.net?.send("chat", { text, channel, name: p.name });
      pushEvent("chat", { text, channel });

      // Check if greeting matches daily 'hi' sign (Rule 39)
      const norm = text.trim().toLowerCase();
      if (["o/", "hi", "hey", "bye", "wave"].includes(norm)) {
        this.changeMood(10);
        this.spawnFloat(p.x, p.y - 95, "2x / +10 mood! Daily Sign Bonus!", "#6EEB83");
        window.AudioEngine.playSuccess();
        this.advanceQuestStep("social_act", 1);
      }
    },

    startLearningSkill(skillId) {
      const sk = window.GameData.SKILLS.find((s) => s.id === skillId);
      if (!sk) return;
      window.AudioEngine.playPop();
      State.activeSkill = {
        id: sk.id,
        finishAt: Date.now() + sk.durationSec * 1000,
      };
      window.UI.showBanner(`Started learning ${sk.name}!`, 3000);
    },

    useEmblemOfFriendly() {
      const idx = State.inventory.findIndex((s) => s && s.id === "emblem_of_friendly");
      if (idx === -1 || !State.activeSkill) return;
      State.inventory[idx].count -= 1;
      if (State.inventory[idx].count <= 0) State.inventory[idx] = null;
      State.activeSkill.finishAt -= 60000;
      window.UI.renderInventory();
      window.AudioEngine.playSuccess();
    },

    buyItem(itemId, price) {
      if (State.player.currants < price) return;
      if (this.addItemToInventory(itemId, 1)) {
        State.player.currants -= price;
        window.AudioEngine.playPop();
        pushEvent("buy_item", { item: itemId, price });
      }
    },

    sellItem(slotIdx, price) {
      const s = State.inventory[slotIdx];
      if (!s) return;
      s.count -= 1;
      if (s.count <= 0) State.inventory[slotIdx] = null;
      State.player.currants += price;
      window.AudioEngine.playPop();
      window.UI.renderInventory();
    },

    changeHomeStyle(style) {
      if (State.homeStyle === style) return;
      if (State.player.img < 190) {
        window.UI.showBanner("You need 190 iMG to purchase a new street style!", 3500);
        return;
      }
      State.player.img -= 190;
      State.homeStyle = style;
      window.net?.set("homeStyle", style);
      window.AudioEngine.playSuccess();
      window.AudioEngine.setTheme(style === "snowy" ? "snowy" : style === "meadow" ? "savanna" : "spooky");
      window.UI.showBanner(`Home Street style updated to ${style.toUpperCase()}!`, 3500);
    },

    cultivateHomeLand() {
      if (State.player.img < 50) {
        window.UI.showBanner("Need 50 iMG to cultivate!", 3000);
        return;
      }
      State.player.img -= 50;
      const home = window.GameData.STREETS.beaus_home;
      home.entities.forEach((e) => {
        if (e.type === "beryl_rock") e.health = 100;
        if (typeof e.harvestLeft === "number") e.harvestLeft = 5;
      });
      window.AudioEngine.playSuccess();
      this.spawnFloat(State.player.x, State.player.y - 95, "Home Street Cultivated & Replenished!", "#6EEB83");
    },

    butlerAction(act) {
      window.AudioEngine.playPop();
      if (act === "visited") {
        this.gainImg(10, "Visitor Traffic Bonus: +10 iMG!");
      } else if (act === "yahoo") {
        this.changeMood(8);
        this.spawnFloat(State.player.x, State.player.y - 90, 'Roy cheers: "YAHOO!" (+8 Mood)', "#6EEB83");
        this.advanceQuestStep("social_act", 1);
      } else {
        window.UI.showBanner(`Butler Roy nods dutifully ("${act}" applied).`, 3000);
      }
    },

    advanceQuestStep(stepKey, amount = 1) {
      window.GameData.QUESTS.forEach((q) => {
        if (!State.questProgress[q.id]) {
          State.questProgress[q.id] = { completed: false, steps: {} };
        }
        const prog = State.questProgress[q.id];
        if (prog.completed) return;

        const matchingStep = q.steps.find((s) => s.key === stepKey);
        if (!matchingStep) return;

        prog.steps[stepKey] = Math.min(matchingStep.target, (prog.steps[stepKey] || 0) + amount);

        // Check if all steps completed
        const allDone = q.steps.every((s) => (prog.steps[s.key] || 0) >= s.target);
        if (allDone) {
          prog.completed = true;
          window.AudioEngine.playSuccess();
          this.gainImg(q.rewards.img, `Quest Complete: ${q.title}! +${q.rewards.img} iMG`);
          State.player.currants += q.rewards.currants || 0;
          if (q.rewards.mood) this.changeMood(q.rewards.mood);
          if (q.rewards.energy) this.changeEnergy(q.rewards.energy);
          if (q.rewards.giant) {
            State.favor[q.rewards.giant] = (State.favor[q.rewards.giant] || 10) + (q.rewards.favor || 15);
          }
          window.UI.showBanner(`Quest Completed: ${q.title}! (+${q.rewards.img} iMG, +${q.rewards.currants}c)`, 5000);
          window.UI.logActivity(
            `Completed Quest <strong>${q.title}</strong>! Earned <strong>+${q.rewards.img} iMG</strong> &amp; <strong>+${q.rewards.currants} currants</strong>!`,
            "system"
          );
          pushEvent("quest_complete", { quest: q.id });
        }
      });
    },

    escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    },
  };

  window.Game = Game;
  window.addEventListener("DOMContentLoaded", () => Game.init());
})();
