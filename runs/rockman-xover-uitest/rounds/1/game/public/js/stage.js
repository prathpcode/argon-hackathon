// public/js/stage.js — Auto-Scrolling Action Stage (Rules 1-9, 15-16)
(function () {
  const PLAYER_SCREEN_X = 270; // Fixed horizontal position on left third of screen (Rule 2)
  const GROUND_Y = 530;
  const STAGE_DURATION_DIST = 4200; // ~24 seconds at 180 px/s auto-run speed

  function createStageState(game) {
    const world = game.getCurrentWorld();
    const stage = game.getCurrentStage();
    const st = {
      worldId: world.id,
      stageId: stage.id,
      theme: world.theme,
      scrollX: 0,
      maxDist: STAGE_DURATION_DIST,
      runSpeed: 195,
      warpTimer: 0.75, // Initial vertical warp-in beam (Rule 1)
      clearTimer: 0,
      cleared: false,

      // Player physics & combat state
      py: GROUND_Y - 160, // starts high during warp-in
      vy: 0,
      onGround: false,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      jumpHeld: false,

      // Buster & Charge Shot state (Rules 5 & 6)
      chargeTime: 0,
      chargeTier: 0, // 0: normal/blue, 1: blue aura (1 hit), 2: yellow aura (2 pierce), 3: red/pink aura (3 pierce)
      shootAnim: 0,
      fireCooldown: 0,
      hurtTimer: 0,

      // Giga Crush gauge (Rule 7)
      gigaGauge: 35, // starts partially charged so first minute rewards Giga Crush quickly!
      gigaMax: 100,
      gigaActiveTimer: 0,
      gigaBeams: [],

      // AutoPlay toggle (Rule 8)
      autoPlay: false,

      // Entities
      platforms: [],
      hazards: [],
      enemies: [],
      bullets: [],
      enemyBullets: [],
      drops: [],
      particles: [],
      floatTexts: [],

      // Top notification banner (authentic translucent blue/yellow pickup banner)
      bannerText: "READY — WARP IN!",
      bannerColor: "blue",
      bannerTimer: 1.4,

      // Run rewards tally
      runZenny: 0,
      runExp: 0,
      runCards: [],
      runMapParts: 0,
      comboCount: 0,
      comboTimer: 0,
      nextEnemyId: 1,
    };

    populateStageLayout(st, game);
    return st;
  }

  function populateStageLayout(st, game) {
    const rand = GameData.rand;
    // Generate upper-tier platforms, road hazards, and enemy formations (2-3 in a row for Charge Shot piercing!)
    for (let x = 520; x < st.maxDist - 280; x += 270) {
      // Upper platform every other segment
      const hasPlat = rand() < 0.58;
      const platY = GROUND_Y - (rand() < 0.5 ? 105 : 135);
      const platW = 150 + Math.floor(rand() * 70);
      if (hasPlat) {
        st.platforms.push({ x, y: platY, w: platW, h: 16 });
      }

      // Ground hazard spike/energy trap occasionally
      if (rand() < 0.32 && x > 700) {
        st.hazards.push({ x: x + 60, y: GROUND_Y, w: 38, h: 18 });
      }

      // Spawn a line of 2 or 3 ground enemies so Yellow/Red Charge Shots can pierce them (Rule 6 & 7)
      const groupSize = rand() < 0.55 ? 3 : 2;
      const groundType = rand() < 0.25 ? "cannon" : "rex";
      for (let i = 0; i < groupSize; i++) {
        st.enemies.push({
          id: st.nextEnemyId++,
          type: groundType,
          x: x + i * 54,
          y: GROUND_Y,
          vx: groundType === "rex" ? -28 : 0,
          hp: 1,
          alive: true,
          shootTimer: 1.2 + i * 0.4,
        });
      }

      // Aerial Batton drones or platform turrets + airborne item drops (Rule 4)
      if (hasPlat) {
        st.enemies.push({
          id: st.nextEnemyId++,
          type: "batton",
          x: x + platW * 0.5,
          y: platY - 12,
          baseY: platY - 12,
          vx: -15,
          hp: 1,
          alive: true,
          shootTimer: 1.8,
        });
        // Airborne bonus coins / EP capsule above platform
        st.drops.push({
          x: x + platW * 0.3,
          y: platY - 46,
          vy: 0,
          type: rand() < 0.25 ? "ep" : "zenny",
          amount: 25 + game.worldIdx * 10,
          airborne: true,
          collected: false,
        });
      } else if (rand() < 0.65) {
        // High-flying Batton squad
        for (let j = 0; j < 2; j++) {
          st.enemies.push({
            id: st.nextEnemyId++,
            type: "batton",
            x: x + 90 + j * 52,
            y: GROUND_Y - 115,
            baseY: GROUND_Y - 115,
            vx: -22,
            hp: 1,
            alive: true,
            shootTimer: 2.0,
          });
        }
      }
    }
  }

  function showStageBanner(st, text, color = "blue") {
    st.bannerText = text;
    st.bannerColor = color;
    st.bannerTimer = 1.6;
  }

  function triggerJump(st, game) {
    if (st.cleared || st.warpTimer > 0) return;
    st.jumpBufferTimer = 0.14;
    st.jumpHeld = true;
  }

  function releaseJump(st) {
    st.jumpHeld = false;
    if (st.vy < -220) {
      st.vy *= 0.58; // Variable jump height on early release
    }
  }

  function executeJump(st) {
    st.vy = -560;
    st.onGround = false;
    st.coyoteTimer = 0;
    st.jumpBufferTimer = 0;
    Sound.SFX.jump();
    for (let i = 0; i < 6; i++) {
      st.particles.push({
        x: PLAYER_SCREEN_X + (Math.random() - 0.5) * 20,
        y: st.py,
        vx: -60 - Math.random() * 60,
        vy: -20 - Math.random() * 40,
        life: 0.28,
        maxLife: 0.28,
        color: "#38bdf8",
        size: 4,
      });
    }
  }

  // Rule 5 & 6: Firing buster with Blue (1 hit), Yellow (2 pierce), or Red/Pink (3 pierce)
  function triggerShot(st, game) {
    if (st.cleared || st.warpTimer > 0 || st.fireCooldown > 0) return;
    const tier = st.chargeTier;
    const armor = game.getEquippedArmor();
    const stats = game.getComputedStats();

    // Pierce count per Rule 6: Blue/Normal = 1, Yellow = 2, Red/Pink = 3 (Nova X card adds +1)
    let pierce = tier >= 3 ? 3 : tier === 2 ? 2 : 1;
    if (stats.bonusPierce) pierce += stats.bonusPierce;

    const colors = ["#38bdf8", "#60a5fa", "#facc15", "#fb7185"];
    const sizes = [8, 12, 18, 25];

    st.bullets.push({
      x: PLAYER_SCREEN_X + 28,
      y: st.py - 32,
      vx: 760,
      tier,
      pierceLeft: pierce,
      maxPierce: pierce,
      killsThisShot: 0,
      color: colors[tier] || "#38bdf8",
      radius: sizes[tier] || 10,
      trail: [],
    });

    Sound.SFX.shot(tier);
    st.chargeTime = 0;
    st.chargeTier = 0;
    st.shootAnim = 0.22;
    st.fireCooldown = 0.14;
    game.pushEvent("shot", { tier, pierce });
  }

  // Rule 7: Giga Crush leaps into the air and blasts 6 energy explosions across the screen
  function triggerGigaCrush(st, game) {
    if (st.cleared || st.warpTimer > 0) return;
    if (st.gigaGauge < st.gigaMax || st.gigaActiveTimer > 0) return;

    st.gigaGauge = 0;
    st.gigaActiveTimer = 1.15;
    st.vy = -320;
    st.py = Math.min(st.py, GROUND_Y - 120);
    game.triggerShake(12, 0.55);
    Sound.SFX.gigaCrush();
    showStageBanner(st, "GIGA CRUSH!! FULL SCREEN BLAST!", "gold");

    // 6 energy pillar beams across the screen
    st.gigaBeams = [];
    for (let i = 0; i < 6; i++) {
      st.gigaBeams.push({
        screenX: 160 + i * 185,
        delay: i * 0.06,
        timer: 0.95,
        color: i % 2 === 0 ? "#38bdf8" : "#facc15",
      });
    }

    // Destroy all visible enemies on screen
    let destroyed = 0;
    for (const e of st.enemies) {
      const sx = e.x - st.scrollX;
      if (e.alive && sx > -40 && sx < 1320) {
        defeatEnemy(st, game, e, true);
        destroyed++;
      }
    }
    game.pushEvent("item_use", { item: "giga_crush", destroyed });
  }

  function defeatEnemy(st, game, e, fromGiga = false) {
    if (!e.alive) return;
    e.alive = false;
    const sx = e.x - st.scrollX;

    st.comboCount++;
    st.comboTimer = 1.8;
    Sound.SFX.hit(st.comboCount);
    game.addScore(100 * st.comboCount);
    st.runExp += 8 + game.worldIdx * 4;

    // Explosion particles
    for (let i = 0; i < 12; i++) {
      const ang = (Math.PI * 2 * i) / 12;
      const spd = 60 + Math.random() * 140;
      st.particles.push({
        x: sx,
        y: e.y - 18,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.38,
        maxLife: 0.38,
        color: i % 2 === 0 ? "#facc15" : "#fb7185",
        size: 5,
      });
    }

    // Rule 15: Drop Zenny coins, green/gold Battle Memory cards, yellow EP capsules, and Map Parts
    const r = GameData.rand();
    const dropX = e.x;
    const dropY = e.y - 18;
    // Always drop a Zenny coin
    st.drops.push({
      x: dropX,
      y: dropY,
      vy: -180,
      type: "zenny",
      amount: 18 + game.worldIdx * 8 + st.comboCount * 4,
      airborne: false,
      collected: false,
    });

    if (r < 0.24) {
      // Battle Memory Card drop (green or gold)
      st.drops.push({
        x: dropX + 18,
        y: dropY - 10,
        vy: -220,
        type: GameData.rand() < 0.3 ? "card_gold" : "card_green",
        airborne: false,
        collected: false,
      });
    } else if (r < 0.42) {
      // Map Part (3x3 puzzle grid for World Master Boss, Rule 16)
      st.drops.push({
        x: dropX + 16,
        y: dropY - 8,
        vy: -200,
        type: "mappart",
        airborne: false,
        collected: false,
      });
    } else if (r < 0.54) {
      // Yellow EP recovery capsule
      st.drops.push({
        x: dropX - 14,
        y: dropY - 8,
        vy: -190,
        type: "ep",
        amount: 1,
        airborne: false,
        collected: false,
      });
    }
  }

  function updateStage(st, game, dt) {
    if (st.bannerTimer > 0) st.bannerTimer = Math.max(0, st.bannerTimer - dt);
    if (st.shootAnim > 0) st.shootAnim = Math.max(0, st.shootAnim - dt);
    if (st.fireCooldown > 0) st.fireCooldown = Math.max(0, st.fireCooldown - dt);
    if (st.hurtTimer > 0) st.hurtTimer = Math.max(0, st.hurtTimer - dt);
    if (st.comboTimer > 0) {
      st.comboTimer -= dt;
      if (st.comboTimer <= 0) st.comboCount = 0;
    }

    // 1. Initial vertical warp-in beam (Rule 1)
    if (st.warpTimer > 0) {
      st.warpTimer -= dt;
      st.py = GROUND_Y - Math.max(0, st.warpTimer / 0.75) * 240;
      if (st.warpTimer <= 0) {
        st.py = GROUND_Y;
        st.onGround = true;
        Sound.SFX.warp();
      }
      return;
    }

    // 2. Stage Clear celebration state
    if (st.cleared) {
      st.clearTimer += dt;
      // Auto-advance or let player click after 2.2s
      if (st.clearTimer > 2.3 && st.autoPlay) {
        game.onStageRunComplete();
      }
      return;
    }

    // 3. Auto-scroll forward (Rules 1 & 2)
    st.scrollX += st.runSpeed * dt;
    const playerWorldX = st.scrollX + PLAYER_SCREEN_X;

    // Check stage completion (Left vertical progress bar reaches 0%)
    if (st.scrollX >= st.maxDist) {
      st.scrollX = st.maxDist;
      st.cleared = true;
      st.clearTimer = 0;
      Sound.SFX.victory();
      showStageBanner(st, "STAGE CLEAR!!", "gold");
      game.applyStageRunRewards(st);
      return;
    }

    // 4. Auto-charge buster when not firing (Rule 5: Blue tier 1 -> Yellow tier 2 -> Red/Pink tier 3)
    const armorSpeedMult = game.equippedArmorId === "OVER-3" ? 1.35 : 1.0;
    st.chargeTime += dt * armorSpeedMult;
    const prevTier = st.chargeTier;
    if (st.chargeTime >= 1.15) st.chargeTier = 3; // Red/Pink (pierces 3)
    else if (st.chargeTime >= 0.62) st.chargeTier = 2; // Yellow (pierces 2)
    else if (st.chargeTime >= 0.22) st.chargeTier = 1; // Blue/Purple (1 hit)
    else st.chargeTier = 0;

    if (st.chargeTier > prevTier) {
      Sound.SFX.chargeTick(st.chargeTier);
    }

    // 5. AutoPlay AI logic (Rule 8)
    if (st.autoPlay) {
      if (st.gigaGauge >= st.gigaMax) {
        triggerGigaCrush(st, game);
      }
      // Look ahead for hazards, platforms, or enemies
      let enemiesAhead = 0;
      let highEnemyAhead = false;
      for (const e of st.enemies) {
        if (!e.alive) continue;
        const dx = e.x - playerWorldX;
        if (dx > 20 && dx < 340) {
          enemiesAhead++;
          if (e.y < GROUND_Y - 50) highEnemyAhead = true;
        }
      }
      let hazardAhead = false;
      for (const h of st.hazards) {
        const dx = h.x - playerWorldX;
        if (dx > 10 && dx < 95) hazardAhead = true;
      }
      if ((hazardAhead || highEnemyAhead) && st.onGround) {
        triggerJump(st, game);
      }
      if (enemiesAhead >= 2 && st.chargeTier >= 2) {
        triggerShot(st, game);
      } else if (enemiesAhead >= 1 && st.chargeTier >= 3) {
        triggerShot(st, game);
      } else if (enemiesAhead >= 1 && st.enemies.some((e) => e.alive && e.x - playerWorldX > 10 && e.x - playerWorldX < 130)) {
        triggerShot(st, game);
      }
    }

    // 6. Player vertical physics (coyote time + jump buffer)
    if (st.onGround) {
      st.coyoteTimer = 0.1;
    } else {
      st.coyoteTimer = Math.max(0, st.coyoteTimer - dt);
    }
    if (st.jumpBufferTimer > 0) {
      st.jumpBufferTimer = Math.max(0, st.jumpBufferTimer - dt);
      if (st.coyoteTimer > 0) {
        executeJump(st);
      }
    }

    const prevY = st.py;
    if (st.gigaActiveTimer > 0) {
      st.gigaActiveTimer -= dt;
      st.vy = 0;
      st.py = GROUND_Y - 125;
    } else {
      st.vy += 1380 * dt; // Gravity
      st.py += st.vy * dt;
    }

    st.onGround = false;
    // Check landing on upper platforms
    if (st.vy >= 0) {
      for (const p of st.platforms) {
        if (playerWorldX + 14 > p.x && playerWorldX - 14 < p.x + p.w) {
          if (prevY <= p.y + 4 && st.py >= p.y) {
            st.py = p.y;
            st.vy = 0;
            st.onGround = true;
            break;
          }
        }
      }
    }
    // Check landing on highway ground
    if (st.py >= GROUND_Y) {
      st.py = GROUND_Y;
      st.vy = 0;
      st.onGround = true;
    }

    // 7. Update Giga Crush beams
    for (const b of st.gigaBeams) {
      if (b.delay > 0) b.delay -= dt;
      else b.timer -= dt;
    }
    st.gigaBeams = st.gigaBeams.filter((b) => b.timer > 0);

    // 8. Update Player Bullets & Pierce Logic (Rule 6 & 7)
    for (const b of st.bullets) {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 5) b.trail.shift();
      b.x += b.vx * dt;

      for (const e of st.enemies) {
        if (!e.alive) continue;
        const ex = e.x - st.scrollX;
        const ey = e.y - 18;
        if (Math.abs(b.x - ex) < 26 + b.radius && Math.abs(b.y - ey) < 28 + b.radius) {
          defeatEnemy(st, game, e, false);
          b.pierceLeft--;
          b.killsThisShot++;

          // Rule 7: Defeating multiple enemies simultaneously with a Charge Shot fills Giga Crush bar!
          if (b.tier >= 2 && b.killsThisShot >= 2) {
            const gain = b.killsThisShot === 2 ? 28 : 36;
            st.gigaGauge = Math.min(st.gigaMax, st.gigaGauge + gain);
            st.floatTexts.push({
              x: ex,
              y: ey - 24,
              text: `${b.killsThisShot}x PIERCE! +GIGA`,
              color: "#38bdf8",
              life: 0.85,
            });
          } else {
            st.gigaGauge = Math.min(st.gigaMax, st.gigaGauge + 8);
          }

          if (b.pierceLeft <= 0) break;
        }
      }
    }
    st.bullets = st.bullets.filter((b) => b.x < 1340 && b.pierceLeft > 0);

    // 9. Update Enemies & Collisions
    for (const e of st.enemies) {
      if (!e.alive) continue;
      const sx = e.x - st.scrollX;
      if (sx < -80 || sx > 1360) continue;

      e.x += (e.vx || 0) * dt;
      if (e.type === "batton") {
        e.y = e.baseY + Math.sin(performance.now() * 0.005 + e.id) * 18;
      }

      // Check collision with player
      if (st.hurtTimer <= 0 && st.gigaActiveTimer <= 0) {
        if (Math.abs(PLAYER_SCREEN_X - sx) < 28 && Math.abs((st.py - 24) - (e.y - 18)) < 28) {
          st.hurtTimer = 0.7;
          game.triggerShake(5, 0.2);
          Sound.SFX.hit(1);
          game.pushEvent("hit", { source: e.type });
        }
      }
    }

    // Check ground hazards
    if (st.hurtTimer <= 0 && st.gigaActiveTimer <= 0) {
      for (const h of st.hazards) {
        const hx = h.x - st.scrollX;
        if (Math.abs(PLAYER_SCREEN_X - (hx + h.w / 2)) < 24 && st.py > GROUND_Y - 18) {
          st.hurtTimer = 0.7;
          st.vy = -260;
          game.triggerShake(5, 0.2);
          Sound.SFX.hit(1);
          game.pushEvent("hit", { source: "hazard" });
        }
      }
    }

    // 10. Update Drops (Magnetized toward player when close!)
    for (const d of st.drops) {
      if (d.collected) continue;
      const sx = d.x - st.scrollX;
      if (!d.airborne) {
        d.vy += 680 * dt;
        d.y += d.vy * dt;
        if (d.y > GROUND_Y - 8) {
          d.y = GROUND_Y - 8;
          d.vy = 0;
        }
      }

      // Magnet pull when within 170px of player
      const dx = PLAYER_SCREEN_X - sx;
      const dy = (st.py - 26) - d.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 175) {
        d.x += (dx / Math.max(1, dist)) * 460 * dt;
        d.y += (dy / Math.max(1, dist)) * 460 * dt;
      }

      if (dist < 38) {
        d.collected = true;
        if (d.type === "zenny") {
          st.runZenny += d.amount;
          game.zenny += d.amount;
          Sound.SFX.coin();
          showStageBanner(st, `${d.amount} ZENNY GET!`, "blue");
          st.floatTexts.push({ x: PLAYER_SCREEN_X, y: st.py - 56, text: `+${d.amount}Z`, color: "#facc15", life: 0.7 });
          game.pushEvent("pickup", { type: "zenny", amount: d.amount });
        } else if (d.type === "ep") {
          game.ep = Math.min(game.maxEp, game.ep + 1);
          Sound.SFX.coin();
          showStageBanner(st, "EP RECOVERED! (+1 EP)", "gold");
          st.floatTexts.push({ x: PLAYER_SCREEN_X, y: st.py - 56, text: "+1 EP!", color: "#4ade80", life: 0.8 });
          game.pushEvent("pickup", { type: "ep", amount: 1 });
        } else if (d.type === "mappart") {
          st.runMapParts++;
          const unlockedParts = game.collectMapPart(st.worldId);
          Sound.SFX.cardDrop();
          showStageBanner(st, `MAP PART GET! (${unlockedParts}/9)`, "gold");
          st.floatTexts.push({ x: PLAYER_SCREEN_X, y: st.py - 62, text: `MAP ${unlockedParts}/9`, color: "#38bdf8", life: 0.9 });
          game.pushEvent("pickup", { type: "mappart", count: unlockedParts });
        } else if (d.type === "card_green" || d.type === "card_gold") {
          const newCard = game.grantRandomCard(d.type === "card_gold" ? 4 : 2);
          st.runCards.push(newCard);
          Sound.SFX.cardDrop();
          showStageBanner(st, `BATTLE MEMORY GET! [${newCard.name}]`, "blue");
          st.floatTexts.push({ x: PLAYER_SCREEN_X, y: st.py - 64, text: `CARD: ${newCard.name}`, color: "#a855f7", life: 0.95 });
          game.pushEvent("pickup", { type: "card", card: newCard.name });
        }
      }
    }

    // 11. Particles & FloatTexts
    for (const p of st.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    st.particles = st.particles.filter((p) => p.life > 0);

    for (const f of st.floatTexts) {
      f.y -= 36 * dt;
      f.life -= dt;
    }
    st.floatTexts = st.floatTexts.filter((f) => f.life > 0);
  }

  function renderStage(ctx, W, H, st, game) {
    const animTime = performance.now() * 0.001;
    // 1. Parallax World Background
    Sprites.drawStageBackground(ctx, W, H, st.theme, st.scrollX, GROUND_Y);

    // 2. Upper-tier Platforms & Ground Hazards
    for (const p of st.platforms) {
      const px = p.x - st.scrollX;
      if (px + p.w < -20 || px > W + 20) continue;
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(px, p.y, p.w, p.h);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(px, p.y, p.w, 4);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(px + 6, p.y + 6, 12, 4);
      ctx.fillRect(px + p.w - 18, p.y + 6, 12, 4);
    }

    for (const h of st.hazards) {
      const hx = h.x - st.scrollX;
      if (hx + h.w < -20 || hx > W + 20) continue;
      ctx.fillStyle = "#ef4444";
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(hx + i * 12, h.y);
        ctx.lineTo(hx + i * 12 + 6, h.y - h.h);
        ctx.lineTo(hx + i * 12 + 12, h.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // 3. Drops (Zenny coins, Green/Gold Battle Memory cards, Yellow EP capsules, Map Parts)
    for (const d of st.drops) {
      if (d.collected) continue;
      const dx = d.x - st.scrollX;
      if (dx < -30 || dx > W + 30) continue;
      ctx.save();
      ctx.translate(dx, d.y);
      if (d.type === "zenny") {
        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Z", 0, 3);
      } else if (d.type === "ep") {
        ctx.fillStyle = "#facc15";
        ctx.fillRect(-9, -11, 18, 22);
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(-6, -8, 12, 7);
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("EP", 0, 8);
      } else if (d.type === "mappart") {
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-11, -11, 22, 22);
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2;
        ctx.strokeRect(-11, -11, 22, 22);
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("MAP", 0, 3);
      } else {
        // Battle Memory Card item drop
        ctx.fillStyle = d.type === "card_gold" ? "#facc15" : "#4ade80";
        ctx.fillRect(-10, -13, 20, 26);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(-10, -13, 20, 26);
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("BM", 0, 3);
      }
      ctx.restore();
    }

    // 4. Enemies
    for (const e of st.enemies) {
      if (!e.alive) continue;
      const sx = e.x - st.scrollX;
      if (sx < -60 || sx > W + 60) continue;
      Sprites.drawEnemy(ctx, { ...e, x: sx }, animTime);
    }

    // 5. Other Multiplayer Co-op Runners in the room!
    if (game.net && game.net.players) {
      let peerIdx = 0;
      for (const peer of game.net.players.values()) {
        peerIdx++;
        const ps = peer.s || {};
        const peerArmor = GameData.ARMORS.find((a) => a.id === ps.armorId) || GameData.ARMORS[0];
        const peerX = PLAYER_SCREEN_X - 52 * peerIdx;
        const peerY = typeof ps.py === "number" ? ps.py : GROUND_Y;
        ctx.save();
        ctx.globalAlpha = 0.85;
        Sprites.drawOverCharacter(ctx, peerX, peerY, {
          armor: peerArmor,
          animTime,
          running: true,
          jumping: peerY < GROUND_Y - 5,
          chargeTier: ps.chargeTier || 1,
          shooting: ps.shooting || 0,
          label: peer.name || `ALLY ${peer.id}`,
        });
        ctx.restore();
      }
    }

    // 6. Player Character (OVER-1 / Equipped Armor) & Warp-In Beam (Rule 1)
    const equippedArmor = game.getEquippedArmor();
    if (st.warpTimer > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(56, 189, 248, 0.65)";
      ctx.fillRect(PLAYER_SCREEN_X - 18, 0, 36, st.py);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(PLAYER_SCREEN_X - 7, 0, 14, st.py);
      ctx.restore();
    }
    Sprites.drawOverCharacter(ctx, PLAYER_SCREEN_X, st.py, {
      armor: equippedArmor,
      animTime,
      running: !st.cleared,
      jumping: !st.onGround,
      chargeTier: st.chargeTier,
      shooting: st.shootAnim,
      hurt: st.hurtTimer,
      label: game.playerName,
    });

    // 7. Player Buster Shots & Charge Blasts
    for (const b of st.bullets) {
      ctx.save();
      for (let i = 0; i < b.trail.length; i++) {
        const t = b.trail[i];
        ctx.fillStyle = b.color;
        ctx.globalAlpha = ((i + 1) / b.trail.length) * 0.45;
        ctx.beginPath();
        ctx.arc(t.x, t.y, b.radius * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.radius * 1.4, b.radius * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(b.x + 2, b.y, b.radius * 0.7, b.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 8. Giga Crush 6-Beam Screen Blast (Rule 7)
    for (const gb of st.gigaBeams) {
      if (gb.delay > 0) continue;
      ctx.save();
      ctx.fillStyle = gb.color;
      ctx.globalAlpha = Math.min(1, gb.timer * 1.4) * 0.65;
      ctx.fillRect(gb.screenX - 42, 48, 84, GROUND_Y - 40);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(gb.screenX - 16, 48, 32, GROUND_Y - 40);
      ctx.restore();
    }

    // 9. Particles & Floating Combo Text
    for (const p of st.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const f of st.floatTexts) {
      ctx.save();
      ctx.font = "bold 15px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#0f172a";
      ctx.fillText(f.text, f.x + 1, f.y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }

    // =========================================================================
    // 10. AUTHENTIC ROCKMAN XOVER ACTION STAGE HUD (From Footage A 00:44 - 01:26)
    // =========================================================================

    // (A) Far-Left 28-Segment Vertical Stage Distance Bar above OVER-1 Helmet Icon
    const barX = 18;
    const barY = 92;
    const barW = 24;
    const barH = 364;
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.fillRect(barX, barY, barW, barH + 30);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH + 30);

    const remRatio = Math.max(0, 1 - st.scrollX / st.maxDist);
    const totalSegs = 28;
    const litSegs = Math.ceil(remRatio * totalSegs);
    const segH = (barH - 12) / totalSegs;
    for (let i = 0; i < totalSegs; i++) {
      // Depletes top-to-bottom as player runs (seg 0 is top, seg 27 is bottom)
      const isLit = totalSegs - 1 - i < litSegs;
      const sy = barY + 6 + i * segH;
      ctx.fillStyle = isLit ? (i < 8 ? "#facc15" : "#f97316") : "#1e293b";
      ctx.fillRect(barX + 4, sy, barW - 8, segH - 2);
    }
    // Blue square with white OVER-1 helmet icon at bottom of bar
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(barX + 2, barY + barH + 2, barW - 4, 24);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(barX + barW / 2, barY + barH + 14, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.fillRect(barX + barW / 2 - 2, barY + barH + 6, 5, 4);

    // (B) Top-Center Translucent Notification Banner (Pickups / Warnings)
    if (st.bannerTimer > 0 && st.bannerText) {
      ctx.save();
      const bw = 420;
      const bh = 34;
      const bx = (W - bw) / 2;
      const by = 62;
      ctx.fillStyle =
        st.bannerColor === "gold"
          ? "rgba(202, 138, 4, 0.88)"
          : "rgba(29, 78, 216, 0.85)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = st.bannerColor === "gold" ? "#fef08a" : "#93c5fd";
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px monospace";
      ctx.textAlign = "center";
      ctx.fillText(st.bannerText, W / 2, by + 22);
      ctx.restore();
    }

    // (C) Top-Right AutoPlay Toggle Button (Rule 8) + Stage Progress Badge
    const autoBtn = { x: W - 140, y: 62, w: 120, h: 34 };
    ctx.fillStyle = st.autoPlay ? "rgba(22, 163, 74, 0.9)" : "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(autoBtn.x, autoBtn.y, autoBtn.w, autoBtn.h);
    ctx.strokeStyle = st.autoPlay ? "#4ade80" : "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.strokeRect(autoBtn.x, autoBtn.y, autoBtn.w, autoBtn.h);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(st.autoPlay ? "AutoPlay: ON" : "AutoPlay", autoBtn.x + autoBtn.w / 2, autoBtn.y + 22);
    game.registerButton("stage_autoplay", autoBtn.x, autoBtn.y, autoBtn.w, autoBtn.h, () => {
      st.autoPlay = !st.autoPlay;
      Sound.SFX.click();
    });

    // (D) Bottom-Right Virtual Action Buttons (Rule 3 & 7: Jump, Shot, Giga Crush + Blue Gauge)
    // 1. Jump Button (bottom-right, left of Shot)
    const jumpCx = W - 210;
    const jumpCy = H - 72;
    const btnR = 44;
    ctx.save();
    ctx.fillStyle = "rgba(56, 189, 248, 0.28)";
    ctx.beginPath();
    ctx.arc(jumpCx, jumpCy, btnR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 3;
    ctx.stroke();
    // Upward curved arrow icon
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "center";
    ctx.fillText("▲ JUMP", jumpCx, jumpCy + 2);
    ctx.font = "10px monospace";
    ctx.fillStyle = "#bae6fd";
    ctx.fillText("[SPACE]", jumpCx, jumpCy + 18);
    ctx.restore();
    game.registerButton("stage_jump", jumpCx - btnR, jumpCy - btnR, btnR * 2, btnR * 2, () => {
      triggerJump(st, game);
    });

    // 2. Shot Button (far bottom-right, slightly higher than Jump)
    const shotCx = W - 92;
    const shotCy = H - 90;
    const tierCol =
      st.chargeTier === 3
        ? "rgba(244, 63, 94, 0.55)"
        : st.chargeTier === 2
        ? "rgba(250, 204, 21, 0.5)"
        : "rgba(56, 189, 248, 0.35)";
    ctx.save();
    ctx.fillStyle = tierCol;
    ctx.beginPath();
    ctx.arc(shotCx, shotCy, btnR + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = st.chargeTier === 3 ? "#fb7185" : st.chargeTier === 2 ? "#facc15" : "#bae6fd";
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "center";
    ctx.fillText(st.chargeTier >= 2 ? `C-SHOT T${st.chargeTier}` : "● SHOT", shotCx, shotCy + 2);
    ctx.font = "10px monospace";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText("[X / →]", shotCx, shotCy + 18);
    ctx.restore();
    game.registerButton("stage_shot", shotCx - btnR, shotCy - btnR, btnR * 2, btnR * 2, () => {
      triggerShot(st, game);
    });

    // 3. Giga Crush Button (above Shot button) + Horizontal Blue Gauge Bar in Gold Frame beneath it!
    const gigaCx = W - 92;
    const gigaCy = H - 215;
    const gigaR = 38;
    const gigaReady = st.gigaGauge >= st.gigaMax;
    ctx.save();
    ctx.fillStyle = gigaReady ? "rgba(220, 38, 38, 0.85)" : "rgba(30, 41, 59, 0.72)";
    ctx.beginPath();
    ctx.arc(gigaCx, gigaCy, gigaR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = gigaReady ? "#facc15" : "#94a3b8";
    ctx.lineWidth = gigaReady ? 4 : 2.5;
    ctx.stroke();
    ctx.fillStyle = gigaReady ? "#fef08a" : "#cbd5e1";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GIGA", gigaCx, gigaCy - 2);
    ctx.fillText("CRUSH", gigaCx, gigaCy + 12);

    // Horizontal Blue Gauge Bar in a Gold Frame directly beneath Giga Crush button (Rule 7)
    const gBarW = 84;
    const gBarH = 11;
    const gBarX = gigaCx - gBarW / 2;
    const gBarY = gigaCy + gigaR + 6;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(gBarX, gBarY, gBarW, gBarH);
    ctx.fillStyle = gigaReady ? "#38bdf8" : "#2563eb";
    ctx.fillRect(gBarX + 2, gBarY + 2, (gBarW - 4) * (st.gigaGauge / st.gigaMax), gBarH - 4);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.strokeRect(gBarX, gBarY, gBarW, gBarH);
    ctx.restore();

    game.registerButton("stage_giga", gigaCx - gigaR, gigaCy - gigaR, gigaR * 2, gigaR * 2 + 18, () => {
      triggerGigaCrush(st, game);
    });

    // (E) Stage Clear Overlay & Post-Stage 3 Recent Players / Bulk Cheer Banner (Rule 26)
    if (st.cleared) {
      ctx.save();
      ctx.fillStyle = "rgba(9, 13, 22, 0.84)";
      ctx.fillRect(180, 120, W - 360, 460);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.strokeRect(180, 120, W - 360, 460);

      ctx.fillStyle = "#facc15";
      ctx.font = "bold 30px monospace";
      ctx.textAlign = "center";
      ctx.fillText("STAGE CLEAR!!", W / 2, 168);

      const stage = game.getCurrentStage();
      const prog = game.getStageProgress();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px monospace";
      ctx.fillText(`${stage.name} — Stage Progress: ${prog}%`, W / 2, 202);
      ctx.fillStyle = "#93c5fd";
      ctx.font = "14px monospace";
      ctx.fillText(
        `Earned: +${st.runZenny} Zenny  |  +${st.runExp} EXP  |  Cards: ${st.runCards.length}  |  Map Parts: ${game.getWorldMapPartsCount()}/9`,
        W / 2,
        230
      );

      // Rule 26: Display 3 recently active players after each quest stage (can Cheer / Friend Request!)
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(220, 250, W - 440, 210);
      ctx.strokeStyle = "#475569";
      ctx.strokeRect(220, 250, W - 440, 210);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "left";
      ctx.fillText("RECENT ACTIVE PLAYERS IN CROSSOVER WORLD (CHEER FOR +60 ZENNY):", 240, 274);

      const peers = game.getRecentPlayers(3);
      peers.forEach((p, idx) => {
        const py = 290 + idx * 52;
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(238, py, W - 476, 44);
        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 14px monospace";
        ctx.fillText(`${p.name}  [Lv.${p.level} ${p.armorId}]`, 254, py + 27);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px monospace";
        ctx.fillText(`HP ${p.hp} / ATK ${p.atk} / DEF ${p.def}`, 540, py + 27);

        const fBtn = { x: W - 380, y: py + 7, w: 125, h: 30 };
        ctx.fillStyle = "#2563eb";
        ctx.fillRect(fBtn.x, fBtn.y, fBtn.w, fBtn.h);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.cheered ? "CHEERED ★" : "CHEER +25Z", fBtn.x + fBtn.w / 2, fBtn.y + 20);
        ctx.textAlign = "left";
        game.registerButton(`cheer_peer_${idx}`, fBtn.x, fBtn.y, fBtn.w, fBtn.h, () => {
          game.sendCheer(p);
        });
      });

      // Bottom action buttons: Next Run / Boss Battle / Bulk Cheer
      const bulkBtn = { x: 230, y: 490, w: 230, h: 52 };
      ctx.fillStyle = "#ca8a04";
      ctx.fillRect(bulkBtn.x, bulkBtn.y, bulkBtn.w, bulkBtn.h);
      ctx.strokeStyle = "#fef08a";
      ctx.strokeRect(bulkBtn.x, bulkBtn.y, bulkBtn.w, bulkBtn.h);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px monospace";
      ctx.textAlign = "center";
      ctx.fillText("★ BULK CHEER (+75Z)", bulkBtn.x + bulkBtn.w / 2, bulkBtn.y + 31);
      game.registerButton("stage_bulk_cheer", bulkBtn.x, bulkBtn.y, bulkBtn.w, bulkBtn.h, () => {
        game.sendBulkCheer();
      });

      const nextBtn = { x: 490, y: 490, w: 260, h: 52 };
      const bossUnlocked = prog >= 100;
      ctx.fillStyle = bossUnlocked ? "#dc2626" : "#2563eb";
      ctx.fillRect(nextBtn.x, nextBtn.y, nextBtn.w, nextBtn.h);
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(nextBtn.x, nextBtn.y, nextBtn.w, nextBtn.h);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(
        bossUnlocked ? "⚔ FIGHT STAGE BOSS!!" : "▶ RUN AGAIN (+25%)",
        nextBtn.x + nextBtn.w / 2,
        nextBtn.y + 31
      );
      game.registerButton("stage_next_action", nextBtn.x, nextBtn.y, nextBtn.w, nextBtn.h, () => {
        game.onStageRunComplete();
      });

      const bossNowBtn = { x: 780, y: 490, w: 260, h: 52 };
      ctx.fillStyle = "#7e22ce";
      ctx.fillRect(bossNowBtn.x, bossNowBtn.y, bossNowBtn.w, bossNowBtn.h);
      ctx.strokeStyle = "#e9d5ff";
      ctx.strokeRect(bossNowBtn.x, bossNowBtn.y, bossNowBtn.w, bossNowBtn.h);
      ctx.fillStyle = "#ffffff";
      ctx.fillText("⚔ CHALLENGE BOSS NOW", bossNowBtn.x + bossNowBtn.w / 2, bossNowBtn.y + 31);
      game.registerButton("stage_boss_now", bossNowBtn.x, bossNowBtn.y, bossNowBtn.w, bossNowBtn.h, () => {
        game.startBossBattle("stage");
      });

      ctx.restore();
    }
  }

  window.StageMode = {
    createStageState,
    triggerJump,
    releaseJump,
    triggerShot,
    triggerGigaCrush,
    updateStage,
    renderStage,
  };
})();
