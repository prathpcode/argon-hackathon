// public/js/game.js — Main Game Loop, State Contract, Top Status Header, Navigation & Multiplayer
(function () {
  window.__events = window.__events || [];
  const startTime = performance.now();

  const params = new URLSearchParams(location.search);
  const playerName = (params.get("name") || "OVER-1").slice(0, 18);
  const roomName = params.get("room") || "main";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const W = 1280;
  const H = 720;

  let nextCardUid = 100;
  function instantiateCard(tpl, level = 1) {
    return {
      uid: `c_${nextCardUid++}`,
      tplId: tpl.tplId,
      name: tpl.name,
      era: tpl.era,
      rarity: tpl.rarity,
      color: tpl.color,
      cost: tpl.cost,
      level,
      skillLv: 1,
      baseHp: tpl.hp,
      baseAtk: tpl.atk,
      baseDef: tpl.def,
      hp: Math.round(tpl.hp * (1 + (level - 1) * 0.14)),
      atk: Math.round(tpl.atk * (1 + (level - 1) * 0.14)),
      def: Math.round(tpl.def * (1 + (level - 1) * 0.14)),
      skill: { ...tpl.skill },
      artType: tpl.artType,
    };
  }

  const game = {
    playerName,
    roomName,
    titleOverlay: true, // Dismissed on very first key or click!
    screen: "stage", // "stage" | "boss" | "deck" | "gacha" | "world"
    drawerOpen: false,

    // Core RPG progression & meters (Rules 22, 24, 25)
    level: 1,
    exp: 0,
    expToNext: 100,
    ep: 23,
    maxEp: 23,
    epTimer: 300, // 5-minute (300s) regeneration timer per Rule 24
    pp: 5,
    maxPp: 5,
    maxCost: 16,
    statusPoints: 5, // Start with 5 Status Points ready to test allocation!
    zenny: 1200,
    crest: 600,
    arenaCoins: 10,
    score: 0,

    // Armors & Battle Memory Deck (Rules 17, 18, 19, 20)
    equippedArmorId: "OVER-1",
    unlockedArmors: { "OVER-1": true },
    armorParts: {
      "OVER-2": 3, // Starts at 3/5 parts so player is close to unlocking OVER-2!
      "OVER-3": 1,
      "OVER-4": 0,
      "OVER-10": 0,
    },
    cards: [],
    decks: {}, // armorId -> array of card uids
    selectedSlotIdx: 0,
    enhanceCardIdx: 0,
    lastGachaPulls: [],

    // World & Stage progression (Rules 10, 16, 29)
    worldIdx: 0,
    stageIdx: 0,
    stageProgressMap: { "1_1": 60 }, // Starts at 60% on 1-1 so 1-2 runs reach 100% Boss!
    worldMapParts: { 1: 6, 2: 2, 3: 0, 4: 0, 5: 0 }, // 3x3 puzzle pieces (Rule 16)
    towerFloor: 1,
    towerBossHp: null,
    awakeningActive: false,

    // Active sub-mode states
    stageState: null,
    bossState: null,

    // Screen shake & UI hitboxes
    shakeTime: 0,
    shakeMag: 0,
    buttons: [],
    toastText: "",
    toastTimer: 0,

    // Social & Multiplayer state
    net: null,
    cheeredIds: {},
    chatLog: [
      "Welcome to Crossover World! Hold fire to charge Tier-3 Red Pierce Shots!",
      "Match card colors in the Deck tab to activate glowing Bonus Lines!",
    ],

    pushEvent(type, extra = {}) {
      const ev = {
        ...extra,
        t: Math.round(performance.now() - startTime),
        type,
      };
      if (extra && extra.type && extra.type !== type) {
        ev.subType = extra.type;
      }
      window.__events.push(ev);
      if (window.__events.length > 250) window.__events.shift();
    },

    showToast(msg) {
      this.toastText = msg;
      this.toastTimer = 2.4;
    },

    triggerShake(mag = 6, dur = 0.25) {
      this.shakeMag = Math.max(this.shakeMag, mag);
      this.shakeTime = Math.max(this.shakeTime, dur);
    },

    addScore(pts) {
      this.score += pts;
      this.pushEvent("score", { score: this.score, delta: pts });
    },

    registerButton(id, x, y, w, h, onClick) {
      this.buttons.push({ id, x, y, w, h, onClick });
    },

    getCurrentWorld() {
      return GameData.WORLDS[this.worldIdx] || GameData.WORLDS[0];
    },

    getCurrentStage() {
      const w = this.getCurrentWorld();
      return w.stages[this.stageIdx] || w.stages[0];
    },

    getStageProgress(wId = this.getCurrentWorld().id, sId = this.getCurrentStage().id) {
      const key = `${wId}_${sId}`;
      return this.stageProgressMap[key] || 0;
    },

    getWorldMapPartsCount(wId = this.getCurrentWorld().id) {
      return this.worldMapParts[wId] || 0;
    },

    collectMapPart(wId = this.getCurrentWorld().id) {
      const cur = this.worldMapParts[wId] || 0;
      const next = Math.min(9, cur + 1);
      this.worldMapParts[wId] = next;
      return next;
    },

    isArmorUnlocked(armorId) {
      return !!this.unlockedArmors[armorId];
    },

    getArmorPartsCount(armorId) {
      if (this.unlockedArmors[armorId]) return 5;
      return this.armorParts[armorId] || 0;
    },

    getEquippedArmor() {
      return GameData.ARMORS.find((a) => a.id === this.equippedArmorId) || GameData.ARMORS[0];
    },

    getCurrentDeck() {
      const a = this.getEquippedArmor();
      if (!this.decks[a.id]) {
        this.decks[a.id] = new Array(a.slots.length).fill(null);
      }
      return this.decks[a.id];
    },

    getCardById(uid) {
      if (!uid) return null;
      return this.cards.find((c) => c.uid === uid) || null;
    },

    getEquippedCards() {
      return this.getCurrentDeck()
        .map((uid) => this.getCardById(uid))
        .filter(Boolean);
    },

    // Rule 18, 19, 20: Compute total stats + Bonus Lines multiplier
    getComputedStats() {
      const armor = this.getEquippedArmor();
      const deckUids = this.getCurrentDeck();
      let cardHp = 0;
      let cardAtk = 0;
      let cardDef = 0;
      let totalCost = 0;
      let bonusPierce = 0;

      deckUids.forEach((uid, idx) => {
        const c = this.getCardById(uid);
        if (!c) return;
        // Matching slot element color gives +10% slot affinity
        const slotMatch = armor.slots[idx] && (armor.slots[idx].color === c.color || c.color === "white") ? 1.1 : 1.0;
        cardHp += Math.round(c.hp * slotMatch);
        cardAtk += Math.round(c.atk * slotMatch);
        cardDef += Math.round(c.def * slotMatch);
        totalCost += c.cost;
        if (c.tplId === "bm_ultimate_x") bonusPierce = 1;
      });

      // Count active Bonus Lines (connected slots with matching border colors or White core, Rule 20)
      let bonusLines = 0;
      for (const [i, j] of armor.edges) {
        const c1 = this.getCardById(deckUids[i]);
        const c2 = this.getCardById(deckUids[j]);
        if (c1 && c2 && (c1.color === c2.color || c1.color === "white" || c2.color === "white")) {
          bonusLines++;
        }
      }

      const lineBonusPct = bonusLines * 0.14; // +14% per Bonus Line
      const levelMult = 1 + (this.level - 1) * 0.06;
      const hp = Math.round((armor.baseHP * levelMult + cardHp) * (1 + lineBonusPct));
      const atk = Math.round((armor.baseATK * levelMult + cardAtk) * (1 + lineBonusPct));
      const def = Math.round((armor.baseDEF * levelMult + cardDef) * (1 + lineBonusPct));

      return {
        hp,
        atk,
        def,
        totalCost,
        bonusLines,
        lineBonusPct,
        bonusPierce,
      };
    },

    initStarterCollection() {
      // Give player a starter set of iconic Battle Memory cards so they have Bonus Lines right away!
      const starterTpls = [
        GameData.CARD_CATALOG[0], // Hunter X-01 (Blue, C2)
        GameData.CARD_CATALOG[2], // Rock Buster Mk-I (Blue, C1)
        GameData.CARD_CATALOG[8], // Navigator Iris (White Core, C4)
        GameData.CARD_CATALOG[3], // Cyber Navi.EXE (Blue, C3)
        GameData.CARD_CATALOG[1], // Crimson Saber Z (Red, C4)
        GameData.CARD_CATALOG[4], // Proto Vanguard (Red, C2)
        GameData.CARD_CATALOG[5], // Star Wave Geo (Yellow, C3)
      ];
      this.cards = starterTpls.map((t) => instantiateCard(t, 1));
      this.lastGachaPulls = this.cards.slice(0, 4);

      // Equip 5 starter cards onto OVER-1 (lighting up Blue + White Bonus Lines!)
      this.decks["OVER-1"] = [
        this.cards[0].uid,
        this.cards[1].uid,
        this.cards[2].uid,
        this.cards[3].uid,
        this.cards[4].uid,
      ];
    },

    grantRandomCard(minRarity = 2) {
      const pool = GameData.CARD_CATALOG.filter((c) => c.rarity >= minRarity);
      const tpl = GameData.choice(pool.length ? pool : GameData.CARD_CATALOG);
      const card = instantiateCard(tpl, 1);
      this.cards.unshift(card);
      return card;
    },

    equipCardToSlot(cardUid, slotIdx) {
      const card = this.getCardById(cardUid);
      if (!card) return;
      const deck = this.getCurrentDeck();

      // If card is already in another slot, swap or remove it first
      const existingIdx = deck.indexOf(cardUid);
      if (existingIdx !== -1 && existingIdx !== slotIdx) {
        deck[existingIdx] = deck[slotIdx];
      }

      // Check Rule 19: Total equipped card Cost cannot exceed player's max COST
      const prevUid = deck[slotIdx];
      deck[slotIdx] = cardUid;
      const newStats = this.getComputedStats();
      if (newStats.totalCost > this.maxCost) {
        deck[slotIdx] = prevUid;
        this.showToast(`COST LIMIT EXCEEDED! (${newStats.totalCost}/${this.maxCost} CST)`);
        Sound.SFX.warning();
        return;
      }

      Sound.SFX.cardDrop();
      this.showToast(`Equipped ${card.name}! Active Bonus Lines: ${newStats.bonusLines}`);
      this.pushEvent("item_use", { action: "equip_card", card: card.name, bonusLines: newStats.bonusLines });
    },

    autoOptimizeDeck() {
      const armor = this.getEquippedArmor();
      const deck = new Array(armor.slots.length).fill(null);
      let usedCost = 0;
      const usedUids = new Set();

      // Prioritize blue/matching color + white wildcard core within maxCost
      const sorted = [...this.cards].sort((a, b) => b.atk + b.hp * 0.4 - (a.atk + a.hp * 0.4));
      for (let i = 0; i < armor.slots.length; i++) {
        const prefColor = armor.slots[i].color;
        const match =
          sorted.find((c) => !usedUids.has(c.uid) && (c.color === prefColor || c.color === "white") && usedCost + c.cost <= this.maxCost) ||
          sorted.find((c) => !usedUids.has(c.uid) && usedCost + c.cost <= this.maxCost);
        if (match) {
          deck[i] = match.uid;
          usedUids.add(match.uid);
          usedCost += match.cost;
        }
      }
      this.decks[armor.id] = deck;
      const st = this.getComputedStats();
      Sound.SFX.levelUp();
      this.showToast(`Deck Optimized! ${st.bonusLines} Bonus Lines Active (+${Math.round(st.lineBonusPct * 100)}%)!`);
    },

    // Rule 21: Card Enhancement (fuse fodder & Zenny to increase Card Level & Skill Level)
    enhanceCard(card, costZenny) {
      if (!card) return;
      if (this.zenny < costZenny) {
        this.showToast("Not enough Zenny! Run stages or Cheer friends for Zenny!");
        return;
      }
      this.zenny -= costZenny;
      card.level += 1;
      card.skillLv = Math.min(10, (card.skillLv || 1) + 1);
      card.hp = Math.round(card.baseHp * (1 + (card.level - 1) * 0.16));
      card.atk = Math.round(card.baseAtk * (1 + (card.level - 1) * 0.16));
      card.def = Math.round(card.baseDef * (1 + (card.level - 1) * 0.16));
      Sound.SFX.levelUp();
      this.showToast(`Enhanced ${card.name} to Lv.${card.level} (Skill Lv.${card.skillLv})!`);
      this.pushEvent("item_use", { action: "enhance_card", card: card.name, level: card.level });
    },

    // Rule 23: Normal Gacha (200Z / 1000Z 5+1) & Premium Gacha (300 Crest)
    pullGacha(type) {
      if (type === "normal1") {
        if (this.zenny < 200) return this.showToast("Need 200 Zenny for Normal Gacha!");
        this.zenny -= 200;
        const c = this.grantRandomCard(2);
        this.lastGachaPulls = [c];
        Sound.SFX.cardDrop();
        this.showToast(`Gacha Pull: ${c.name} (★${c.rarity})!`);
      } else if (type === "normal6") {
        if (this.zenny < 1000) return this.showToast("Need 1000 Zenny for 5+1 Bundle!");
        this.zenny -= 1000;
        const pulls = [];
        for (let i = 0; i < 6; i++) pulls.push(this.grantRandomCard(i === 0 ? 4 : 2));
        this.lastGachaPulls = pulls;
        Sound.SFX.victory();
        this.showToast(`5+1 Bundle! Pulled ${pulls[0].name} + 5 cards!`);
      } else if (type === "premium") {
        if (this.crest < 300) return this.showToast("Need 300 Crest for Premium Gacha!");
        this.crest -= 300;
        const c = this.grantRandomCard(5);
        this.lastGachaPulls = [c];
        Sound.SFX.victory();
        this.showToast(`SSR/SR+ PULL! Got ${c.name} (★${c.rarity})!`);
      }
      this.pushEvent("pickup", { type: "gacha", gachaType: type });
    },

    // Rule 25: Distribute Level-Up Status Points (+1 EP per 1 pt, +1 COST per 2 pts)
    allocateStatusPoint(stat) {
      if (stat === "ep" && this.statusPoints >= 1) {
        this.statusPoints -= 1;
        this.maxEp += 1;
        this.ep = this.maxEp;
        Sound.SFX.levelUp();
        this.showToast(`Max EP increased to ${this.maxEp} & EP Refilled!`);
      } else if (stat === "cost" && this.statusPoints >= 2) {
        this.statusPoints -= 2;
        this.maxCost += 1;
        Sound.SFX.levelUp();
        this.showToast(`Max Deck COST increased to ${this.maxCost}!`);
      } else {
        this.showToast("Not enough Status Points! Level up in stages to earn +5 Pts!");
      }
    },

    gainExp(amount) {
      this.exp += amount;
      while (this.exp >= this.expToNext) {
        this.exp -= this.expToNext;
        this.level += 1;
        this.expToNext = Math.round(this.expToNext * 1.25);
        // Rule 25: Each Level Up grants 5 Status Points and fully refills EP!
        this.statusPoints += 5;
        this.ep = this.maxEp;
        this.pp = this.maxPp;
        Sound.SFX.levelUp();
        this.showToast(`LEVEL UP!! Lv.${this.level}! +5 Status Points & EP Full Refill!`);
        this.pushEvent("score", { type: "level_up", level: this.level });
      }
    },

    applyStageRunRewards(st) {
      const w = this.getCurrentWorld();
      const s = this.getCurrentStage();
      const key = `${w.id}_${s.id}`;
      // Rule 10: Advance stage progress toward 100% (20-40% per run so it's brisk & fun!)
      const nextProg = Math.min(100, (this.stageProgressMap[key] || 0) + 40);
      this.stageProgressMap[key] = nextProg;
      this.gainExp(st.runExp + 35);
      this.pushEvent("win", { mode: "stage_clear", stage: s.name, progress: nextProg });
    },

    onStageRunComplete() {
      const prog = this.getStageProgress();
      if (prog >= 100) {
        this.startBossBattle("stage");
      } else {
        this.startActionStage();
      }
    },

    // Rule 17: Defeating a stage Boss awards Armor Parts & unlocks next stage/world
    applyBossVictoryRewards(bs) {
      const w = this.getCurrentWorld();
      const zenny = 450 + w.id * 180;
      const exp = 85 + w.id * 35;
      const crest = 100;
      this.zenny += zenny;
      this.crest += crest;
      this.gainExp(exp);

      const card = this.grantRandomCard(bs.mode === "raid" || bs.mode === "tower" ? 4 : 3);
      let armorPart = null;
      let targetArmor = w.armorReward || "OVER-2";
      let partsOwned = 0;
      let unlockedArmor = null;

      if (bs.mode === "stage") {
        const s = this.getCurrentStage();
        armorPart = s.partName;
        this.armorParts[targetArmor] = Math.min(5, (this.armorParts[targetArmor] || 0) + 1);
        partsOwned = this.armorParts[targetArmor];
        if (partsOwned >= 5 && !this.unlockedArmors[targetArmor]) {
          this.unlockedArmors[targetArmor] = true;
          unlockedArmor = targetArmor;
          this.showToast(`NEW ARMOR UNLOCKED: ${targetArmor}!!`);
        }
        // Advance to next stage in world
        if (this.stageIdx < w.stages.length - 1) {
          this.stageIdx++;
        } else if (this.worldIdx < GameData.WORLDS.length - 1) {
          this.worldIdx++;
          this.stageIdx = 0;
        }
      } else if (bs.mode === "tower") {
        this.towerFloor += 1;
        this.towerBossHp = null;
        this.showToast(`Battle Tower Floor ${this.towerFloor - 1} Cleared!`);
      } else if (bs.mode === "arena") {
        this.arenaCoins += 5;
        this.showToast(`Arena Victory! +5 Arena Coins!`);
      } else if (bs.mode === "raid") {
        this.armorParts["OVER-10"] = Math.min(5, (this.armorParts["OVER-10"] || 0) + 2);
        if (this.armorParts["OVER-10"] >= 5) {
          this.unlockedArmors["OVER-10"] = true;
          unlockedArmor = "OVER-10";
        }
      }

      return { zenny, exp, crest, card, armorPart, targetArmor, partsOwned, unlockedArmor };
    },

    // Rule 14: Awakening Continue (100 Crest for +20% HP/ATK/DEF and 2x Skill Rate)
    activateAwakeningContinue(mode) {
      if (this.crest >= 100) {
        this.crest -= 100;
      }
      this.awakeningActive = true;
      Sound.SFX.levelUp();
      this.showToast("AWAKENING ACTIVATED! HP/ATK/DEF +20% & 2x Skill Rate!");
      this.startBossBattle(mode);
    },

    startActionStage() {
      const w = this.getCurrentWorld();
      this.ep = Math.max(0, this.ep - Math.min(this.ep, w.epCost));
      this.screen = "stage";
      Sound.setMode("stage");
      this.stageState = StageMode.createStageState(this);
      this.pushEvent("area_change", { area: `${w.name} - ${this.getCurrentStage().name}`, mode: "stage" });
    },

    startBossBattle(mode = "stage", customTarget = null) {
      this.screen = "boss";
      Sound.setMode("boss");
      this.bossState = BossMode.createBossState(this, mode, customTarget);
      this.pushEvent("area_change", { area: `Boss: ${this.bossState.boss.name}`, mode });
    },

    startArenaBattle(rival) {
      if (this.pp > 0) this.pp -= 1;
      this.startBossBattle("arena", rival);
    },

    returnToStageAfterBoss() {
      this.startActionStage();
    },

    selectWorld(idx) {
      this.worldIdx = Math.max(0, Math.min(GameData.WORLDS.length - 1, idx));
      this.stageIdx = 0;
      Sound.SFX.click();
      this.pushEvent("area_change", { area: this.getCurrentWorld().name });
    },

    // Rule 26: Recent Players & Bulk Cheer (一括応援)
    getRecentPlayers(count = 3) {
      const list = [];
      if (this.net && this.net.players) {
        for (const p of this.net.players.values()) {
          const ps = p.s || {};
          list.push({
            id: `peer_${p.id}`,
            name: p.name || `Player ${p.id}`,
            level: ps.level || 3,
            armorId: ps.armorId || "OVER-1",
            hp: ps.maxHp || 950,
            atk: ps.atk || 340,
            def: ps.def || 280,
            cheered: !!this.cheeredIds[`peer_${p.id}`],
          });
        }
      }
      for (const ai of GameData.AI_RIVALS) {
        if (list.length >= count) break;
        list.push({
          ...ai,
          cheered: !!this.cheeredIds[ai.id],
        });
      }
      return list.slice(0, count);
    },

    getArenaRivals() {
      return this.getRecentPlayers(4);
    },

    sendCheer(peer) {
      this.cheeredIds[peer.id] = true;
      this.zenny += 25;
      Sound.SFX.cheer();
      this.showToast(`Cheered ${peer.name}! Earned +25 Zenny!`);
      if (this.net) {
        this.net.send("cheer", { fromName: this.playerName, toName: peer.name });
      }
      this.pushEvent("chat", { kind: "cheer", target: peer.name });
    },

    sendBulkCheer() {
      const peers = this.getRecentPlayers(3);
      peers.forEach((p) => (this.cheeredIds[p.id] = true));
      this.zenny += 75;
      Sound.SFX.cheer();
      this.showToast("一括応援 (Bulk Cheer Sent to All Allies)! +75 Zenny!");
      if (this.net) {
        this.net.send("cheer", { fromName: this.playerName, bulk: true });
      }
      this.chatLog.push(`${this.playerName} sent a Bulk Cheer (+75 Zenny)!`);
      this.pushEvent("chat", { kind: "bulk_cheer", zenny: 75 });
    },

    sendQuickChat(text) {
      this.chatLog.push(`${this.playerName}: ${text}`);
      Sound.SFX.cheer();
      if (this.net) {
        this.net.send("chat", { fromName: this.playerName, text });
      }
      this.pushEvent("chat", { text });
    },
  };

  // Initialize starter deck & first stage
  game.initStarterCollection();
  game.stageState = StageMode.createStageState(game);

  // Connect Multiplayer (public/net.js)
  if (window.Net) {
    game.net = Net.connect({
      name: playerName,
      room: roomName,
      onJoin(p) {
        game.chatLog.push(`★ ${p.name || "Player"} warped into Crossover World!`);
        game.pushEvent("join", { id: p.id, name: p.name });
      },
      onLeave(p) {
        game.pushEvent("leave", { id: p.id, name: p.name });
      },
      onMsg(m) {
        if (m.t === "cheer") {
          game.zenny += 25;
          Sound.SFX.cheer();
          game.showToast(`★ ${m.fromName || "Ally"} sent you a Cheer! (+25 Zenny)`);
          game.chatLog.push(`${m.fromName || "Ally"} cheered the squad! (+25Z)`);
        } else if (m.t === "chat") {
          game.chatLog.push(`${m.fromName || "Ally"}: ${m.text}`);
          game.pushEvent("chat", { from: m.fromName, text: m.text });
        } else if (m.t === "raidHit" && game.screen === "boss" && game.bossState && game.bossState.mode === "raid") {
          game.bossState.boss.hp = Math.max(0, Math.min(game.bossState.boss.hp, m.hp));
          game.bossState.floatTexts.push({
            x: 920,
            y: 410,
            text: `${m.fromName}: -${m.dmg}!`,
            color: "#38bdf8",
            life: 0.9,
          });
        }
      },
    });
  }

  // Render Top Status Header & Navigation Tabs (Matches Footage A 04:13, C 01:03)
  function renderTopHeaderAndNav() {
    ctx.save();
    // Metallic Top Status Bar (H = 54px)
    const grad = ctx.createLinearGradient(0, 0, 0, 54);
    grad.addColorStop(0, "#1e293b");
    grad.addColorStop(1, "#090d16");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 54);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 54);
    ctx.lineTo(W, 54);
    ctx.stroke();

    // Left Box: Player Name + Silver Zenny + Gold Crest (Rule 22)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${game.playerName} [${game.equippedArmorId}]`, 14, 20);

    // Silver Coin + Zenny
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.arc(22, 38, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 13px monospace";
    ctx.fillText(`${game.zenny} Z`, 34, 42);

    // Gold Coin + Crest
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(125, 38, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fef08a";
    ctx.fillText(`${game.crest} CR`, 137, 42);

    // Center Meters: EXP / LV, EP + Timer, PP 5 Pips (Rule 24)
    // 1. EXP & LV
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 12px monospace";
    ctx.fillText(`EXP`, 235, 20);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(268, 10, 92, 11);
    ctx.fillStyle = "#f97316";
    ctx.fillRect(269, 11, 90 * Math.min(1, game.exp / game.expToNext), 9);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`LV.${game.level}`, 368, 20);

    // 2. EP & 5-min Regen Timer
    ctx.fillStyle = "#facc15";
    ctx.fillText(`EP`, 235, 42);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(268, 31, 92, 11);
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(269, 32, 90 * Math.min(1, game.ep / game.maxEp), 9);
    const mins = Math.floor(game.epTimer / 60);
    const secs = String(Math.floor(game.epTimer % 60)).padStart(2, "0");
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${game.ep}/${game.maxEp} (${mins}:${secs})`, 368, 42);

    // 3. PP (5 green pips for Battle Arena PvP)
    ctx.fillStyle = "#4ade80";
    ctx.fillText(`PP`, 495, 20);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < game.pp ? "#22c55e" : "#1e293b";
      ctx.fillRect(520 + i * 15, 10, 12, 11);
      ctx.strokeStyle = "#86efac";
      ctx.strokeRect(520 + i * 15, 10, 12, 11);
    }
    const peerCount = 1 + (game.net && game.net.players ? game.net.players.size : 0);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`ONLINE SQUAD: ${peerCount}P`, 495, 42);

    // Right Command Tabs for 1-Click Mode Switching
    const tabs = [
      { id: "tab_stage", label: "1:STAGE", screen: "stage", action: () => game.startActionStage() },
      { id: "tab_boss", label: "2:BOSS", screen: "boss", action: () => game.startBossBattle("stage") },
      { id: "tab_raid", label: "3:4P RAID", screen: "raid", action: () => game.startBossBattle("raid") },
      { id: "tab_deck", label: "4:DECK/ARMOR", screen: "deck", action: () => (game.screen = "deck") },
      { id: "tab_gacha", label: "5:ENHANCE/GACHA", screen: "gacha", action: () => (game.screen = "gacha") },
      { id: "tab_world", label: "6:WORLD/ARENA", screen: "world", action: () => (game.screen = "world") },
    ];

    let tx = 625;
    tabs.forEach((t) => {
      const tw = t.label.length * 8 + 18;
      const isAct =
        (t.screen === "raid" && game.screen === "boss" && game.bossState?.mode === "raid") ||
        (t.screen === "boss" && game.screen === "boss" && game.bossState?.mode !== "raid") ||
        (t.screen !== "raid" && t.screen !== "boss" && game.screen === t.screen);

      ctx.fillStyle = isAct ? "#2563eb" : "#1e293b";
      ctx.fillRect(tx, 10, tw, 34);
      ctx.strokeStyle = isAct ? "#facc15" : "#475569";
      ctx.lineWidth = isAct ? 2.5 : 1.5;
      ctx.strokeRect(tx, 10, tw, 34);

      ctx.fillStyle = isAct ? "#fef08a" : "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(t.label, tx + tw / 2, 31);

      game.registerButton(t.id, tx, 10, tw, 34, () => {
        Sound.SFX.click();
        t.action();
      });
      tx += tw + 6;
    });

    // Toast notification banner at bottom-center
    if (game.toastTimer > 0 && game.toastText) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.fillRect(W / 2 - 280, H - 42, 560, 32);
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - 280, H - 42, 560, 32);
      ctx.fillStyle = "#fef08a";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(game.toastText, W / 2, H - 21);
    }

    ctx.restore();
  }

  // Title Splash Overlay (Dismissed with any single key or click!)
  function renderTitleOverlay() {
    ctx.save();
    ctx.fillStyle = "rgba(7, 11, 25, 0.78)";
    ctx.fillRect(0, 0, W, H);

    const bw = 780;
    const bh = 440;
    const bx = W / 2 - bw / 2;
    const by = 135;
    ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 4;
    ctx.strokeRect(bx, by, bw, bh);

    // Top Gold Anniversary Ribbon
    ctx.fillStyle = "#facc15";
    ctx.fillRect(bx, by, bw, 36);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("★ 25TH ANNIVERSARY CROSSOVER ACTION RPG REVIVAL ★", W / 2, by + 24);

    // Game Title
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 40px monospace";
    ctx.fillText("CYBER-OVER: MEMORY HORIZON", W / 2, by + 95);

    // Hero OVER-1 & OVER-10 Showcase
    Sprites.drawOverCharacter(ctx, W / 2 - 140, by + 235, {
      armor: GameData.ARMORS[0],
      animTime: performance.now() * 0.001,
      running: true,
      chargeTier: 3,
      scale: 1.5,
    });
    Sprites.drawOverCharacter(ctx, W / 2 + 140, by + 235, {
      armor: GameData.ARMORS[4],
      animTime: performance.now() * 0.001,
      running: true,
      chargeTier: 2,
      facing: -1,
      scale: 1.5,
    });

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "14px monospace";
    ctx.fillText("Auto-Charge Pierce Shots • 6-Beam Giga Crush • Bonus Line Decks • 4P Master Raids", W / 2, by + 295);
    ctx.fillStyle = "#93c5fd";
    ctx.font = "13px monospace";
    ctx.fillText("Controls: [SPACE / ↑] Jump   [X / →] Charge Shot   [C / SHIFT] Giga Crush / C.Shot", W / 2, by + 326);

    // Pulsing Start Button
    const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.03;
    ctx.save();
    ctx.translate(W / 2, by + 382);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(-235, -26, 470, 52);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 3;
    ctx.strokeRect(-235, -26, 470, 52);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px monospace";
    ctx.fillText("▶ PRESS ANY KEY OR CLICK TO WARP IN", 0, 6);
    ctx.restore();

    ctx.restore();
  }

  function dismissTitleAndStart() {
    if (!game.titleOverlay) return;
    game.titleOverlay = false;
    Sound.ensureCtx();
    Sound.startBGM();
    Sound.SFX.warp();
    game.pushEvent("area_change", { area: game.getCurrentWorld().name, action: "start_game" });
  }

  // Keyboard Input Handling
  window.addEventListener("keydown", (e) => {
    Sound.ensureCtx();
    Sound.startBGM();

    if (game.titleOverlay) {
      dismissTitleAndStart();
    }

    const code = e.code;
    // Mode hotkeys 1-6
    if (code === "Digit1") return game.startActionStage();
    if (code === "Digit2") return game.startBossBattle("stage");
    if (code === "Digit3") return game.startBossBattle("raid");
    if (code === "Digit4") return (game.screen = "deck");
    if (code === "Digit5") return (game.screen = "gacha");
    if (code === "Digit6") return (game.screen = "world");
    if (code === "KeyM") return Sound.toggleMute();

    if (game.screen === "stage" && game.stageState) {
      const st = game.stageState;
      if (st.cleared && (code === "Space" || code === "Enter" || code === "KeyX")) {
        e.preventDefault();
        game.onStageRunComplete();
        return;
      }
      if (code === "Space" || code === "ArrowUp" || code === "KeyW" || code === "KeyZ") {
        e.preventDefault();
        StageMode.triggerJump(st, game);
      } else if (code === "KeyX" || code === "ArrowRight" || code === "KeyJ" || code === "Enter") {
        e.preventDefault();
        StageMode.triggerShot(st, game);
      } else if (code === "KeyC" || code === "KeyK" || code === "ShiftLeft" || code === "ShiftRight") {
        e.preventDefault();
        StageMode.triggerGigaCrush(st, game);
      } else if (code === "KeyA") {
        st.autoPlay = !st.autoPlay;
      }
    } else if (game.screen === "boss" && game.bossState) {
      const bs = game.bossState;
      if (bs.turnPhase === "ended" && (code === "Space" || code === "Enter" || code === "KeyX")) {
        e.preventDefault();
        game.returnToStageAfterBoss(bs.outcome === "win");
        return;
      }
      if (code === "Space" || code === "KeyX" || code === "ArrowRight" || code === "Enter") {
        e.preventDefault();
        BossMode.choosePlayerAttack(bs, game, false);
      } else if (code === "KeyC" || code === "ShiftLeft" || code === "ShiftRight" || code === "ArrowUp") {
        e.preventDefault();
        BossMode.choosePlayerAttack(bs, game, true);
      } else if (code === "KeyS") {
        BossMode.skipBossBattle(bs, game);
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    if (game.screen === "stage" && game.stageState) {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW" || e.code === "KeyZ") {
        StageMode.releaseJump(game.stageState);
      }
    }
  });

  // Mouse / Pointer Click Handling
  canvas.addEventListener("pointerdown", (e) => {
    Sound.ensureCtx();
    Sound.startBGM();

    if (game.titleOverlay) {
      dismissTitleAndStart();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const my = ((e.clientY - rect.top) / rect.height) * H;

    // Check registered UI buttons (in reverse order so top-most wins)
    for (let i = game.buttons.length - 1; i >= 0; i--) {
      const b = game.buttons[i];
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        b.onClick();
        return;
      }
    }

    // Default canvas click action in Stage or Boss mode
    if (game.screen === "stage" && game.stageState) {
      if (mx < W * 0.5) {
        StageMode.triggerJump(game.stageState, game);
      } else {
        StageMode.triggerShot(game.stageState, game);
      }
    } else if (game.screen === "boss" && game.bossState) {
      BossMode.choosePlayerAttack(game.bossState, game, true);
    }
  });

  // Sync live state & window.State contract
  function syncWindowAndNetworkState(dt) {
    // 5-minute EP regeneration timer (Rule 24)
    if (game.ep < game.maxEp) {
      game.epTimer -= dt;
      if (game.epTimer <= 0) {
        game.ep = Math.min(game.maxEp, game.ep + 1);
        game.epTimer = 300;
      }
    } else {
      game.epTimer = 300;
    }

    if (game.toastTimer > 0) game.toastTimer = Math.max(0, game.toastTimer - dt);
    if (game.shakeTime > 0) game.shakeTime = Math.max(0, game.shakeTime - dt);

    const st = game.stageState;
    const bs = game.bossState;
    const stats = game.getComputedStats();

    const px = game.screen === "stage" && st ? Math.round(st.scrollX + 270) : 270;
    const py = game.screen === "stage" && st ? Math.round(st.py) : 540;
    const curHp = game.screen === "boss" && bs ? bs.playerHp : stats.hp;

    window.State = {
      name: game.playerName,
      room: game.roomName,
      screen: game.screen,
      titleOverlay: game.titleOverlay,
      area: `${game.getCurrentWorld().name} - ${game.getCurrentStage().name}`,
      x: px,
      y: py,
      vx: game.screen === "stage" && st && !st.cleared ? st.runSpeed : 0,
      vy: game.screen === "stage" && st ? Math.round(st.vy) : 0,
      health: curHp,
      maxHealth: stats.hp,
      atk: stats.atk,
      def: stats.def,
      bonusLines: stats.bonusLines,
      score: game.score,
      level: game.level,
      exp: game.exp,
      ep: game.ep,
      maxEp: game.maxEp,
      pp: game.pp,
      cost: stats.totalCost,
      maxCost: game.maxCost,
      statusPoints: game.statusPoints,
      zenny: game.zenny,
      crest: game.crest,
      equippedArmor: game.equippedArmorId,
      chargeTier: st ? st.chargeTier : 0,
      gigaGauge: st ? Math.round(st.gigaGauge) : 0,
      stageProgress: game.getStageProgress(),
      mapParts: game.getWorldMapPartsCount(),
      towerFloor: game.towerFloor,
      camera: { x: st ? Math.round(st.scrollX) : 0, y: 0 },
      online: !!(game.net && game.net.online),
      players: game.net && game.net.players ? game.net.players.size + 1 : 1,
    };

    if (game.net) {
      game.net.state({
        x: px,
        py,
        armorId: game.equippedArmorId,
        level: game.level,
        maxHp: stats.hp,
        atk: stats.atk,
        def: stats.def,
        chargeTier: st ? st.chargeTier : 0,
        shooting: st ? st.shootAnim : 0,
        screen: game.screen,
      });
    }
  }

  // Fixed-timestep 60 FPS Simulation & Render Loop
  let lastFrame = performance.now();
  const FIXED_DT = 1 / 60;
  let accum = 0;

  function frame(now) {
    const elapsed = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    accum += elapsed;

    while (accum >= FIXED_DT) {
      if (!game.titleOverlay) {
        if (game.screen === "stage" && game.stageState) {
          StageMode.updateStage(game.stageState, game, FIXED_DT);
        } else if (game.screen === "boss" && game.bossState) {
          BossMode.updateBoss(game.bossState, game, FIXED_DT);
        }
      }
      syncWindowAndNetworkState(FIXED_DT);
      accum -= FIXED_DT;
    }

    // Clear UI button hitboxes for current frame
    game.buttons.length = 0;

    ctx.save();
    if (game.shakeTime > 0) {
      const sx = (Math.random() - 0.5) * game.shakeMag * 2;
      const sy = (Math.random() - 0.5) * game.shakeMag * 2;
      ctx.translate(sx, sy);
    }

    if (game.screen === "stage" && game.stageState) {
      StageMode.renderStage(ctx, W, H, game.stageState, game);
    } else if (game.screen === "boss" && game.bossState) {
      BossMode.renderBoss(ctx, W, H, game.bossState, game);
    } else if (game.screen === "deck") {
      DeckUI.renderDeckScreen(ctx, W, H, game);
    } else if (game.screen === "gacha") {
      DeckUI.renderEnhanceAndGachaScreen(ctx, W, H, game);
    } else if (game.screen === "world") {
      DeckUI.renderWorldAndModesScreen(ctx, W, H, game);
    }

    renderTopHeaderAndNav();

    if (game.titleOverlay) {
      renderTitleOverlay();
    }
    ctx.restore();

    requestAnimationFrame(frame);
  }

  window.Game = game;
  requestAnimationFrame(frame);
})();
