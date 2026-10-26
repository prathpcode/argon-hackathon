// public/js/boss.js — Turn-Based Boss Battles, 4-Player Master Raids, Battle Tower & 1v1 Arena PvP
(function () {
  const GROUND_Y = 540;

  function createBossState(game, mode = "stage", customTarget = null) {
    const world = game.getCurrentWorld();
    const stage = game.getCurrentStage();
    const pStats = game.getComputedStats();

    let bossInfo;
    if (mode === "raid") {
      const mb = world.masterBoss;
      // Sync shared Master Boss HP across multiplayer room if available
      const sharedKey = `raid_w${world.id}_hp`;
      const sharedHp =
        game.net && typeof game.net.shared[sharedKey] === "number" && game.net.shared[sharedKey] > 0
          ? game.net.shared[sharedKey]
          : mb.maxHp;
      bossInfo = {
        name: mb.name,
        level: mb.level,
        maxHp: mb.maxHp,
        hp: sharedHp,
        atk: mb.atk,
        def: mb.def,
        sprite: mb.sprite,
        element: mb.element,
        sharedKey,
      };
    } else if (mode === "tower") {
      const tb = GameData.TOWER_BOSSES[(game.towerFloor - 1) % GameData.TOWER_BOSSES.length];
      const scale = 1 + (game.towerFloor - 1) * 0.25;
      const maxHp = Math.round(tb.hp * scale);
      const savedHp = game.towerBossHp && game.towerBossHp > 0 ? Math.min(maxHp, game.towerBossHp) : maxHp;
      bossInfo = {
        name: `Floor ${game.towerFloor}: ${tb.name}`,
        level: game.towerFloor * 5,
        maxHp,
        hp: savedHp,
        atk: Math.round(tb.atk * scale),
        def: Math.round(tb.def * scale),
        sprite: tb.sprite,
        element: tb.element,
      };
    } else if (mode === "arena") {
      const rival = customTarget || game.getArenaRivals()[0];
      bossInfo = {
        name: `RIVAL: ${rival.name}`,
        level: rival.level,
        maxHp: rival.hp,
        hp: rival.hp,
        atk: rival.atk,
        def: rival.def,
        armorId: rival.armorId || "OVER-2",
        element: rival.element || "red",
        rank: rival.rank || 500,
      };
    } else {
      bossInfo = {
        name: stage.bossName,
        level: world.id * 5 + stage.id,
        maxHp: stage.hp,
        hp: stage.hp,
        atk: stage.atk,
        def: stage.def,
        sprite: stage.bossSprite,
        element: stage.element,
        partName: stage.partName,
      };
    }

    // Build 4-player squad for Master Raid (Player + Live Multiplayer Room Allies + AI Backup)
    const raidSquad = [];
    if (mode === "raid") {
      raidSquad.push({
        name: game.playerName,
        armor: game.getEquippedArmor(),
        hp: pStats.hp,
        maxHp: pStats.hp,
        atk: pStats.atk,
      });
      if (game.net && game.net.players) {
        for (const peer of game.net.players.values()) {
          if (raidSquad.length >= 4) break;
          const ps = peer.s || {};
          const pa = GameData.ARMORS.find((a) => a.id === ps.armorId) || GameData.ARMORS[1];
          raidSquad.push({
            name: peer.name || `Player ${peer.id}`,
            armor: pa,
            hp: ps.maxHp || pStats.hp,
            maxHp: ps.maxHp || pStats.hp,
            atk: ps.atk || Math.round(pStats.atk * 0.9),
          });
        }
      }
      let aiIdx = 0;
      while (raidSquad.length < 4) {
        const ai = GameData.AI_RIVALS[aiIdx % GameData.AI_RIVALS.length];
        const pa = GameData.ARMORS.find((a) => a.id === ai.armorId) || GameData.ARMORS[aiIdx % GameData.ARMORS.length];
        raidSquad.push({
          name: ai.name,
          armor: pa,
          hp: pStats.hp,
          maxHp: pStats.hp,
          atk: Math.round(pStats.atk * 0.85),
        });
        aiIdx++;
      }
    }

    const awakeningBonus = game.awakeningActive ? 1.2 : 1.0;
    const maxPlayerHp = Math.round(pStats.hp * awakeningBonus);

    Sound.SFX.warning();
    return {
      mode, // "stage" | "raid" | "tower" | "arena"
      theme: mode === "arena" ? "arena" : world.theme,
      warningTimer: 0.85, // Flashing red WARNING!! intro
      remainingTurns: 50, // Rule 11: 50-turn limit counting down each round
      turnPhase: "player_start", // "player_start" | "player_input" | "player_attack" | "boss_turn" | "ended"
      phaseTimer: 0.4,
      outcome: null, // "win" | "lose"
      awakeningUsed: !!game.awakeningActive,

      // Player combat stats
      playerHp: maxPlayerHp,
      playerMaxHp: maxPlayerHp,
      playerAtk: Math.round(pStats.atk * awakeningBonus),
      playerDef: Math.round(pStats.def * awakeningBonus),
      skillRateMult: game.awakeningActive ? 2.0 : 1.0,

      // C.Shot Lv Gauge (Rule 12: starts at Lv.0, up to Lv.5 in Battle Tower / Raid)
      cshotPoints: 35, // starts partially filled so player reaches Lv.1 after 1-2 exchanges
      cshotMaxLevel: mode === "tower" || mode === "raid" ? 5 : 3,

      // Buffs & Debuffs (Rule 13)
      buffs: {
        atkUp: 0,
        defUp: 0,
        defDown: 0,
        heat: 0,
        stop: 0,
      },
      cutInCard: null,
      cutInTimer: 0,

      boss: bossInfo,
      raidSquad,

      // Projectiles, animations & floating damage numbers
      projectiles: [],
      playerHurt: 0,
      bossHurt: 0,
      playerShooting: 0,
      floatTexts: [],
      particles: [],
      rewardSummary: null,
    };
  }

  function getCShotLevel(bs) {
    return Math.min(bs.cshotMaxLevel, Math.floor(bs.cshotPoints / 100));
  }

  // Rule 13: Trigger Battle Memory card skill at the start of player turn
  function triggerStartOfTurnSkills(bs, game) {
    const equippedCards = game.getEquippedCards();
    if (!equippedCards.length) return;

    // Pick a card skill to proc (higher rate if Awakening Continue is active, Rule 14)
    const procChance = Math.min(0.95, 0.55 * bs.skillRateMult);
    if (GameData.rand() > procChance) return;

    const card = GameData.choice(equippedCards);
    if (!card || !card.skill) return;

    bs.cutInCard = card;
    bs.cutInTimer = 1.05;
    Sound.SFX.skillCutIn();

    const sk = card.skill;
    const lvBonus = 1 + ((card.skillLv || 1) - 1) * 0.12;
    const pwr = sk.power * lvBonus;

    if (sk.id === "ATK_UP") {
      bs.buffs.atkUp = Math.max(bs.buffs.atkUp, pwr);
      bs.floatTexts.push({ x: 260, y: GROUND_Y - 95, text: `${sk.name}! ATK↑`, color: "#facc15", life: 1.1 });
    } else if (sk.id === "DEF_UP") {
      bs.buffs.defUp = Math.max(bs.buffs.defUp, pwr);
      bs.floatTexts.push({ x: 260, y: GROUND_Y - 95, text: `${sk.name}! DEF↑`, color: "#38bdf8", life: 1.1 });
    } else if (sk.id === "DEF_DOWN") {
      bs.buffs.defDown = Math.max(bs.buffs.defDown, pwr);
      bs.floatTexts.push({ x: 960, y: GROUND_Y - 120, text: `${sk.name}! DEF↓`, color: "#fb7185", life: 1.1 });
    } else if (sk.id === "HEAT") {
      bs.buffs.heat = 2;
      bs.buffs.atkUp = Math.max(bs.buffs.atkUp, pwr);
      const burnDmg = Math.max(45, Math.round(bs.boss.maxHp * 0.05));
      applyDamageToBoss(bs, game, burnDmg, "HEAT BURN");
    } else if (sk.id === "CSHOT_UP") {
      bs.cshotPoints = Math.min(bs.cshotMaxLevel * 100, bs.cshotPoints + 65);
      bs.floatTexts.push({ x: 260, y: GROUND_Y - 95, text: "C.SHOT GAUGE +65%!", color: "#38bdf8", life: 1.1 });
    } else if (sk.id === "STOP") {
      bs.buffs.stop = 1;
      bs.floatTexts.push({ x: 960, y: GROUND_Y - 120, text: "OVERDRIVE LOCK! (STUN)", color: "#4ade80", life: 1.1 });
    } else if (sk.id === "HEAL" || sk.id === "ALL_UP") {
      const heal = Math.round(bs.playerMaxHp * 0.14);
      bs.playerHp = Math.min(bs.playerMaxHp, bs.playerHp + heal);
      bs.buffs.atkUp = Math.max(bs.buffs.atkUp, pwr);
      bs.buffs.defUp = Math.max(bs.buffs.defUp, pwr);
      bs.floatTexts.push({ x: 260, y: GROUND_Y - 95, text: `+${heal} HP & ALL UP!`, color: "#4ade80", life: 1.1 });
    }
  }

  function applyDamageToBoss(bs, game, dmg, label = "") {
    bs.boss.hp = Math.max(0, bs.boss.hp - dmg);
    bs.bossHurt = 0.35;
    game.triggerShake(dmg > 500 ? 10 : 6, 0.25);
    Sound.SFX.hit(dmg > 500 ? 4 : 2);
    game.addScore(Math.round(dmg * 0.5));

    // Sync shared Master Raid Boss HP with other players in the room!
    if (bs.mode === "raid" && game.net) {
      game.net.set(bs.boss.sharedKey, bs.boss.hp);
      game.net.send("raidHit", { worldId: game.getCurrentWorld().id, dmg, hp: bs.boss.hp, fromName: game.playerName });
    }
    if (bs.mode === "tower") {
      game.towerBossHp = bs.boss.hp;
    }

    bs.floatTexts.push({
      x: 950 + (Math.random() - 0.5) * 50,
      y: GROUND_Y - 110 - Math.random() * 30,
      text: label ? `${label} -${dmg}` : `-${dmg}`,
      color: dmg > 500 ? "#facc15" : "#ffffff",
      life: 0.95,
    });

    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      bs.particles.push({
        x: 950,
        y: GROUND_Y - 60,
        vx: Math.cos(a) * (80 + Math.random() * 120),
        vy: Math.sin(a) * (80 + Math.random() * 120),
        life: 0.35,
        maxLife: 0.35,
        color: i % 2 === 0 ? "#facc15" : "#fb7185",
        size: 5,
      });
    }
  }

  // Rule 12: Player chooses between Normal Shot and Charge Shot (C.Shot)
  function choosePlayerAttack(bs, game, useCShot = false) {
    if (bs.turnPhase !== "player_input" || bs.warningTimer > 0) return;
    const cLv = getCShotLevel(bs);
    const isCShot = useCShot && cLv >= 1;

    bs.turnPhase = "player_attack";
    bs.phaseTimer = bs.mode === "raid" ? 0.95 : 0.65;
    bs.playerShooting = 0.45;

    const atkMult = 1 + (bs.buffs.atkUp || 0);
    const bossDef = bs.boss.def * (1 - (bs.buffs.defDown || 0));
    const baseDmg = Math.max(85, bs.playerAtk * atkMult * 1.65 - bossDef * 0.45);

    let mult = 1.0;
    if (isCShot) {
      // C.Shot deals massive damage scaling with C.Shot Lv (Lv.1 -> 2.4x up to Lv.5 -> 4.8x)
      mult = 1.8 + cLv * 0.65;
      bs.cshotPoints = 0;
      Sound.SFX.shot(3);
    } else {
      bs.cshotPoints = Math.min(bs.cshotMaxLevel * 100, bs.cshotPoints + 48);
      Sound.SFX.shot(1);
    }

    const totalDmg = Math.round(baseDmg * mult * (0.95 + GameData.rand() * 0.12));

    // Fire visual projectile(s) from left to right
    bs.projectiles.push({
      x: 310,
      y: GROUND_Y - 36,
      vx: 1350,
      targetX: 940,
      fromPlayer: true,
      isCShot,
      cLv,
      dmg: totalDmg,
      label: isCShot ? `C.SHOT Lv.${cLv}!` : "",
      hit: false,
    });

    // In 4-Player Master Raid (Rule 27), all 4 squad members fire sequentially!
    if (bs.mode === "raid" && bs.raidSquad.length > 1) {
      for (let i = 1; i < bs.raidSquad.length; i++) {
        const ally = bs.raidSquad[i];
        const allyDmg = Math.round(baseDmg * 0.65 * (0.9 + GameData.rand() * 0.2));
        bs.projectiles.push({
          x: 160 + (i % 2) * 90 - i * 60,
          y: GROUND_Y - 36 - Math.floor(i / 2) * 55,
          vx: 1350,
          targetX: 940,
          fromPlayer: true,
          isCShot: false,
          cLv: 0,
          dmg: allyDmg,
          label: ally.name,
          hit: false,
        });
      }
    }
  }

  // Rule 11: SKIP button in top-right corner fast-forwards to the battle outcome
  function skipBossBattle(bs, game) {
    if (bs.turnPhase === "ended") return;
    Sound.SFX.click();
    while (bs.remainingTurns > 0 && bs.boss.hp > 0 && bs.playerHp > 0) {
      const cLv = getCShotLevel(bs);
      const isCShot = cLv >= 1;
      const mult = isCShot ? 1.8 + cLv * 0.65 : 1.0;
      if (isCShot) bs.cshotPoints = 0;
      else bs.cshotPoints = Math.min(bs.cshotMaxLevel * 100, bs.cshotPoints + 48);

      const atkMult = 1 + (bs.buffs.atkUp || 0);
      const bossDef = bs.boss.def * (1 - (bs.buffs.defDown || 0));
      const pDmg = Math.round(Math.max(85, bs.playerAtk * atkMult * 1.65 - bossDef * 0.45) * mult * (bs.mode === "raid" ? 2.6 : 1));
      bs.boss.hp = Math.max(0, bs.boss.hp - pDmg);
      if (bs.boss.hp <= 0) break;

      const bDmg = Math.max(25, Math.round(bs.boss.atk * 1.15 - bs.playerDef * (1 + (bs.buffs.defUp || 0)) * 0.55));
      bs.playerHp = Math.max(0, bs.playerHp - bDmg);
      bs.cshotPoints = Math.min(bs.cshotMaxLevel * 100, bs.cshotPoints + 32);
      bs.remainingTurns--;
    }

    if (bs.boss.hp <= 0) {
      finishBossBattle(bs, game, "win");
    } else {
      finishBossBattle(bs, game, "lose");
    }
  }

  function finishBossBattle(bs, game, outcome) {
    bs.turnPhase = "ended";
    bs.outcome = outcome;
    game.awakeningActive = false;
    if (outcome === "win") {
      Sound.SFX.victory();
      bs.rewardSummary = game.applyBossVictoryRewards(bs);
      game.pushEvent("win", { mode: bs.mode, boss: bs.boss.name });
    } else {
      Sound.SFX.warning();
      game.pushEvent("death", { mode: bs.mode, boss: bs.boss.name });
    }
  }

  function updateBoss(bs, game, dt) {
    if (bs.warningTimer > 0) {
      bs.warningTimer = Math.max(0, bs.warningTimer - dt);
      return;
    }
    if (bs.cutInTimer > 0) bs.cutInTimer = Math.max(0, bs.cutInTimer - dt);
    if (bs.playerHurt > 0) bs.playerHurt = Math.max(0, bs.playerHurt - dt);
    if (bs.bossHurt > 0) bs.bossHurt = Math.max(0, bs.bossHurt - dt);
    if (bs.playerShooting > 0) bs.playerShooting = Math.max(0, bs.playerShooting - dt);

    // Update projectiles
    for (const p of bs.projectiles) {
      p.x += p.vx * dt;
      if (p.fromPlayer && p.x >= p.targetX && !p.hit) {
        p.hit = true;
        applyDamageToBoss(bs, game, p.dmg, p.label);
      } else if (!p.fromPlayer && p.x <= p.targetX && !p.hit) {
        p.hit = true;
        bs.playerHp = Math.max(0, bs.playerHp - p.dmg);
        bs.playerHurt = 0.35;
        // Receiving damage also fills C.Shot gauge (Rule 12)
        bs.cshotPoints = Math.min(bs.cshotMaxLevel * 100, bs.cshotPoints + 34);
        game.triggerShake(6, 0.22);
        Sound.SFX.hit(1);
        bs.floatTexts.push({
          x: 270,
          y: GROUND_Y - 90,
          text: `-${p.dmg}`,
          color: "#fb7185",
          life: 0.9,
        });
      }
    }
    bs.projectiles = bs.projectiles.filter((p) => !p.hit);

    // Particles & Floating Texts
    for (const pt of bs.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
    }
    bs.particles = bs.particles.filter((pt) => pt.life > 0);
    for (const f of bs.floatTexts) {
      f.y -= 34 * dt;
      f.life -= dt;
    }
    bs.floatTexts = bs.floatTexts.filter((f) => f.life > 0);

    if (bs.turnPhase === "ended") return;

    // Turn state machine
    if (bs.turnPhase === "player_start") {
      bs.phaseTimer -= dt;
      if (bs.phaseTimer <= 0) {
        triggerStartOfTurnSkills(bs, game);
        if (bs.boss.hp <= 0) {
          finishBossBattle(bs, game, "win");
          return;
        }
        bs.turnPhase = "player_input";
      }
    } else if (bs.turnPhase === "player_attack") {
      bs.phaseTimer -= dt;
      if (bs.phaseTimer <= 0 && bs.projectiles.length === 0) {
        if (bs.boss.hp <= 0) {
          finishBossBattle(bs, game, "win");
          return;
        }
        bs.turnPhase = "boss_turn";
        bs.phaseTimer = 0.7;

        // Boss attacks unless stunned by STOP skill
        if (bs.buffs.stop > 0) {
          bs.buffs.stop = 0;
          bs.floatTexts.push({ x: 950, y: GROUND_Y - 120, text: "BOSS STUNNED!", color: "#4ade80", life: 0.9 });
        } else {
          const defMult = 1 + (bs.buffs.defUp || 0);
          const bDmg = Math.max(22, Math.round(bs.boss.atk * 1.15 - bs.playerDef * defMult * 0.55));
          bs.projectiles.push({
            x: 900,
            y: GROUND_Y - 48,
            vx: -1250,
            targetX: 280,
            fromPlayer: false,
            isCShot: false,
            dmg: bDmg,
            hit: false,
          });
          Sound.SFX.shot(2);
        }
      }
    } else if (bs.turnPhase === "boss_turn") {
      bs.phaseTimer -= dt;
      if (bs.phaseTimer <= 0 && bs.projectiles.length === 0) {
        if (bs.playerHp <= 0) {
          finishBossBattle(bs, game, "lose");
          return;
        }
        bs.remainingTurns--;
        if (bs.remainingTurns <= 0) {
          finishBossBattle(bs, game, "lose");
          return;
        }
        bs.turnPhase = "player_start";
        bs.phaseTimer = 0.3;
      }
    }
  }

  function renderSegmentedVerticalHP(ctx, x, y, w, h, ratio, isPlayer) {
    ctx.save();
    ctx.fillStyle = "rgba(9, 13, 22, 0.9)";
    ctx.fillRect(x, y, w, h + 30);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h + 30);

    const totalSegs = 28;
    const litSegs = Math.ceil(Math.max(0, Math.min(1, ratio)) * totalSegs);
    const segH = (h - 12) / totalSegs;
    for (let i = 0; i < totalSegs; i++) {
      // Depletes top-to-bottom (seg 0 is top, seg 27 is bottom)
      const isLit = totalSegs - 1 - i < litSegs;
      const sy = y + 6 + i * segH;
      ctx.fillStyle = isLit ? (i < 8 ? "#facc15" : "#f97316") : "#1e293b";
      ctx.fillRect(x + 4, sy, w - 8, segH - 2);
    }

    // Bottom icon square (Player blue helmet or Boss black skull)
    ctx.fillStyle = isPlayer ? "#2563eb" : "#0f172a";
    ctx.fillRect(x + 2, y + h + 2, w - 4, 24);
    ctx.fillStyle = isPlayer ? "#ffffff" : "#ef4444";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h + 14, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function renderBoss(ctx, W, H, bs, game) {
    const animTime = performance.now() * 0.001;
    // 1. Background
    Sprites.drawStageBackground(ctx, W, H, bs.theme, 120, GROUND_Y);

    // 2. Player / 4-Player Raid Squad on Left Side
    if (bs.mode === "raid" && bs.raidSquad.length > 0) {
      // 2x2 staggered formation from footage C 07:28
      const coords = [
        { x: 310, y: GROUND_Y - 35 },
        { x: 205, y: GROUND_Y - 35 },
        { x: 280, y: GROUND_Y + 8 },
        { x: 170, y: GROUND_Y + 8 },
      ];
      bs.raidSquad.forEach((unit, idx) => {
        const pos = coords[idx] || coords[0];
        Sprites.drawOverCharacter(ctx, pos.x, pos.y, {
          armor: unit.armor,
          animTime: animTime + idx * 0.4,
          running: false,
          jumping: false,
          chargeTier: getCShotLevel(bs) >= 1 ? 2 : 0,
          shooting: bs.playerShooting,
          hurt: idx === 0 ? bs.playerHurt : 0,
          label: unit.name,
        });
      });
    } else {
      Sprites.drawOverCharacter(ctx, 270, GROUND_Y, {
        armor: game.getEquippedArmor(),
        animTime,
        running: false,
        jumping: false,
        chargeTier: getCShotLevel(bs) >= 2 ? 3 : getCShotLevel(bs) >= 1 ? 2 : 0,
        shooting: bs.playerShooting,
        hurt: bs.playerHurt,
        label: game.playerName,
      });
    }

    // Active Buff Icons above Player (Rule 13: ATK↑, DEF↑)
    let buffX = 225;
    if (bs.buffs.atkUp > 0) {
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(buffX, GROUND_Y - 88, 38, 18);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("ATK↑", buffX + 19, GROUND_Y - 75);
      buffX += 42;
    }
    if (bs.buffs.defUp > 0) {
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(buffX, GROUND_Y - 88, 38, 18);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("DEF↑", buffX + 19, GROUND_Y - 75);
    }

    // 3. Boss or Rival OVER Unit on Right Side
    if (bs.mode === "arena") {
      const rivalArmor = GameData.ARMORS.find((a) => a.id === bs.boss.armorId) || GameData.ARMORS[1];
      Sprites.drawOverCharacter(ctx, 960, GROUND_Y, {
        armor: rivalArmor,
        animTime,
        running: false,
        jumping: false,
        facing: -1,
        scale: 1.15,
        hurt: bs.bossHurt,
        label: bs.boss.name,
      });
    } else {
      Sprites.drawBoss(ctx, 955, GROUND_Y, bs.boss, animTime, bs.bossHurt);
    }

    // Boss Debuff Icons above Boss (DEF↓, HEAT, STOP)
    let debuffX = 910;
    if (bs.buffs.defDown > 0) {
      ctx.fillStyle = "#7e22ce";
      ctx.fillRect(debuffX, GROUND_Y - 125, 40, 18);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("DEF↓", debuffX + 20, GROUND_Y - 112);
      debuffX += 44;
    }
    if (bs.buffs.heat > 0) {
      ctx.fillStyle = "#ea580c";
      ctx.fillRect(debuffX, GROUND_Y - 125, 40, 18);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("HEAT", debuffX + 20, GROUND_Y - 112);
    }

    // 4. Projectiles & Particles
    for (const p of bs.projectiles) {
      ctx.save();
      ctx.fillStyle = p.isCShot ? "#f97316" : p.fromPlayer ? "#38bdf8" : "#ef4444";
      const r = p.isCShot ? 28 : 14;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 1.5, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 0.8, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const pt of bs.particles) {
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    for (const f of bs.floatTexts) {
      ctx.save();
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#090d16";
      ctx.fillText(f.text, f.x + 2, f.y + 2);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }

    // =========================================================================
    // 5. AUTHENTIC BOSS BATTLE HUD (From Footage A 02:16 - 02:44, E 00:20)
    // =========================================================================

    if (bs.mode === "arena") {
      // In 1v1 PvP Battle Arena, HP bars are horizontal at top-center (Blue left vs Red right, C 09:45)
      const pRatio = Math.max(0, bs.playerHp / bs.playerMaxHp);
      const bRatio = Math.max(0, bs.boss.hp / bs.boss.maxHp);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(220, 68, 360, 22);
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(222, 70, 356 * pRatio, 18);
      ctx.strokeStyle = "#93c5fd";
      ctx.strokeRect(220, 68, 360, 22);

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(W - 580, 68, 360, 22);
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(W - 578, 70, 356 * bRatio, 18);
      ctx.strokeStyle = "#fca5a5";
      ctx.strokeRect(W - 580, 68, 360, 22);

      ctx.fillStyle = "#facc15";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.fillText("VS", W / 2, 85);
    } else {
      // Far-Left (Player) and Far-Right (Boss) Vertical 28-Segment HP Bars
      renderSegmentedVerticalHP(ctx, 18, 102, 24, 340, bs.playerHp / bs.playerMaxHp, true);
      renderSegmentedVerticalHP(ctx, W - 42, 102, 24, 340, bs.boss.hp / bs.boss.maxHp, false);

      // Numeric HP readout for clarity
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`HP: ${bs.playerHp}/${bs.playerMaxHp}`, 50, 120);
      ctx.textAlign = "right";
      ctx.fillText(`${bs.boss.name} (Lv.${bs.boss.level}) HP: ${bs.boss.hp}/${bs.boss.maxHp}`, W - 140, 81);
    }

    // Rule 11: Remaining Turns Counter at Top-Left ('残りターン数: 49' / 'Remaining Turns: 49')
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(50, 60, 245, 32);
    ctx.strokeStyle = "#475569";
    ctx.strokeRect(50, 60, 245, 32);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`残りターン数: ${bs.remainingTurns} (Turns)`, 62, 81);

    // Rule 11: Circular SKIP Button at Top-Right Corner
    const skipCx = W - 92;
    const skipCy = 86;
    const skipR = 32;
    ctx.save();
    ctx.fillStyle = "rgba(51, 65, 85, 0.82)";
    ctx.beginPath();
    ctx.arc(skipCx, skipCy, skipR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(">|", skipCx, skipCy - 2);
    ctx.fillText("SKIP", skipCx, skipCy + 14);
    ctx.restore();
    game.registerButton("boss_skip", skipCx - skipR, skipCy - skipR, skipR * 2, skipR * 2, () => {
      skipBossBattle(bs, game);
    });

    // Translucent Turn Banner ('Your Turn' vs 'Boss Turn', Rule 11)
    if (bs.turnPhase !== "ended" && bs.warningTimer <= 0) {
      const isPlayerTurn = bs.turnPhase === "player_input" || bs.turnPhase === "player_start";
      ctx.save();
      ctx.fillStyle = isPlayerTurn ? "rgba(37, 99, 235, 0.78)" : "rgba(220, 38, 38, 0.78)";
      ctx.fillRect(W / 2 - 190, 108, 380, 34);
      ctx.strokeStyle = isPlayerTurn ? "#93c5fd" : "#fca5a5";
      ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - 190, 108, 380, 34);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.fillText(isPlayerTurn ? "YOUR TURN — CHOOSE ATTACK" : "BOSS TURN", W / 2, 131);
      ctx.restore();
    }

    // Rule 13: Battle Memory Skill Cut-in Banner
    if (bs.cutInTimer > 0 && bs.cutInCard) {
      ctx.save();
      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.fillRect(W / 2 - 250, 155, 500, 74);
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 3;
      ctx.strokeRect(W / 2 - 250, 155, 500, 74);
      Sprites.drawBattleMemoryCard(ctx, W / 2 - 238, 161, 56, 62, bs.cutInCard, { compact: true });
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SKILL ACTIVATED: ${bs.cutInCard.skill.name}!`, W / 2 - 170, 186);
      ctx.fillStyle = "#ffffff";
      ctx.font = "13px monospace";
      ctx.fillText(`${bs.cutInCard.name} — ${bs.cutInCard.skill.desc}`, W / 2 - 170, 210);
      ctx.restore();
    }

    // Rule 12: Bottom-Left C.Shot Lv Gauge (Orange circle Lv.0..Lv.5 + 1-5 segmented yellow bar)
    const cLv = getCShotLevel(bs);
    const gaugeX = 76;
    const gaugeY = H - 64;
    ctx.save();
    // Horizontal bar with segments 1..5
    const segW = 46;
    for (let i = 0; i < bs.cshotMaxLevel; i++) {
      const sx = gaugeX + 22 + i * segW;
      const fillRatio = Math.max(0, Math.min(1, (bs.cshotPoints - i * 100) / 100));
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(sx, gaugeY - 12, segW - 3, 24);
      ctx.fillStyle = fillRatio >= 1 ? "#facc15" : "#ca8a04";
      ctx.fillRect(sx + 2, gaugeY - 10, (segW - 7) * fillRatio, 20);
      ctx.strokeStyle = "#94a3b8";
      ctx.strokeRect(sx, gaugeY - 12, segW - 3, 24);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${i + 1}`, sx + (segW - 3) / 2, gaugeY + 4);
    }
    // Orange/Gold Circle on Left showing Lv.#
    ctx.fillStyle = cLv >= 1 ? "#ea580c" : "#334155";
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("C.Shot", gaugeX, gaugeY - 4);
    ctx.font = "bold 14px monospace";
    ctx.fillStyle = "#fef08a";
    ctx.fillText(`Lv.${cLv}`, gaugeX, gaugeY + 13);
    ctx.restore();

    // Rule 12: Bottom-Right Shot & C.Shot Buttons during 'Your Turn'
    const shotCx = W - 215;
    const shotCy = H - 74;
    const cshotCx = W - 95;
    const cshotCy = H - 92;
    const bR = 44;

    ctx.save();
    // Normal Shot button
    ctx.fillStyle = bs.turnPhase === "player_input" ? "rgba(56, 189, 248, 0.42)" : "rgba(30, 41, 59, 0.4)";
    ctx.beginPath();
    ctx.arc(shotCx, shotCy, bR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "center";
    ctx.fillText("● SHOT", shotCx, shotCy + 2);
    ctx.font = "10px monospace";
    ctx.fillText("[X / SPACE]", shotCx, shotCy + 18);
    game.registerButton("boss_shot", shotCx - bR, shotCy - bR, bR * 2, bR * 2, () => {
      choosePlayerAttack(bs, game, false);
    });

    // Charge Shot (C.Shot) button
    const cReady = cLv >= 1 && bs.turnPhase === "player_input";
    ctx.fillStyle = cReady ? "rgba(234, 88, 12, 0.85)" : "rgba(51, 65, 85, 0.5)";
    ctx.beginPath();
    ctx.arc(cshotCx, cshotCy, bR + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = cReady ? "#facc15" : "#64748b";
    ctx.lineWidth = cReady ? 4 : 2.5;
    ctx.stroke();
    ctx.fillStyle = cReady ? "#fef08a" : "#94a3b8";
    ctx.font = "bold 15px monospace";
    ctx.fillText(`C.SHOT`, cshotCx, cshotCy - 2);
    ctx.font = "bold 12px monospace";
    ctx.fillText(`Lv.${cLv} [C]`, cshotCx, cshotCy + 15);
    ctx.restore();
    game.registerButton("boss_cshot", cshotCx - bR, cshotCy - bR, bR * 2, bR * 2, () => {
      choosePlayerAttack(bs, game, cLv >= 1);
    });

    // Flashing WARNING!! Intro Overlay
    if (bs.warningTimer > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(220, 38, 38, 0.38)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.fillRect(0, H / 2 - 65, W, 130);
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 4;
      ctx.strokeRect(0, H / 2 - 65, W, 130);
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 44px monospace";
      ctx.textAlign = "center";
      ctx.fillText("WARNING!! — BOSS APPROACHING", W / 2, H / 2 - 6);
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 20px monospace";
      ctx.fillText(`${bs.boss.name} (Lv.${bs.boss.level})`, W / 2, H / 2 + 34);
      ctx.restore();
    }

    // Battle Outcome Modal: Win (Armor Part Reward, Rule 17) or Lose (Awakening Continue, Rule 14)
    if (bs.turnPhase === "ended") {
      ctx.save();
      ctx.fillStyle = "rgba(9, 13, 22, 0.88)";
      ctx.fillRect(220, 135, W - 440, 430);
      ctx.strokeStyle = bs.outcome === "win" ? "#facc15" : "#ef4444";
      ctx.lineWidth = 3;
      ctx.strokeRect(220, 135, W - 440, 430);

      ctx.textAlign = "center";
      if (bs.outcome === "win") {
        const rw = bs.rewardSummary || {};
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 32px monospace";
        ctx.fillText("YOU WIN!! — BOSS DEFEATED", W / 2, 190);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 17px monospace";
        ctx.fillText(`Earned: +${rw.zenny || 350} Zenny  |  +${rw.exp || 80} EXP  |  +${rw.crest || 50} Crest`, W / 2, 235);

        if (rw.armorPart) {
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(310, 260, W - 620, 95);
          ctx.strokeStyle = "#38bdf8";
          ctx.strokeRect(310, 260, W - 620, 95);
          ctx.fillStyle = "#38bdf8";
          ctx.font = "bold 16px monospace";
          ctx.fillText(`★ ARMOR PART ACQUIRED: ${rw.armorPart} (${rw.partsOwned}/5)`, W / 2, 295);
          ctx.fillStyle = "#4ade80";
          ctx.font = "bold 14px monospace";
          ctx.fillText(
            rw.unlockedArmor
              ? `NEW OVER ARMOR UNLOCKED: ${rw.unlockedArmor}!!`
              : `Collect all 5 parts from World bosses to unlock ${rw.targetArmor}!`,
            W / 2,
            330
          );
        }

        if (rw.card) {
          ctx.fillStyle = "#e9d5ff";
          ctx.font = "bold 15px monospace";
          ctx.fillText(`BATTLE MEMORY REWARD: [${rw.card.name}] (★${rw.card.rarity})`, W / 2, 390);
        }

        const contBtn = { x: W / 2 - 150, y: 470, w: 300, h: 54 };
        ctx.fillStyle = "#2563eb";
        ctx.fillRect(contBtn.x, contBtn.y, contBtn.w, contBtn.h);
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(contBtn.x, contBtn.y, contBtn.w, contBtn.h);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 17px monospace";
        ctx.fillText("▶ NEXT STAGE / CONTINUE", W / 2, contBtn.y + 33);
        game.registerButton("boss_win_continue", contBtn.x, contBtn.y, contBtn.w, contBtn.h, () => {
          game.returnToStageAfterBoss(true);
        });
      } else {
        // Rule 14: 'Awakening Continue' (覚醒コンティニュー) screen offers a rematch with +20% HP/ATK/DEF and 2x skill activation rate for 100 Crest
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 30px monospace";
        ctx.fillText("BATTLE LOST — AWAKENING CONTINUE", W / 2, 190);

        ctx.fillStyle = "#fef08a";
        ctx.font = "bold 18px monospace";
        ctx.fillText("覚醒コンティニュー (Awakening Power-Up Rematch)", W / 2, 235);

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "15px monospace";
        ctx.fillText("• HP / ATK / DEF +20% Boost!", W / 2, 275);
        ctx.fillText("• Battle Memory Skill Activation Rate 2x!", W / 2, 305);
        ctx.fillText(`Your Crest Balance: ${game.crest} Crest`, W / 2, 345);

        const awkBtn = { x: 290, y: 460, w: 320, h: 54 };
        ctx.fillStyle = "#ca8a04";
        ctx.fillRect(awkBtn.x, awkBtn.y, awkBtn.w, awkBtn.h);
        ctx.strokeStyle = "#fef08a";
        ctx.strokeRect(awkBtn.x, awkBtn.y, awkBtn.w, awkBtn.h);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 15px monospace";
        ctx.fillText("⚡ AWAKENING REMATCH (100 CREST)", awkBtn.x + awkBtn.w / 2, awkBtn.y + 33);
        game.registerButton("boss_awakening", awkBtn.x, awkBtn.y, awkBtn.w, awkBtn.h, () => {
          game.activateAwakeningContinue(bs.mode);
        });

        const retBtn = { x: 650, y: 460, w: 280, h: 54 };
        ctx.fillStyle = "#334155";
        ctx.fillRect(retBtn.x, retBtn.y, retBtn.w, retBtn.h);
        ctx.strokeStyle = "#cbd5e1";
        ctx.strokeRect(retBtn.x, retBtn.y, retBtn.w, retBtn.h);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("◀ RETURN TO STAGE", retBtn.x + retBtn.w / 2, retBtn.y + 33);
        game.registerButton("boss_retreat", retBtn.x, retBtn.y, retBtn.w, retBtn.h, () => {
          game.returnToStageAfterBoss(false);
        });
      }
      ctx.restore();
    }
  }

  window.BossMode = {
    createBossState,
    choosePlayerAttack,
    skipBossBattle,
    updateBoss,
    renderBoss,
  };
})();
