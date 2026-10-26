// public/js/deck.js — Battle Memory Deck, Bonus Lines, OVER Armors, Enhancement, Gacha & World/Raid Hub
(function () {
  function renderDeckScreen(ctx, W, H, game) {
    const armor = game.getEquippedArmor();
    const stats = game.getComputedStats();
    const deckSlots = game.getCurrentDeck();

    ctx.save();
    // Dark cyber metallic background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 54, W, H - 54);

    // 1. LEFT STATUS PANEL (Matches footage C 01:08 - 02:42: LV, HP, ATK, DEF, CST, Bonus Lines)
    const lpX = 20;
    const lpY = 68;
    const lpW = 310;
    const lpH = 580;
    ctx.fillStyle = "#111827";
    ctx.fillRect(lpX, lpY, lpW, lpH);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(lpX, lpY, lpW, lpH);

    // Armor Preview & Name
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(lpX + 12, lpY + 12, lpW - 24, 150);
    Sprites.drawOverCharacter(ctx, lpX + 85, lpY + 135, {
      armor,
      animTime: performance.now() * 0.001,
      running: false,
      chargeTier: stats.bonusLines > 0 ? 2 : 0,
      scale: 1.25,
    });
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "left";
    ctx.fillText(armor.id, lpX + 145, lpY + 42);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px monospace";
    ctx.fillText(armor.name, lpX + 145, lpY + 62);
    ctx.fillStyle = "#93c5fd";
    ctx.font = "11px monospace";
    ctx.fillText(`Element: ${armor.element.toUpperCase()}`, lpX + 145, lpY + 84);
    ctx.fillStyle = "#4ade80";
    ctx.fillText(`Bonus Lines: ${stats.bonusLines} Active`, lpX + 145, lpY + 104);
    ctx.fillText(`Line Mult: +${Math.round(stats.lineBonusPct * 100)}%`, lpX + 145, lpY + 124);

    // Core Stats Table (HP, ATK, DEF, CST)
    const rows = [
      { k: "LV", v: `${game.level}`, c: "#facc15" },
      { k: "HP", v: `${stats.hp} (Base ${armor.baseHP})`, c: "#4ade80" },
      { k: "ATK", v: `${stats.atk} (Base ${armor.baseATK})`, c: "#f87171" },
      { k: "DEF", v: `${stats.def} (Base ${armor.baseDEF})`, c: "#60a5fa" },
      { k: "CST", v: `${stats.totalCost} / ${game.maxCost}`, c: stats.totalCost >= game.maxCost ? "#fbbf24" : "#38bdf8" },
    ];
    rows.forEach((r, idx) => {
      const ry = lpY + 176 + idx * 34;
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(lpX + 12, ry, lpW - 24, 28);
      ctx.fillStyle = r.c;
      ctx.font = "bold 14px monospace";
      ctx.fillText(r.k, lpX + 22, ry + 19);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "right";
      ctx.fillText(r.v, lpX + lpW - 22, ry + 19);
      ctx.textAlign = "left";
    });

    // OVER Armor Switcher (Rule 17 & 18: OVER-1 .. OVER-10)
    ctx.fillStyle = "#93c5fd";
    ctx.font = "bold 13px monospace";
    ctx.fillText("SELECT OVER ARMOR (5 PARTS TO UNLOCK):", lpX + 12, lpY + 365);

    GameData.ARMORS.forEach((a, idx) => {
      const ay = lpY + 376 + idx * 38;
      const unlocked = game.isArmorUnlocked(a.id);
      const parts = game.getArmorPartsCount(a.id);
      const isEq = game.equippedArmorId === a.id;

      ctx.fillStyle = isEq ? "#1d4ed8" : unlocked ? "#1e293b" : "#0f172a";
      ctx.fillRect(lpX + 12, ay, lpW - 24, 33);
      ctx.strokeStyle = isEq ? "#facc15" : unlocked ? "#475569" : "#1e293b";
      ctx.strokeRect(lpX + 12, ay, lpW - 24, 33);

      ctx.fillStyle = unlocked ? "#ffffff" : "#64748b";
      ctx.font = "bold 12px monospace";
      ctx.fillText(`${a.id}: ${a.name.split(" ")[1] || a.name}`, lpX + 20, ay + 21);

      ctx.textAlign = "right";
      ctx.fillStyle = isEq ? "#facc15" : unlocked ? "#4ade80" : "#94a3b8";
      ctx.fillText(isEq ? "EQUIPPED" : unlocked ? "EQUIP" : `${parts}/5 PARTS`, lpX + lpW - 20, ay + 21);
      ctx.textAlign = "left";

      game.registerButton(`select_armor_${a.id}`, lpX + 12, ay, lpW - 24, 33, () => {
        if (unlocked) {
          game.equippedArmorId = a.id;
          game.selectedSlotIdx = 0;
          Sound.SFX.click();
        }
      });
    });

    // 2. CENTER GEOMETRIC BATTLE MEMORY DECK & BONUS LINES (Rules 18, 19, 20)
    const gpX = 346;
    const gpY = 68;
    const gpW = 520;
    const gpH = 580;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(gpX, gpY, gpW, gpH);
    ctx.strokeStyle = "#334155";
    ctx.strokeRect(gpX, gpY, gpW, gpH);

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 15px monospace";
    ctx.fillText("BATTLE MEMORY DECK — BONUS LINE MATRIX", gpX + 16, gpY + 28);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px monospace";
    ctx.fillText("Match connected card colors (or White core) for +14% Bonus Lines!", gpX + 16, gpY + 48);

    // Auto-Optimize Deck Button
    const optBtn = { x: gpX + gpW - 190, y: gpY + 12, w: 175, h: 30 };
    ctx.fillStyle = "#16a34a";
    ctx.fillRect(optBtn.x, optBtn.y, optBtn.w, optBtn.h);
    ctx.strokeStyle = "#86efac";
    ctx.strokeRect(optBtn.x, optBtn.y, optBtn.w, optBtn.h);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("★ AUTO-OPTIMIZE DECK", optBtn.x + optBtn.w / 2, optBtn.y + 19);
    ctx.textAlign = "left";
    game.registerButton("deck_auto_optimize", optBtn.x, optBtn.y, optBtn.w, optBtn.h, () => {
      game.autoOptimizeDeck();
    });

    // Geometric Node Area
    const areaX = gpX + 20;
    const areaY = gpY + 64;
    const areaW = gpW - 40;
    const areaH = 440;

    // Draw Connecting Edges / Bonus Lines first (Rule 20)
    for (const [i, j] of armor.edges) {
      const s1 = armor.slots[i];
      const s2 = armor.slots[j];
      const x1 = areaX + s1.x * areaW;
      const y1 = areaY + s1.y * areaH;
      const x2 = areaX + s2.x * areaW;
      const y2 = areaY + s2.y * areaH;

      const c1 = game.getCardById(deckSlots[i]);
      const c2 = game.getCardById(deckSlots[j]);
      const matched =
        c1 &&
        c2 &&
        (c1.color === c2.color || c1.color === "white" || c2.color === "white");

      ctx.save();
      if (matched) {
        const lineCol =
          c1.color !== "white"
            ? Sprites.COLOR_MAP[c1.color]?.glow || "#38bdf8"
            : Sprites.COLOR_MAP[c2.color]?.glow || "#facc15";
        ctx.strokeStyle = lineCol;
        ctx.lineWidth = 8;
        ctx.shadowColor = lineCol;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Inner white energy core
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 4;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw Slots & Equipped Cards
    const cardW = 92;
    const cardH = 112;
    armor.slots.forEach((slot, idx) => {
      const cx = areaX + slot.x * areaW - cardW / 2;
      const cy = areaY + slot.y * areaH - cardH / 2;
      const card = game.getCardById(deckSlots[idx]);
      const isSelected = game.selectedSlotIdx === idx;
      const slotCol = Sprites.COLOR_MAP[slot.color] || Sprites.COLOR_MAP.blue;

      // Slot background frame
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(cx - 4, cy - 4, cardW + 8, cardH + 8);
      ctx.strokeStyle = isSelected ? "#facc15" : slotCol.border;
      ctx.lineWidth = isSelected ? 3.5 : 2;
      ctx.strokeRect(cx - 4, cy - 4, cardW + 8, cardH + 8);

      if (card) {
        Sprites.drawBattleMemoryCard(ctx, cx, cy, cardW, cardH, card, { selected: isSelected });
      } else {
        ctx.fillStyle = slotCol.glow;
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`SLOT ${idx + 1}`, cx + cardW / 2, cy + cardH / 2 - 6);
        ctx.fillText(`(${slot.color.toUpperCase()})`, cx + cardW / 2, cy + cardH / 2 + 12);
        ctx.textAlign = "left";
      }

      game.registerButton(`deck_slot_${idx}`, cx - 4, cy - 4, cardW + 8, cardH + 8, () => {
        game.selectedSlotIdx = idx;
        Sound.SFX.click();
      });
    });

    // 3. RIGHT PANEL: CARD COLLECTION & EQUIP (Rule 19)
    const rpX = 880;
    const rpY = 68;
    const rpW = W - rpX - 20;
    const rpH = 580;
    ctx.fillStyle = "#111827";
    ctx.fillRect(rpX, rpY, rpW, rpH);
    ctx.strokeStyle = "#3b82f6";
    ctx.strokeRect(rpX, rpY, rpW, rpH);

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 15px monospace";
    ctx.fillText(`CARD INVENTORY (CLICK TO EQUIP SLOT ${(game.selectedSlotIdx || 0) + 1}):`, rpX + 14, rpY + 26);

    const cards = game.cards.slice(0, 9);
    cards.forEach((c, idx) => {
      const cy = rpY + 40 + idx * 58;
      const isEquipped = deckSlots.includes(c.uid);
      const colInfo = Sprites.COLOR_MAP[c.color] || Sprites.COLOR_MAP.blue;

      ctx.fillStyle = isEquipped ? "#1e3a8a" : "#1e293b";
      ctx.fillRect(rpX + 12, cy, rpW - 24, 52);
      ctx.strokeStyle = colInfo.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(rpX + 12, cy, rpW - 24, 52);

      // Color badge
      ctx.fillStyle = colInfo.main;
      ctx.fillRect(rpX + 16, cy + 6, 40, 40);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`C${c.cost}`, rpX + 36, cy + 23);
      ctx.fillText(`Lv.${c.level}`, rpX + 36, cy + 39);
      ctx.textAlign = "left";

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px monospace";
      ctx.fillText(`${c.name} (${"★".repeat(c.rarity)})`, rpX + 66, cy + 21);
      ctx.fillStyle = "#93c5fd";
      ctx.font = "11px monospace";
      ctx.fillText(`HP+${c.hp} ATK+${c.atk} DEF+${c.def} | ${c.skill.name}`, rpX + 66, cy + 40);

      if (isEquipped) {
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "right";
        ctx.fillText("IN DECK", rpX + rpW - 22, cy + 22);
        ctx.textAlign = "left";
      }

      game.registerButton(`inv_card_${idx}`, rpX + 12, cy, rpW - 24, 52, () => {
        game.equipCardToSlot(c.uid, game.selectedSlotIdx || 0);
      });
    });

    ctx.restore();
  }

  // Rule 21 & 23: Card Enhancement (強化) & Gacha Menu
  function renderEnhanceAndGachaScreen(ctx, W, H, game) {
    ctx.save();
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 54, W, H - 54);

    // LEFT HALF: CARD ENHANCEMENT (強化 - Rule 21)
    const lx = 24;
    const ly = 68;
    const lw = 600;
    const lh = 580;
    ctx.fillStyle = "#111827";
    ctx.fillRect(lx, ly, lw, lh);
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.strokeRect(lx, ly, lw, lh);

    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 18px monospace";
    ctx.fillText("BATTLE MEMORY ENHANCEMENT (強化 — FUSE & LEVEL UP)", lx + 18, ly + 32);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "13px monospace";
    ctx.fillText("Select a card below to enhance its Level (+Stats) and Skill Level for Zenny!", lx + 18, ly + 56);

    const targetCard = game.cards[game.enhanceCardIdx || 0] || game.cards[0];
    if (targetCard) {
      Sprites.drawBattleMemoryCard(ctx, lx + 28, ly + 74, 110, 136, targetCard, { selected: true });
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 17px monospace";
      ctx.fillText(`${targetCard.name}  [Lv.${targetCard.level}]`, lx + 158, ly + 100);
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`HP: ${targetCard.hp}   ATK: ${targetCard.atk}   DEF: ${targetCard.def}   COST: ${targetCard.cost}`, lx + 158, ly + 128);
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`Skill: ${targetCard.skill.name} (Skill Lv.${targetCard.skillLv || 1})`, lx + 158, ly + 154);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "13px monospace";
      ctx.fillText(targetCard.skill.desc, lx + 158, ly + 176);

      const enhCost = 120 * targetCard.level;
      const enhBtn = { x: lx + 158, y: ly + 188, w: 260, h: 40 };
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(enhBtn.x, enhBtn.y, enhBtn.w, enhBtn.h);
      ctx.strokeStyle = "#86efac";
      ctx.strokeRect(enhBtn.x, enhBtn.y, enhBtn.w, enhBtn.h);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`⬆ ENHANCE CARD (${enhCost} ZENNY)`, enhBtn.x + enhBtn.w / 2, enhBtn.y + 25);
      ctx.textAlign = "left";
      game.registerButton("enhance_exec", enhBtn.x, enhBtn.y, enhBtn.w, enhBtn.h, () => {
        game.enhanceCard(targetCard, enhCost);
      });
    }

    // Card list to pick base card
    ctx.fillStyle = "#93c5fd";
    ctx.font = "bold 13px monospace";
    ctx.fillText("CHOOSE CARD TO ENHANCE:", lx + 18, ly + 254);
    game.cards.slice(0, 6).forEach((c, idx) => {
      const cy = ly + 266 + idx * 48;
      const sel = (game.enhanceCardIdx || 0) === idx;
      ctx.fillStyle = sel ? "#1e3a8a" : "#1e293b";
      ctx.fillRect(lx + 18, cy, lw - 36, 42);
      ctx.strokeStyle = sel ? "#facc15" : "#334155";
      ctx.strokeRect(lx + 18, cy, lw - 36, 42);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px monospace";
      ctx.fillText(`Lv.${c.level} ${c.name} [${c.color.toUpperCase()}] — HP ${c.hp} / ATK ${c.atk} / DEF ${c.def}`, lx + 30, cy + 26);
      game.registerButton(`enh_pick_${idx}`, lx + 18, cy, lw - 36, 42, () => {
        game.enhanceCardIdx = idx;
        Sound.SFX.click();
      });
    });

    // RIGHT HALF: GACHA SUMMON (Rules 22 & 23: 200 Zenny Normal / 1000 Zenny 5+1 / 300 Crest Special)
    const rx = 648;
    const ry = 68;
    const rw = W - rx - 24;
    const rh = 580;
    ctx.fillStyle = "#111827";
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, rw, rh);

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 18px monospace";
    ctx.fillText("25TH ANNIVERSARY BATTLE MEMORY GACHA", rx + 18, ry + 32);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "13px monospace";
    ctx.fillText(`Balance: ${game.zenny} Zenny  |  ${game.crest} Crest`, rx + 18, ry + 56);

    // Gacha Pull Buttons (Rule 23)
    const g1Btn = { x: rx + 24, y: ry + 78, w: rw - 48, h: 56 };
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(g1Btn.x, g1Btn.y, g1Btn.w, g1Btn.h);
    ctx.strokeStyle = "#93c5fd";
    ctx.strokeRect(g1Btn.x, g1Btn.y, g1Btn.w, g1Btn.h);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("★ NORMAL GACHA 1x PULL — 200 ZENNY", g1Btn.x + g1Btn.w / 2, g1Btn.y + 34);
    game.registerButton("gacha_normal_1", g1Btn.x, g1Btn.y, g1Btn.w, g1Btn.h, () => {
      game.pullGacha("normal1");
    });

    const g6Btn = { x: rx + 24, y: ry + 150, w: rw - 48, h: 56 };
    ctx.fillStyle = "#7e22ce";
    ctx.fillRect(g6Btn.x, g6Btn.y, g6Btn.w, g6Btn.h);
    ctx.strokeStyle = "#e9d5ff";
    ctx.strokeRect(g6Btn.x, g6Btn.y, g6Btn.w, g6Btn.h);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("★★ NORMAL GACHA 5+1 BUNDLE — 1000 ZENNY", g6Btn.x + g6Btn.w / 2, g6Btn.y + 34);
    game.registerButton("gacha_normal_6", g6Btn.x, g6Btn.y, g6Btn.w, g6Btn.h, () => {
      game.pullGacha("normal6");
    });

    const gPremBtn = { x: rx + 24, y: ry + 222, w: rw - 48, h: 60 };
    ctx.fillStyle = "#ca8a04";
    ctx.fillRect(gPremBtn.x, gPremBtn.y, gPremBtn.w, gPremBtn.h);
    ctx.strokeStyle = "#fef08a";
    ctx.strokeRect(gPremBtn.x, gPremBtn.y, gPremBtn.w, gPremBtn.h);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("★★★ PREMIUM CREST GACHA (SR/SSR) — 300 CREST", gPremBtn.x + gPremBtn.w / 2, gPremBtn.y + 36);
    game.registerButton("gacha_premium", gPremBtn.x, gPremBtn.y, gPremBtn.w, gPremBtn.h, () => {
      game.pullGacha("premium");
    });
    ctx.textAlign = "left";

    // Display Latest Gacha Pull Result Cards
    ctx.fillStyle = "#93c5fd";
    ctx.font = "bold 14px monospace";
    ctx.fillText("LATEST GACHA ACQUISITIONS:", rx + 24, ry + 314);
    const pulls = game.lastGachaPulls || game.cards.slice(0, 4);
    pulls.slice(0, 5).forEach((c, idx) => {
      Sprites.drawBattleMemoryCard(ctx, rx + 24 + idx * 110, ry + 330, 98, 128, c, { selected: idx === 0 });
    });

    // Level-Up Status Point Allocation Box (Rule 25: +1 EP per 1 pt, +1 COST per 2 pts)
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(rx + 24, ry + 478, rw - 48, 86);
    ctx.strokeStyle = "#38bdf8";
    ctx.strokeRect(rx + 24, ry + 478, rw - 48, 86);
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`STATUS POINTS AVAILABLE: ${game.statusPoints} PTS (5 Pts / Level Up)`, rx + 36, ry + 502);

    const epPtBtn = { x: rx + 36, y: ry + 514, w: 245, h: 38 };
    ctx.fillStyle = game.statusPoints >= 1 ? "#16a34a" : "#334155";
    ctx.fillRect(epPtBtn.x, epPtBtn.y, epPtBtn.w, epPtBtn.h);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("+1 MAX EP (Cost: 1 Pt)", epPtBtn.x + epPtBtn.w / 2, epPtBtn.y + 24);
    game.registerButton("alloc_ep", epPtBtn.x, epPtBtn.y, epPtBtn.w, epPtBtn.h, () => {
      game.allocateStatusPoint("ep");
    });

    const costPtBtn = { x: rx + 300, y: ry + 514, w: 260, h: 38 };
    ctx.fillStyle = game.statusPoints >= 2 ? "#2563eb" : "#334155";
    ctx.fillRect(costPtBtn.x, costPtBtn.y, costPtBtn.w, costPtBtn.h);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("+1 MAX COST (Cost: 2 Pts)", costPtBtn.x + costPtBtn.w / 2, costPtBtn.y + 24);
    game.registerButton("alloc_cost", costPtBtn.x, costPtBtn.y, costPtBtn.w, costPtBtn.h, () => {
      game.allocateStatusPoint("cost");
    });
    ctx.textAlign = "left";

    ctx.restore();
  }

  // World Map, 3x3 Master Boss Grid, Battle Tower & 1v1 Battle Arena Screen (Rules 10, 16, 27, 28, 29)
  function renderWorldAndModesScreen(ctx, W, H, game) {
    const world = game.getCurrentWorld();
    ctx.save();
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 54, W, H - 54);

    // 1. LEFT COLUMN: WORLD & STAGE SELECTION (Rule 10: 5 stages per world, 5 runs to 100%)
    const lx = 24;
    const ly = 68;
    const lw = 610;
    const lh = 580;
    ctx.fillStyle = "#111827";
    ctx.fillRect(lx, ly, lw, lh);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(lx, ly, lw, lh);

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 17px monospace";
    ctx.fillText("CROSSOVER WORLD MAP & QUEST STAGES", lx + 18, ly + 30);

    // World Tabs (Worlds 1..5)
    GameData.WORLDS.forEach((w, idx) => {
      const wx = lx + 18 + idx * 116;
      const wy = ly + 44;
      const active = game.worldIdx === idx;
      ctx.fillStyle = active ? "#2563eb" : "#1e293b";
      ctx.fillRect(wx, wy, 110, 34);
      ctx.strokeStyle = active ? "#facc15" : "#475569";
      ctx.strokeRect(wx, wy, 110, 34);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`WORLD ${w.id}`, wx + 55, wy + 22);
      ctx.textAlign = "left";
      game.registerButton(`world_tab_${idx}`, wx, wy, 110, 34, () => {
        game.selectWorld(idx);
      });
    });

    ctx.fillStyle = "#93c5fd";
    ctx.font = "bold 15px monospace";
    ctx.fillText(`${world.name} (${world.era}) — Armor Reward: ${world.armorReward}`, lx + 18, ly + 104);

    // 5 Stages in Current World (Rule 10)
    world.stages.forEach((st, idx) => {
      const sy = ly + 118 + idx * 66;
      const prog = game.getStageProgress(world.id, st.id);
      const isCur = game.stageIdx === idx;

      ctx.fillStyle = isCur ? "#1e3a8a" : "#1e293b";
      ctx.fillRect(lx + 18, sy, lw - 36, 58);
      ctx.strokeStyle = isCur ? "#facc15" : "#334155";
      ctx.strokeRect(lx + 18, sy, lw - 36, 58);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px monospace";
      ctx.fillText(`${st.name} (${st.bossName})`, lx + 30, sy + 23);
      ctx.fillStyle = "#4ade80";
      ctx.font = "12px monospace";
      ctx.fillText(`Progress: ${prog}%  |  Drops: ${st.partName}`, lx + 30, sy + 44);

      // Run Stage button
      const runBtn = { x: lx + 345, y: sy + 11, w: 115, h: 36 };
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(runBtn.x, runBtn.y, runBtn.w, runBtn.h);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("▶ RUN STAGE", runBtn.x + runBtn.w / 2, runBtn.y + 23);
      game.registerButton(`stage_run_${idx}`, runBtn.x, runBtn.y, runBtn.w, runBtn.h, () => {
        game.stageIdx = idx;
        game.startActionStage();
      });

      // Fight Boss button
      const bossBtn = { x: lx + 470, y: sy + 11, w: 108, h: 36 };
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(bossBtn.x, bossBtn.y, bossBtn.w, bossBtn.h);
      ctx.fillStyle = "#ffffff";
      ctx.fillText("⚔ BOSS", bossBtn.x + bossBtn.w / 2, bossBtn.y + 23);
      ctx.textAlign = "left";
      game.registerButton(`stage_boss_${idx}`, bossBtn.x, bossBtn.y, bossBtn.w, bossBtn.h, () => {
        game.stageIdx = idx;
        game.startBossBattle("stage");
      });
    });

    // Rule 16 & 27: 3x3 Map Parts Grid & 4-Player Master Boss Raid Box at bottom of Left Column
    const mbY = ly + 455;
    ctx.fillStyle = "#1e1b4b";
    ctx.fillRect(lx + 18, mbY, lw - 36, 112);
    ctx.strokeStyle = "#a855f7";
    ctx.strokeRect(lx + 18, mbY, lw - 36, 112);

    // Draw 3x3 Map Grid (Rule 16)
    const mapParts = game.getWorldMapPartsCount(world.id);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const idx = r * 3 + c;
        const gx = lx + 32 + c * 28;
        const gy = mbY + 14 + r * 28;
        ctx.fillStyle = idx < mapParts ? "#38bdf8" : "#0f172a";
        ctx.fillRect(gx, gy, 24, 24);
        ctx.strokeStyle = "#facc15";
        ctx.strokeRect(gx, gy, 24, 24);
      }
    }

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 15px monospace";
    ctx.fillText(`4-PLAYER MASTER RAID: ${world.masterBoss.name}`, lx + 130, mbY + 30);
    ctx.fillStyle = "#e9d5ff";
    ctx.font = "12px monospace";
    ctx.fillText(`Map Parts: ${mapParts}/9  |  Lv.${world.masterBoss.level}  |  HP: ${world.masterBoss.maxHp}`, lx + 130, mbY + 52);

    const raidBtn = { x: lx + 130, y: mbY + 64, w: 430, h: 36 };
    ctx.fillStyle = "#9333ea";
    ctx.fillRect(raidBtn.x, raidBtn.y, raidBtn.w, raidBtn.h);
    ctx.strokeStyle = "#facc15";
    ctx.strokeRect(raidBtn.x, raidBtn.y, raidBtn.w, raidBtn.h);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("⚔ LAUNCH 4-PLAYER CO-OP MASTER BOSS RAID!", raidBtn.x + raidBtn.w / 2, raidBtn.y + 23);
    ctx.textAlign = "left";
    game.registerButton("launch_master_raid", raidBtn.x, raidBtn.y, raidBtn.w, raidBtn.h, () => {
      game.startBossBattle("raid");
    });

    // 2. RIGHT COLUMN: BATTLE TOWER (Rule 29), BATTLE ARENA PvP (Rule 28) & MULTIPLAYER CHEERS (Rule 26)
    const rx = 654;
    const ry = 68;
    const rw = W - rx - 24;
    const rh = 580;
    ctx.fillStyle = "#111827";
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = "#facc15";
    ctx.strokeRect(rx, ry, rw, rh);

    // (A) Battle Tower Section (Rule 29)
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 17px monospace";
    ctx.fillText(`BATTLE TOWER (バトルタワー) — CURRENT FLOOR: ${game.towerFloor}F`, rx + 18, ry + 32);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "12px monospace";
    ctx.fillText("Boss HP persists across attempts! Clear floors for SR+ Cards, Crest & Zenny.", rx + 18, ry + 54);

    const twBtn = { x: rx + 18, y: ry + 68, w: rw - 36, h: 48 };
    ctx.fillStyle = "#ea580c";
    ctx.fillRect(twBtn.x, twBtn.y, twBtn.w, twBtn.h);
    ctx.strokeStyle = "#fef08a";
    ctx.strokeRect(twBtn.x, twBtn.y, twBtn.w, twBtn.h);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`⚔ CLIMB BATTLE TOWER FLOOR ${game.towerFloor}F (C.Shot Lv.5 Unlocked)`, twBtn.x + twBtn.w / 2, twBtn.y + 30);
    ctx.textAlign = "left";
    game.registerButton("launch_battle_tower", twBtn.x, twBtn.y, twBtn.w, twBtn.h, () => {
      game.startBossBattle("tower");
    });

    // (B) Battle Arena 1v1 PvP Section (Rule 28)
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 17px monospace";
    ctx.fillText(`BATTLE ARENA 1v1 PvP — PP: ${game.pp}/${game.maxPp} | ARENA COINS: ${game.arenaCoins}`, rx + 18, ry + 150);

    const rivals = game.getArenaRivals();
    rivals.slice(0, 3).forEach((rv, idx) => {
      const ay = ry + 166 + idx * 54;
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(rx + 18, ay, rw - 36, 46);
      ctx.strokeStyle = "#475569";
      ctx.strokeRect(rx + 18, ay, rw - 36, 46);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px monospace";
      ctx.fillText(`${rv.name} [Lv.${rv.level} ${rv.armorId}] — HP ${rv.hp} / ATK ${rv.atk}`, rx + 30, ay + 28);

      const duelBtn = { x: rx + rw - 165, y: ay + 7, w: 135, h: 32 };
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(duelBtn.x, duelBtn.y, duelBtn.w, duelBtn.h);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("⚔ DUEL (1 PP)", duelBtn.x + duelBtn.w / 2, duelBtn.y + 21);
      ctx.textAlign = "left";
      game.registerButton(`arena_duel_${idx}`, duelBtn.x, duelBtn.y, duelBtn.w, duelBtn.h, () => {
        game.startArenaBattle(rv);
      });
    });

    // (C) Multiplayer Friends, Bulk Cheer & Room Chat (Rule 26)
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 16px monospace";
    ctx.fillText("MULTIPLAYER ROOM ALLIES & BULK CHEER (一括応援):", rx + 18, ry + 356);

    const bulkBtn = { x: rx + 18, y: ry + 368, w: 265, h: 42 };
    ctx.fillStyle = "#ca8a04";
    ctx.fillRect(bulkBtn.x, bulkBtn.y, bulkBtn.w, bulkBtn.h);
    ctx.strokeStyle = "#fef08a";
    ctx.strokeRect(bulkBtn.x, bulkBtn.y, bulkBtn.w, bulkBtn.h);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText("★ BULK CHEER ALL (+75 ZENNY)", bulkBtn.x + bulkBtn.w / 2, bulkBtn.y + 26);
    game.registerButton("world_bulk_cheer", bulkBtn.x, bulkBtn.y, bulkBtn.w, bulkBtn.h, () => {
      game.sendBulkCheer();
    });

    const chatBtn = { x: rx + 295, y: ry + 368, w: 285, h: 42 };
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(chatBtn.x, chatBtn.y, chatBtn.w, chatBtn.h);
    ctx.strokeStyle = "#bae6fd";
    ctx.strokeRect(chatBtn.x, chatBtn.y, chatBtn.w, chatBtn.h);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("💬 SEND LOBI SHOUTOUT TO ROOM", chatBtn.x + chatBtn.w / 2, chatBtn.y + 26);
    ctx.textAlign = "left";
    game.registerButton("world_send_chat", chatBtn.x, chatBtn.y, chatBtn.w, chatBtn.h, () => {
      game.sendQuickChat("Let's clear the Master Raid together! OVER-1 Ready!");
    });

    // Live Feed / Lobi Community Board
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(rx + 18, ry + 422, rw - 36, 140);
    ctx.strokeStyle = "#334155";
    ctx.strokeRect(rx + 18, ry + 422, rw - 36, 140);
    ctx.fillStyle = "#93c5fd";
    ctx.font = "bold 12px monospace";
    ctx.fillText("LOBI COMMUNITY & MULTIPLAYER LOG:", rx + 28, ry + 442);

    const logs = game.chatLog.slice(-4);
    logs.forEach((msg, i) => {
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "12px monospace";
      ctx.fillText(`• ${msg}`, rx + 28, ry + 466 + i * 22);
    });

    ctx.restore();
  }

  window.DeckUI = {
    renderDeckScreen,
    renderEnhanceAndGachaScreen,
    renderWorldAndModesScreen,
  };
})();
