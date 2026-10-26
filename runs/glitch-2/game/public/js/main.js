// Main simulation, controls, multiplayer sync, verb execution, and visual effects for Ur's Whimsy
(function () {
  const startTime = performance.now();
  window.__events = window.__events || [];
  function pushEvent(type, data) {
    const evt = { t: Math.round(performance.now() - startTime), type, ...(data || {}) };
    window.__events.push(evt);
    if (window.__events.length > 300) window.__events.shift();
  }

  // Seeded RNG (?seed=)
  const params = new URLSearchParams(location.search);
  const seedStr = params.get("seed") || "ur-whimsy-2012";
  let seedVal = 0;
  for (let i = 0; i < seedStr.length; i++) seedVal = (seedVal * 31 + seedStr.charCodeAt(i)) >>> 0;
  function rand() {
    seedVal = (seedVal + 0x6d2b79f5) | 0;
    let t = Math.imul(seedVal ^ (seedVal >>> 15), 1 | seedVal);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const playerName = (params.get("name") || "Beau").slice(0, 20);
  const { ITEMS, SKILLS, GIANTS, QUESTS, BADGES, AVATAR_OPTIONS } = window.GameData;

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  const streets = window.StreetsSys.createStreets();

  const game = {
    area: "home_street",
    streets,
    mood: 88,
    maxMood: 100,
    energy: 430,
    maxEnergy: 490,
    xp: 120, // iMG / XP
    level: 3,
    currants: 250,
    brainCapacity: 5,
    learnedSkills: { soil_1: true },
    trainingSkill: { id: "mining_1", name: "Mining I", elapsed: 8, total: 25 },
    questProgress: { q_welcome: 0, q_critters: 0, q_bureaucrat: 0, q_social: 0 },
    questDone: {},
    giantFavor: { Cosma: 10, Zille: 10, Humbaba: 5, Grendaline: 10, Lem: 5, Alph: 5 },
    badges: {},
    visitorLog: ["DeadSparrow", "LeelaTurkey", "Xynara"],
    placedFurniture: [{ id: "lantern", x: 645 }],
    furnitureMode: false,
    bureaucraticCertified: false,
    waitingTimer: 0,
    chatChannel: 0, // 0: Local, 1: Global, 2: Help
    followTargetId: null,
    transitionTimer: 0,
    transitionText: "",
    giantBanner: null,
    screenShake: 0,

    player: {
      id: 0,
      name: playerName,
      x: 680,
      y: 375,
      vx: 0,
      vy: 0,
      dir: 1,
      onGround: true,
      coyoteTimer: 0,
      jumpBuffer: 0,
      dropThroughTimer: 0,
      anim: "idle",
      animTimer: 0,
      squashX: 1,
      squashY: 1,
      sizeScale: 1,
      speech: "Hello Ur!",
      speechTimer: 3.5,
      thoughtTool: null,
      thoughtTimer: 0,
      hiSign: "Bats",
      look: {
        skinColor: "#f7d7c4",
        hairColor: "#f4d03f",
        hairStyle: "Side Part",
        shirtColor: "#212529",
        pantsColor: "#1c2833",
        hat: "None",
      },
    },

    // 16 inventory slots with iconic Glitch starting items & tools
    inventory: [
      { id: "pickaxe", count: 1 },
      { id: "watering_can", count: 1 },
      { id: "shovel", count: 1 },
      { id: "butterfly_lotion", count: 3 },
      { id: "pumpkin_ale", count: 2 },
      { id: "random_kindness", count: 2 },
      { id: "sparkle_powder", count: 2 },
      { id: "cubimal", count: 1 },
      { id: "musicblock", count: 1 },
      { id: "die12", count: 1 },
      { id: "shrinking_tonic", count: 1 },
      { id: "cherry", count: 8 },
      { id: "grain", count: 12 },
      { id: "bean", count: 10 },
      { id: "beryl", count: 2 },
      { id: "plank", count: 3 },
    ],

    particles: [],
    floatingTexts: [],
    arcDrops: [],
    rainbows: [],
    cubimalRaces: [],
    hoveredObj: null,
    camX: 280,

    addItem(id, count = 1) {
      for (let i = 0; i < 16; i++) {
        if (this.inventory[i] && this.inventory[i].id === id) {
          this.inventory[i].count += count;
          ui.renderInventory();
          return true;
        }
      }
      for (let i = 0; i < 16; i++) {
        if (!this.inventory[i] || this.inventory[i].count <= 0) {
          this.inventory[i] = { id, count };
          ui.renderInventory();
          return true;
        }
      }
      return false;
    },

    removeItem(id, count = 1) {
      for (let i = 0; i < 16; i++) {
        if (this.inventory[i] && this.inventory[i].id === id && this.inventory[i].count >= count) {
          this.inventory[i].count -= count;
          if (this.inventory[i].count <= 0) this.inventory[i] = null;
          ui.renderInventory();
          return true;
        }
      }
      return false;
    },

    gainStats({ xp = 0, energy = 0, mood = 0, currants = 0, x, y }) {
      const fx = x ?? this.player.x;
      const fy = (y ?? this.player.y) - 55;
      if (energy !== 0) {
        this.energy = Math.max(0, Math.min(this.maxEnergy, this.energy + energy));
        this.spawnFloatText(fx - 18, fy, `${energy > 0 ? "+" : ""}${energy} Energy`, "#6eb544");
      }
      if (mood !== 0) {
        this.mood = Math.max(0, Math.min(this.maxMood, this.mood + mood));
        this.spawnFloatText(fx + 18, fy - 12, `${mood > 0 ? "+" : ""}${mood} Mood`, "#5da037");
      }
      if (xp !== 0) {
        // Mood multiplier bonus (Rule 25)
        const mult = this.mood >= 90 ? 1.25 : this.mood >= 75 ? 1.1 : 1.0;
        const finalXp = Math.max(1, Math.round(xp * mult));
        this.xp += finalXp;
        const newLevel = 3 + Math.floor(this.xp / 200);
        if (newLevel > this.level) {
          this.level = newLevel;
          this.maxEnergy += 25;
          this.energy = this.maxEnergy;
          this.spawnFloatText(fx, fy - 36, `LEVEL UP! Lv ${this.level}`, "#ffca28");
          window.AudioSys.play("quest");
        } else {
          this.spawnFloatText(fx, fy - 22, `+${finalXp} iMG`, "#ab47bc");
        }
        pushEvent("score_change", { xp: this.xp, delta: finalXp, level: this.level });
      }
      if (currants !== 0) {
        this.currants = Math.max(0, this.currants + currants);
        this.spawnFloatText(fx + 12, fy - 28, `${currants > 0 ? "+" : ""}${currants}c`, "#ffb300");
      }
      ui.updateHUD();
    },

    spawnFloatText(x, y, text, color = "#ffffff") {
      this.floatingTexts.push({ x, y, text, color, vy: -32, life: 1.4, maxLife: 1.4 });
    },

    spawnArcDrop(x, y, itemId, count = 1) {
      for (let i = 0; i < Math.min(4, count); i++) {
        this.arcDrops.push({
          x,
          y: y - 20,
          vx: (rand() - 0.5) * 90,
          vy: -150 - rand() * 50,
          itemId,
          life: 0.75,
        });
      }
    },

    spawnParticles(x, y, color, count = 12) {
      for (let i = 0; i < count; i++) {
        const ang = rand() * Math.PI * 2;
        const spd = 25 + rand() * 95;
        this.particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 35,
          color,
          size: 2.5 + rand() * 3.5,
          life: 0.5 + rand() * 0.45,
        });
      }
    },

    awardBadge(badgeId) {
      if (this.badges[badgeId]) return;
      this.badges[badgeId] = true;
      const b = BADGES.find((x) => x.id === badgeId);
      if (b) {
        this.addChat("Badge", `Earned Badge: ${b.icon} ${b.name}! (+20 iMG)`);
        this.gainStats({ xp: 20, mood: 4 });
      }
    },

    advanceQuest(questId, amount = 1) {
      if (this.questDone[questId]) return;
      const q = QUESTS.find((x) => x.id === questId);
      if (!q) return;
      this.questProgress[questId] = (this.questProgress[questId] || 0) + amount;
      if (this.questProgress[questId] >= q.goal) {
        this.questDone[questId] = true;
        this.gainStats({ xp: q.rewardXp, currants: q.rewardCurrants, mood: 10 });
        this.giantFavor[q.rewardGiant] = (this.giantFavor[q.rewardGiant] || 0) + q.rewardFavor;
        this.showGiantVisitation(q.rewardGiant, `Quest Complete: "${q.title}"! +${q.rewardXp} iMG & +${q.rewardFavor} Favor!`);
        pushEvent("quest_complete", { id: q.id, title: q.title });
      }
    },

    showGiantVisitation(giantKey, customText) {
      const g = GIANTS[giantKey] || GIANTS.Zille;
      window.AudioSys.play("giant");
      this.giantBanner = {
        name: g.name,
        title: g.title,
        color: g.color,
        text: customText || g.quote,
        timer: 4.5,
      };
    },

    addChat(sender, text, isActivity = false) {
      const log = document.getElementById("chat-log");
      if (!log) return;
      const row = document.createElement("div");
      row.className = "chat-row" + (isActivity ? " chat-activity" : "");
      const now = new Date();
      const tStr = `${((now.getHours() + 11) % 12) + 1}:${String(now.getMinutes()).padStart(2, "0")}pm`;
      row.innerHTML = `<span class="chat-time">${tStr}</span> <strong>${sender}:</strong> `;
      const span = document.createElement("span");
      span.textContent = text;
      row.appendChild(span);
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
    },

    changeStreet(targetId) {
      const st = this.streets[targetId];
      if (!st) return;
      this.area = targetId;
      this.hoveredObj = null;
      this.transitionTimer = 0.65;
      this.transitionText = `Entering ${st.name} in ${st.region}... recalculating splines...`;
      this.player.x = st.spawnX || 350;
      this.player.y = st.groundY;
      this.player.vx = 0;
      this.player.vy = 0;
      this.camX = Math.max(0, Math.min(st.width - canvas.width, this.player.x - canvas.width / 2));
      window.AudioSys.setTheme(st.theme);
      this.addChat("Ur", `Entered ${st.name} in ${st.region}.`, true);
      if (targetId === "andra_hall") {
        this.advanceQuest("q_bureaucrat", 1);
      }
      pushEvent("area_change", { area: targetId, name: st.name });
      ui.updateHUD();
    },

    startSkillTraining(sk, totalDur) {
      this.trainingSkill = { id: sk.id, name: sk.name, elapsed: 0, total: totalDur };
      this.addChat("Skills", `Started learning ${sk.name} (${totalDur}s).`, true);
    },

    placeFurniture(f) {
      if (this.area !== "home_street") {
        this.addChat("Cultivate", "Return to Beau's Home Street to place furniture!", true);
        return;
      }
      if (this.currants < f.cost) {
        window.AudioSys.play("error");
        this.addChat("Cultivate", `Need ${f.cost} currants for ${f.name}.`, true);
        return;
      }
      this.currants -= f.cost;
      const fx = Math.max(100, Math.min(2050, Math.round(this.player.x + this.player.dir * 55)));
      this.placedFurniture.push({ id: f.id, x: fx });
      net.set("home_furniture", this.placedFurniture);
      window.AudioSys.play("pickup");
      this.gainStats({ xp: 15, mood: 5 });
      this.addChat("Cultivate", `Placed ${f.name} on Home Street!`, true);
    },

    executeInventoryVerb(slotIdx, entry, verb) {
      const it = ITEMS[entry.id];
      if (!it) return;
      pushEvent("item_use", { item: entry.id, verb: verb.id });

      if (verb.id === "drop") {
        this.removeItem(entry.id, 1);
        this.addChat("You", `Dropped 1 ${it.name}.`, true);
        return;
      }
      if (verb.id === "inspect") {
        this.player.speech = `${it.name}: ${it.desc}`;
        this.player.speechTimer = 4.0;
        this.addChat("Inspect", `${it.name} — ${it.desc}`, true);
        return;
      }
      if (verb.id === "use" && entry.id === "butterfly_lotion") {
        // Massage nearest butterfly or self
        const st = this.streets[this.area];
        const bfly = st.critters.find((c) => c.type === "butterfly");
        if (bfly) {
          this.interactCritter(bfly, "massage");
        } else {
          this.gainStats({ mood: 8, xp: 5 });
          this.addChat("You", "Rubbed soothing Butterfly Lotion on your hands (+8 Mood).", true);
        }
        return;
      }
      if (verb.id === "drink" && entry.id === "pumpkin_ale") {
        this.removeItem("pumpkin_ale", 1);
        this.gainStats({ mood: 29, energy: 15, xp: 15 });
        this.player.anim = "dance";
        this.player.animTimer = 8.0;
        this.player.speech = "Pumpkin Ale! THRILLER DANCE TIME!";
        this.player.speechTimer = 4.5;
        window.AudioSys.play("drink");
        window.AudioSys.triggerOverride("thriller", 9);
        this.spawnParticles(this.player.x, this.player.y - 30, "#ef6c00", 24);
        this.advanceQuest("q_social", 1);
        this.awardBadge("social_butterfly");
        net.send("party", { kind: "thriller", fromName: this.player.name, x: this.player.x, y: this.player.y });
        this.addChat("Party", "You drank Pumpkin Ale (+29 Mood) and triggered a synchronized Thriller dance!", true);
        return;
      }
      if (verb.id === "bestow" && entry.id === "random_kindness") {
        this.removeItem("random_kindness", 1);
        this.gainStats({ mood: 30, xp: 18 });
        window.AudioSys.play("social");
        this.rainbows.push({ x: this.player.x, y: this.player.y - 35, life: 3.2 });
        this.advanceQuest("q_social", 1);
        this.awardBadge("social_butterfly");
        net.send("party", { kind: "rainbow", fromName: this.player.name, x: this.player.x, y: this.player.y });
        this.addChat("Kindness", "A shimmering Random Kindness rainbow arcs across the street (+30 Mood)!", true);
        return;
      }
      if (verb.id === "sprinkle" && entry.id === "sparkle_powder") {
        this.removeItem("sparkle_powder", 1);
        this.gainStats({ mood: 10, xp: 12 });
        window.AudioSys.play("social");
        for (let i = 0; i < 32; i++) {
          this.spawnParticles(this.player.x + (rand() - 0.5) * 260, this.player.y - 80 - rand() * 90, "#fff176", 2);
        }
        this.advanceQuest("q_social", 1);
        net.send("party", { kind: "sparkle", fromName: this.player.name, x: this.player.x, y: this.player.y });
        this.addChat("Sparkle", "Sparkle Powder fills the air with stars (+10 Mood)!", true);
        return;
      }
      if (verb.id === "play" && entry.id === "musicblock") {
        this.gainStats({ energy: -2, mood: 2, xp: 30 });
        window.AudioSys.triggerOverride("musicblock", 10);
        this.player.speech = "♪ Playing Musicblock DB-4 ♪";
        this.player.speechTimer = 4.0;
        this.spawnParticles(this.player.x, this.player.y - 45, "#76d2ff", 16);
        this.addChat("Musicblock", "Musicblock DB-4 chimes a wistful melody (+30 iMG, +2 Mood).", true);
        return;
      }
      if (verb.id === "race" && entry.id === "cubimal") {
        const planks = (8 + rand() * 24).toFixed(1);
        window.AudioSys.play("squeeze");
        this.cubimalRaces.push({
          x: this.player.x,
          y: this.player.y,
          dir: this.player.dir,
          dist: Number(planks) * 10,
          traveled: 0,
          planks,
          owner: this.player.name,
        });
        this.gainStats({ xp: 10, mood: 4 });
        this.advanceQuest("q_social", 1);
        net.send("cubimal", { x: this.player.x, y: this.player.y, dir: this.player.dir, planks, owner: this.player.name });
        this.addChat("Cubimal", `${this.player.name} released a Chick Cubimal! Winding up...`, true);
        return;
      }
      if (verb.id === "roll" && entry.id === "die12") {
        const roll = 1 + Math.floor(rand() * 12);
        window.AudioSys.play("dice");
        const msg = `rolled a 12-sided die and got a ${roll}!`;
        this.player.speech = `🎲 Rolled a ${roll}!`;
        this.player.speechTimer = 3.5;
        this.gainStats({ xp: 3, mood: 2 });
        this.addChat(this.player.name, msg, true);
        net.send("chat", { text: msg });
        return;
      }
      if (verb.id === "quaff_shrink") {
        this.player.sizeScale = this.player.sizeScale < 0.8 ? 1.0 : 0.55;
        window.AudioSys.play("drink");
        this.gainStats({ mood: 6, xp: 8 });
        this.player.speech = this.player.sizeScale < 1 ? "Everything is enormous!" : "Back to normal size!";
        this.player.speechTimer = 3.5;
        return;
      }
      if (verb.id === "embiggen") {
        this.player.sizeScale = this.player.sizeScale > 1.2 ? 1.0 : 1.6;
        window.AudioSys.play("giant");
        this.gainStats({ mood: 6, xp: 8 });
        this.player.speech = this.player.sizeScale > 1 ? "EMBIGGENED!" : "Back to normal size!";
        this.player.speechTimer = 3.5;
        return;
      }

      // Generic consumable/stat verb (Taste Butterfly Lotion, Drink Cup of Water, Eat Cherries, etc.)
      if (verb.consume) this.removeItem(entry.id, 1);
      window.AudioSys.play("drink");
      this.player.anim = "drink";
      this.player.animTimer = 1.1;
      this.gainStats({
        energy: verb.energy || 0,
        mood: verb.mood || 0,
        xp: verb.xp || 0,
      });
      if (entry.id === "butterfly_lotion" && verb.id === "taste") {
        this.player.speech = "Tastes floral... wait, lotion is not for eating!";
        this.player.speechTimer = 3.8;
      }
      this.addChat("You", `Used ${verb.label} on ${it.name}.`, true);
    },

    executeNodeVerb(node, verb) {
      if (verb.target) {
        this.changeStreet(verb.target);
        return;
      }
      if (verb.id === "browse_vendor") {
        ui.openVendorModal(node.name);
        return;
      }
      if (verb.id === "quest_rock") {
        ui.openQuestsModal();
        this.gainStats({ xp: 8, mood: 4, x: node.x, y: node.y - 40 });
        this.advanceQuest("q_welcome", 1);
        return;
      }
      if (verb.id === "style_toggle") {
        const st = this.streets.home_street;
        st.theme = st.theme === "lost_woods" ? "vam_road" : "lost_woods";
        window.AudioSys.setTheme(st.theme);
        window.AudioSys.play("quest");
        this.gainStats({ energy: -15, xp: 20, mood: 8, x: node.x, y: node.y - 40 });
        net.set("home_theme", st.theme);
        const styleName = st.theme === "vam_road" ? "Vam Road (Snowy Pines)" : "Lost Woods (Misty Forest)";
        this.addChat("Magic Rock", `Street style transformed to ${styleName}!`, true);
        return;
      }
      if (verb.id === "who_visited") {
        const visitors = this.visitorLog.join(", ");
        node.speech = `Recent visitors: ${visitors}!`;
        this.addChat("Butler Roy", `Recent visitors to your Home Street: ${visitors}.`, true);
        this.gainStats({ xp: 4, mood: 3, x: node.x, y: node.y - 40 });
        return;
      }
      if (verb.id === "butler_gift") {
        node.speech = "Here is your daily hospitality stipend, freshly ironed!";
        window.AudioSys.play("pickup");
        this.gainStats({ currants: 25, xp: 8, mood: 5, x: node.x, y: node.y - 40 });
        this.advanceQuest("q_social", 1);
        return;
      }
      if (verb.id === "butler_highfive" || verb.id === "butler_jig") {
        node.speech = "Up high! Pip pip!";
        this.player.anim = "highfive";
        this.player.animTimer = 1.2;
        window.AudioSys.play("social");
        this.gainStats({ mood: verb.mood || 10, xp: verb.xp || 6, x: node.x, y: node.y - 40 });
        this.advanceQuest("q_social", 1);
        this.awardBadge("social_butterfly");
        return;
      }
      if (verb.id === "donate_favor") {
        if (this.currants < 15) {
          window.AudioSys.play("error");
          this.addChat("Shrine", "You need 15 currants to make an offering.", true);
          return;
        }
        const gKey = node.giant || "Grendaline";
        this.giantFavor[gKey] = (this.giantFavor[gKey] || 0) + 15;
        this.gainStats({ currants: -15, xp: 25, mood: 10, x: node.x, y: node.y - 50 });
        this.showGiantVisitation(gKey);
        return;
      }
      if (verb.id === "wait_chair") {
        this.player.x = node.x;
        this.bureaucraticCertified = true;
        this.waitingTimer = 10;
        window.AudioSys.play("quest");
        this.gainStats({ xp: 15, mood: 4, x: node.x, y: node.y - 40 });
        this.advanceQuest("q_bureaucrat", 1);
        this.addChat("Bureaucracy", "You waited patiently in the orange chair! Magister Piksnikson will see you now.", true);
        return;
      }
      if (verb.id === "buy_qualification") {
        if (!this.bureaucraticCertified) {
          node.speech = "Ahem! Please wait in the orange Waiting Area chairs first!";
          this.addChat("Magister Piksnikson", "Please sit/wait in the Designated Waiting Area before purchasing a Qualification!", true);
          window.AudioSys.play("error");
          return;
        }
        if (this.currants < 50) {
          window.AudioSys.play("error");
          this.addChat("Magister Piksnikson", "The Card-Carrying Qualification requires 50 currants.", true);
          return;
        }
        this.addItem("qualification", 1);
        window.AudioSys.play("quest");
        this.gainStats({ currants: -50, xp: 40, mood: 15, x: node.x, y: node.y - 50 });
        this.awardBadge("card_carrier");
        this.advanceQuest("q_bureaucrat", 1);
        node.speech = "Stamped in triplicate! You are officially qualified!";
        pushEvent("pickup", { item: "qualification", count: 1 });
        return;
      }
      if (verb.id === "contribute_tower") {
        node.progress = Math.min(100, (node.progress || 31.4) + 4.3);
        net.set("tower_progress", node.progress);
        this.player.thoughtTool = "pickaxe";
        this.player.thoughtTimer = 1.4;
        window.AudioSys.play("mineHit");
        this.gainStats({ energy: -8, xp: 25, mood: 6, x: node.x, y: node.y - 70 });
        this.advanceQuest("q_welcome", 1);
        this.addChat("Tower", `Contributed work to the Tower! Now ${node.progress.toFixed(1)}% complete.`, true);
        return;
      }

      // Harvesting / Mining / Watering / Digging
      let tool = null;
      if (verb.id === "mine" || verb.id === "help_mine") {
        tool = "pickaxe";
        window.AudioSys.play("mineHit");
        this.screenShake = 3.5;
        this.awardBadge("rock_hound");
        this.advanceQuest("q_welcome", 1);
      } else if (verb.id.includes("water") || verb.id.includes("harvest") || verb.id.includes("pet")) {
        tool = "watering_can";
        window.AudioSys.play("water");
        this.awardBadge("tree_friend");
        this.advanceQuest("q_welcome", 1);
      } else if (verb.id.includes("dig") || verb.id.includes("search")) {
        tool = "shovel";
        window.AudioSys.play("mineHit");
      } else if (verb.id === "get_water") {
        window.AudioSys.play("water");
        this.advanceQuest("q_bureaucrat", 1);
      } else {
        window.AudioSys.play("pickup");
      }

      if (tool) {
        this.player.thoughtTool = tool;
        this.player.thoughtTimer = 1.6;
        node.activeTimer = 1.2;
        node.activeDuration = 1.2;
        node.activeLabel = verb.label.split(" ")[0].toLowerCase();
      }

      // Check cooperative mining bonus (Rule 20 & Footage A 08:26-08:36)
      let bonusCount = 0;
      let helperName = null;
      if (verb.id === "mine" || verb.id === "help_mine") {
        for (const other of net.players.values()) {
          if (other.s && other.s.area === this.area && Math.abs((other.s.x || 0) - node.x) < 220) {
            bonusCount = 1;
            helperName = other.name;
            break;
          }
        }
        if (verb.id === "help_mine" && !helperName) {
          bonusCount = 1;
          helperName = "Butler Roy";
        }
        net.send("coop_mine", { nodeId: node.id, area: this.area, fromName: this.player.name });
      }

      const dropCount = (verb.count || 0) + bonusCount;
      if (verb.item && dropCount > 0) {
        this.addItem(verb.item, dropCount);
        this.spawnArcDrop(node.x, node.y - 30, verb.item, dropCount);
        this.spawnFloatText(node.x + 24, node.y - 45, `+${dropCount} ${ITEMS[verb.item]?.name || verb.item}`, "#ffffff");
        pushEvent("pickup", { item: verb.item, count: dropCount });
        if (helperName) {
          this.addChat("Co-op", `You got 1 additional Chunk of Beryl with the help you received from ${helperName}!`, true);
        }
      }

      this.gainStats({
        energy: verb.energy || 0,
        xp: verb.xp || 0,
        mood: verb.mood || 0,
        currants: verb.currants || 0,
        x: node.x,
        y: node.y - 30,
      });
      this.spawnParticles(node.x, node.y - 35, "#4cc3d9", 14);
    },

    interactCritter(c, actionId) {
      this.player.anim = "squeeze";
      this.player.animTimer = 1.0;
      window.AudioSys.play("squeeze");
      this.spawnParticles(c.x, c.y - 14, "#ffca28", 14);
      this.advanceQuest("q_critters", 1);

      if (c.type === "chicken") {
        this.awardBadge("chicken_squeezer");
        this.addItem("grain", 1);
        this.gainStats({ mood: 4, xp: 8, x: c.x, y: c.y - 20 });
        this.player.speech = "Squeezed the chicken! (+4 Mood, +1 Grain)";
        this.player.speechTimer = 3.0;
        pushEvent("pickup", { item: "grain", count: 1 });
      } else if (c.type === "butterfly") {
        if (actionId === "milk") {
          this.addItem("butterfly_milk", 1);
          this.gainStats({ energy: -3, xp: 12, mood: 5, x: c.x, y: c.y - 20 });
          this.spawnArcDrop(c.x, c.y, "butterfly_milk", 1);
          this.player.speech = "Milked a relaxed butterfly! (+1 Butterfly Milk)";
          pushEvent("pickup", { item: "butterfly_milk", count: 1 });
        } else {
          this.gainStats({ mood: 6, xp: 10, x: c.x, y: c.y - 20 });
          this.player.speech = "Massaged the butterfly's tiny shoulders!";
        }
        this.player.speechTimer = 3.0;
      } else if (c.type === "piggy") {
        this.addItem("bean", 2);
        this.gainStats({ mood: 5, xp: 10, x: c.x, y: c.y - 20 });
        this.player.speech = "Petted the happy piggy! (+5 Mood, +2 Beans)";
        this.player.speechTimer = 3.0;
        pushEvent("pickup", { item: "bean", count: 2 });
      }
    },

    interactPlayer(other, actionId) {
      window.AudioSys.play("social");
      this.advanceQuest("q_social", 1);
      this.awardBadge("social_butterfly");
      if (actionId === "highfive") {
        this.player.anim = "highfive";
        this.player.animTimer = 1.4;
        this.player.speech = `High five, ${other.name}!`;
        this.player.speechTimer = 3.2;
        this.gainStats({ mood: 30, xp: 15 });
        net.send("social", { kind: "highfive", targetId: other.id, fromName: this.player.name });
        this.addChat("Social", `You high-fived ${other.name} (+30 Mood)!`, true);
      } else if (actionId === "hug") {
        this.player.anim = "hug";
        this.player.animTimer = 1.4;
        this.player.speech = `*Hugs ${other.name}*`;
        this.player.speechTimer = 3.2;
        this.gainStats({ mood: 8, xp: 10 });
        net.send("social", { kind: "hug", targetId: other.id, fromName: this.player.name });
        this.addChat("Social", `You hugged ${other.name} (+8 Mood)!`, true);
      } else if (actionId === "follow") {
        this.followTargetId = this.followTargetId === other.id ? null : other.id;
        this.addChat("Follow", this.followTargetId ? `Following ${other.name} in a conga line!` : "Stopped following.", true);
      } else if (actionId === "gift_cherry") {
        this.gainStats({ mood: 12, xp: 12 });
        net.send("social", { kind: "gift", targetId: other.id, fromName: this.player.name, item: "cherry" });
        this.addChat("Social", `Gave cherries to ${other.name}!`, true);
      } else if (actionId === "rainbow") {
        this.rainbows.push({ x: (this.player.x + (other.s?.x || this.player.x)) / 2, y: this.player.y - 35, life: 3.5 });
        this.gainStats({ mood: 30, xp: 18 });
        net.send("party", { kind: "rainbow", fromName: this.player.name, x: this.player.x, y: this.player.y });
      }
      pushEvent("social", { action: actionId, target: other.name });
    },

    waveHiSign() {
      window.AudioSys.play("social");
      this.player.anim = "wave";
      this.player.animTimer = 1.5;
      this.player.thoughtTool = "hi";
      this.player.thoughtTimer = 2.5;
      this.player.speech = `Hi! (${this.player.hiSign}!)`;
      this.player.speechTimer = 3.0;

      // Check if any player on the street shares the daily hiSign (Rule 33)
      let matchBonus = 5;
      for (const other of net.players.values()) {
        if (other.s && other.s.area === this.area && other.s.hiSign === this.player.hiSign) {
          matchBonus = 10;
          break;
        }
      }
      this.gainStats({ mood: matchBonus, xp: 6 });
      this.advanceQuest("q_social", 1);
      this.awardBadge("social_butterfly");
      net.send("hi_wave", { fromName: this.player.name, hiSign: this.player.hiSign, area: this.area });
      this.addChat("Hi Sign", `Waved "${this.player.hiSign}!" (+${matchBonus} Mood)`, true);
    },
  };

  const ui = window.UISys.initUI(game);

  // Connect Multiplayer (public/net.js)
  const net = window.Net.connect({
    name: playerName,
    onWelcome(n) {
      game.player.id = n.me || 1;
      if (n.shared.home_theme) game.streets.home_street.theme = n.shared.home_theme;
      if (n.shared.tower_progress) {
        const tw = game.streets.home_street.nodes.find((x) => x.id === "tower_project");
        if (tw) tw.progress = n.shared.tower_progress;
      }
      if (Array.isArray(n.shared.home_furniture)) {
        game.placedFurniture = n.shared.home_furniture;
      }
      updatePeopleList();
    },
    onJoin(p) {
      if (!game.visitorLog.includes(p.name)) game.visitorLog.unshift(p.name);
      game.addChat("Ur", `${p.name} is here!`, true);
      pushEvent("player_join", { id: p.id, name: p.name });
      updatePeopleList();
    },
    onLeave(p) {
      game.addChat("Ur", `${p.name || "A Glitchen"} just left.`, true);
      pushEvent("player_leave", { id: p.id });
      updatePeopleList();
    },
    onState() {
      updatePeopleList();
    },
    onSet(key, value) {
      if (key === "home_theme") {
        game.streets.home_street.theme = value;
        if (game.area === "home_street") window.AudioSys.setTheme(value);
      } else if (key === "tower_progress") {
        const tw = game.streets.home_street.nodes.find((x) => x.id === "tower_project");
        if (tw) tw.progress = value;
      } else if (key === "home_furniture" && Array.isArray(value)) {
        game.placedFurniture = value;
      }
    },
    onMsg(m) {
      if (m.t === "chat") {
        const p = net.players.get(m.from);
        const sender = p ? p.name : m.fromName || "Glitchen";
        game.addChat(sender, m.text);
        pushEvent("chat", { from: sender, text: m.text });
      } else if (m.t === "social") {
        if (m.targetId === net.me) {
          window.AudioSys.play("social");
          const bonus = m.kind === "highfive" ? 30 : 8;
          game.gainStats({ mood: bonus, xp: 10 });
          if (m.item) game.addItem(m.item, 2);
          game.addChat("Social", `${m.fromName} shared a ${m.kind} with you (+${bonus} Mood)!`, true);
        }
      } else if (m.t === "party") {
        window.AudioSys.play("social");
        if (m.kind === "thriller") {
          game.player.anim = "dance";
          game.player.animTimer = 7.0;
          window.AudioSys.triggerOverride("thriller", 8);
          game.gainStats({ mood: 15, xp: 10 });
          game.addChat("Party", `${m.fromName} uncorked Pumpkin Ale! Everyone dances!`, true);
        } else if (m.kind === "rainbow") {
          game.rainbows.push({ x: m.x || game.player.x, y: (m.y || game.player.y) - 35, life: 3.5 });
          game.gainStats({ mood: 20, xp: 10 });
          game.addChat("Kindness", `${m.fromName} bestowed a Random Kindness rainbow (+20 Mood)!`, true);
        } else if (m.kind === "sparkle") {
          game.gainStats({ mood: 10, xp: 8 });
          game.addChat("Sparkle", `${m.fromName} sprinkled Sparkle Powder (+10 Mood)!`, true);
        }
      } else if (m.t === "hi_wave") {
        if (m.area === game.area) {
          const match = m.hiSign === game.player.hiSign;
          const bonus = match ? 10 : 5;
          game.gainStats({ mood: bonus, xp: 5 });
          game.addChat("Hi Sign", `${m.fromName} waved "${m.hiSign}!" ${match ? "(MATCHING SIGN! +10 Mood)" : "(+5 Mood)"}`, true);
        }
      } else if (m.t === "coop_mine") {
        if (m.area === game.area) {
          game.addItem("beryl", 1);
          game.gainStats({ xp: 10, mood: 4 });
          game.addChat("Co-op", `Bonus Chunk of Beryl from mining alongside ${m.fromName}!`, true);
        }
      } else if (m.t === "cubimal") {
        game.cubimalRaces.push({
          x: m.x,
          y: m.y,
          dir: m.dir || 1,
          dist: Number(m.planks) * 10,
          traveled: 0,
          planks: m.planks,
          owner: m.owner,
        });
      }
    },
  });

  function updatePeopleList() {
    const el = document.getElementById("people-list");
    if (!el) return;
    el.innerHTML = "";
    // Self
    const meRow = document.createElement("div");
    meRow.className = "person-pill";
    meRow.innerHTML = `<span class="online-dot"></span> <strong>${game.player.name}</strong> (you) <span class="hi-tag">${game.player.hiSign}</span>`;
    el.appendChild(meRow);

    for (const p of net.players.values()) {
      const row = document.createElement("div");
      row.className = "person-pill clickable-person";
      const areaLabel = p.s && p.s.area && game.streets[p.s.area] ? game.streets[p.s.area].name : "Home Street";
      row.innerHTML = `<span class="online-dot"></span> <strong>${p.name}</strong> <span class="person-area">${areaLabel}</span>`;
      row.onclick = (e) => {
        e.stopPropagation();
        const rect = row.getBoundingClientRect();
        ui.openVerbMenu(
          rect.left - 40,
          rect.top,
          p.name,
          `Hi Sign: ${p.s?.hiSign || "Bats"} • Area: ${areaLabel}`,
          [
            { id: "highfive", label: "High five (+30 Mood)" },
            { id: "hug", label: "Hug (+8 Mood)" },
            { id: "follow", label: game.followTargetId === p.id ? "Stop Following" : "Follow (Conga Line)" },
            { id: "rainbow", label: "Bestow Rainbow (+30 Mood)" },
            { id: "gift_cherry", label: "Give Cherries" },
            { id: "summon", label: "Join on their Street" },
          ],
          (v) => {
            if (v.id === "summon" && p.s && p.s.area) {
              game.changeStreet(p.s.area);
            } else {
              game.interactPlayer(p, v.id);
            }
          }
        );
      };
      el.appendChild(row);
    }
  }

  // Input Handling (Keyboard + Mouse + Chat)
  const keys = {};
  const chatInput = document.getElementById("chat-input");

  function dismissWelcomeIfOpen() {
    const wb = document.getElementById("welcome-banner");
    if (wb && !wb.classList.contains("hidden")) {
      wb.classList.add("hidden");
      window.AudioSys.unlock();
    }
  }

  window.addEventListener("keydown", (e) => {
    window.AudioSys.unlock();
    dismissWelcomeIfOpen();

    if (document.activeElement === chatInput) {
      if (e.key === "Enter") {
        const txt = chatInput.value.trim();
        if (txt) {
          game.player.speech = txt;
          game.player.speechTimer = 4.0;
          game.addChat(game.player.name, txt);
          net.send("chat", { text: txt });
          pushEvent("chat", { from: game.player.name, text: txt });
          chatInput.value = "";
        }
        chatInput.blur();
      } else if (e.key === "Escape") {
        chatInput.blur();
      } else if (e.key === "Tab") {
        e.preventDefault();
        cycleChatChannel();
      }
      return;
    }

    keys[e.code] = true;
    keys[e.key] = true;

    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      game.player.jumpBuffer = 0.14;
      game.followTargetId = null;
    }
    if (e.code === "ArrowDown" || e.code === "KeyS") {
      game.player.dropThroughTimer = 0.22;
    }
    if (e.code === "ArrowLeft" || e.code === "KeyA" || e.code === "ArrowRight" || e.code === "KeyD") {
      game.followTargetId = null;
    }

    // Social Emotes on Number Keys 1-5 (Rule 6 & 33: Key '5' waves 'hi')
    if (e.key === "5") {
      game.waveHiSign();
    } else if (e.key === "1") {
      game.player.anim = "wave";
      game.player.animTimer = 1.4;
      game.player.speech = "Happy day in Ur!";
      game.player.speechTimer = 2.8;
      game.gainStats({ mood: 2, xp: 2 });
    } else if (e.key === "2") {
      game.player.anim = "dance";
      game.player.animTimer = 2.5;
      game.player.speech = "♪ Doing the Glitch shuffle! ♪";
      game.player.speechTimer = 2.8;
      game.gainStats({ mood: 3, xp: 3 });
    } else if (e.key === "3") {
      game.player.anim = "highfive";
      game.player.animTimer = 1.4;
      game.player.speech = "High five anyone?";
      game.player.speechTimer = 2.8;
    } else if (e.key === "4") {
      game.player.anim = "hug";
      game.player.animTimer = 1.4;
      game.player.speech = "Free hugs!";
      game.player.speechTimer = 2.8;
    } else if (e.key === "Tab") {
      e.preventDefault();
      cycleChatChannel();
    } else if (e.key === "m" || e.key === "M") {
      ui.openWorldMap();
    } else if (e.key === "k" || e.key === "K") {
      ui.openSkillsModal();
    } else if (e.key === "e" || e.key === "E" || e.key === "Enter") {
      if (game.activePopup && game.activePopup.verbs && game.activePopup.verbs.length > 0) {
        const v = game.activePopup.verbs[0];
        const fn = game.activePopup.onSelect;
        ui.closeVerbMenu();
        fn(v);
      }
    } else if (e.key === "Escape") {
      ui.closeVerbMenu();
      ui.closeModal();
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
    keys[e.key] = false;
  });

  function cycleChatChannel() {
    const names = ["Local Street", "Global Ur", "Live Help"];
    game.chatChannel = (game.chatChannel + 1) % names.length;
    document.querySelectorAll(".chat-tab").forEach((el, idx) => {
      el.classList.toggle("active", idx === game.chatChannel);
    });
    chatInput.placeholder = `Chat in ${names[game.chatChannel]} (Tab to cycle)...`;
  }

  document.querySelectorAll(".chat-tab").forEach((el, idx) => {
    el.onclick = () => {
      game.chatChannel = idx;
      document.querySelectorAll(".chat-tab").forEach((t, j) => t.classList.toggle("active", j === idx));
    };
  });

  // Mouse Hover & Click on 2D Street Canvas
  let mouseWorldX = 0;
  let mouseWorldY = 0;

  function findHoveredTarget(wx, wy) {
    const st = game.streets[game.area];
    if (!st) return null;

    // 1. Check other players on same street
    for (const other of net.players.values()) {
      if (other.s && other.s.area === game.area) {
        const ox = other.s.x || 0;
        const oy = other.s.y || 375;
        if (Math.abs(wx - ox) < 28 && wy >= oy - 75 && wy <= oy + 12) {
          return { kind: "player", obj: other, id: `player_${other.id}`, name: other.name };
        }
      }
    }

    // 2. Check roaming critters
    for (const c of st.critters) {
      if (Math.abs(wx - c.x) < 38 && Math.abs(wy - (c.y - 14)) < 36) {
        return { kind: "critter", obj: c, id: c.id, name: c.name };
      }
    }

    // 3. Check street nodes
    for (let i = st.nodes.length - 1; i >= 0; i--) {
      const n = st.nodes[i];
      const halfW = Math.max(42, (n.w || 60) * 0.68);
      const h = (n.h || 80) + 18;
      if (wx >= n.x - halfW && wx <= n.x + halfW && wy >= n.y - h && wy <= n.y + 20) {
        return { kind: "node", obj: n, id: n.id, name: n.name };
      }
    }
    return null;
  }

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const sy = (e.clientY - rect.top) * (canvas.height / rect.height);
    mouseWorldX = sx + game.camX;
    mouseWorldY = sy;
    game.hoveredObj = findHoveredTarget(mouseWorldX, mouseWorldY);
    canvas.style.cursor = game.hoveredObj ? "pointer" : "default";
  });

  canvas.addEventListener("click", (e) => {
    window.AudioSys.unlock();
    dismissWelcomeIfOpen();
    const rect = canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const sy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const wx = sx + game.camX;
    const wy = sy;

    const hit = findHoveredTarget(wx, wy);
    if (!hit) {
      ui.closeVerbMenu();
      return;
    }

    if (hit.kind === "node") {
      const n = hit.obj;
      ui.openVerbMenu(e.clientX, e.clientY, n.name, n.desc, n.verbs || [], (v) => {
        game.executeNodeVerb(n, v);
      });
    } else if (hit.kind === "critter") {
      const c = hit.obj;
      let verbs = [];
      if (c.type === "chicken") {
        verbs = [
          { id: "squeeze", label: "Squeeze (+4 Mood, +1 Grain)" },
          { id: "talk_chick", label: "Whisper Philosophy (+3 XP)" },
        ];
      } else if (c.type === "butterfly") {
        verbs = [
          { id: "massage", label: "Massage (+6 Mood, +10 iMG)" },
          { id: "milk", label: "Milk (-3 Energy, +1 Butterfly Milk)" },
        ];
      } else {
        verbs = [
          { id: "pet_pig", label: "Pet (+5 Mood, +2 Beans)" },
          { id: "nibble_pig", label: "Scratch Ears (+4 Mood)" },
        ];
      }
      ui.openVerbMenu(e.clientX, e.clientY, c.name, "A friendly street creature of Ur.", verbs, (v) => {
        game.interactCritter(c, v.id);
      });
    } else if (hit.kind === "player") {
      const other = hit.obj;
      ui.openVerbMenu(
        e.clientX,
        e.clientY,
        other.name,
        `Daily Hi Sign: ${other.s?.hiSign || "Bats"}`,
        [
          { id: "highfive", label: "High five (+30 Mood)" },
          { id: "hug", label: "Hug (+8 Mood)" },
          { id: "follow", label: game.followTargetId === other.id ? "Stop Following" : "Follow (Conga Line)" },
          { id: "rainbow", label: "Bestow Rainbow (+30 Mood)" },
          { id: "gift_cherry", label: "Give Cherries" },
        ],
        (v) => {
          game.interactPlayer(other, v.id);
        }
      );
    }
  });

  // Rule 29: Joke alert when attempting to refresh/leave
  window.addEventListener("beforeunload", (e) => {
    e.returnValue = "WAIT! You were just about to win the game!";
  });

  // Fixed-timestep 60fps simulation
  const DT = 1 / 60;
  let accum = 0;
  let lastFrame = performance.now();
  let totalTime = 0;
  let stepSoundTimer = 0;

  function stepSimulation(dt) {
    totalTime += dt;
    const p = game.player;
    const st = game.streets[game.area];
    if (!st) return;

    // Transition overlay timer
    if (game.transitionTimer > 0) game.transitionTimer = Math.max(0, game.transitionTimer - dt);
    if (game.giantBanner) {
      game.giantBanner.timer -= dt;
      if (game.giantBanner.timer <= 0) game.giantBanner = null;
    }
    if (game.screenShake > 0) game.screenShake = Math.max(0, game.screenShake - dt * 18);

    // Real-time Skill Training (Rule 27)
    if (game.trainingSkill) {
      game.trainingSkill.elapsed += dt;
      if (game.trainingSkill.elapsed >= game.trainingSkill.total) {
        const doneSk = game.trainingSkill;
        game.learnedSkills[doneSk.id] = true;
        if (doneSk.id === "herbalism_1") game.brainCapacity += 3;
        game.trainingSkill = null;
        window.AudioSys.play("quest");
        game.gainStats({ xp: 50, mood: 8 });
        game.addChat("Skill Learned", `Completed training ${doneSk.name}! (+50 iMG)`, true);
      }
    }

    // Horizontal Controls or Conga Line Follow (Rule 2, 7, 32)
    let moveInput = 0;
    if (keys.ArrowLeft || keys.KeyA) moveInput -= 1;
    if (keys.ArrowRight || keys.KeyD) moveInput += 1;

    if (moveInput === 0 && game.followTargetId) {
      const leader = net.players.get(game.followTargetId);
      if (leader && leader.s && leader.s.area === game.area) {
        const dx = (leader.s.x || 0) - p.x;
        if (Math.abs(dx) > 48) moveInput = dx > 0 ? 1 : -1;
        if ((leader.s.y || 375) < p.y - 35 && p.onGround) p.jumpBuffer = 0.1;
      }
    }

    const maxSpeed = 235;
    const accel = p.onGround ? 1550 : 980;
    const friction = p.onGround ? 1350 : 260;

    if (moveInput !== 0) {
      p.vx += moveInput * accel * dt;
      if (Math.abs(p.vx) > maxSpeed) p.vx = moveInput * maxSpeed;
      p.dir = moveInput > 0 ? 1 : -1;
    } else {
      if (Math.abs(p.vx) <= friction * dt) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * friction * dt;
    }

    // Forgiving Floaty Low-Gravity Jump (Rule 2: coyote time + jump buffer + floaty gravity)
    if (p.onGround) p.coyoteTimer = 0.11;
    else p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);

    if (p.jumpBuffer > 0) p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    if (p.dropThroughTimer > 0) p.dropThroughTimer = Math.max(0, p.dropThroughTimer - dt);

    if (p.jumpBuffer > 0 && p.coyoteTimer > 0) {
      p.vy = -445; // Floaty, high-reaching jump
      p.onGround = false;
      p.coyoteTimer = 0;
      p.jumpBuffer = 0;
      p.squashX = 0.84;
      p.squashY = 1.18;
      window.AudioSys.play("jump");
      game.awardBadge("first_steps");
      game.spawnParticles(p.x, p.y, "#ffffff", 6);
    }

    // Floaty low gravity (590 px/s^2 upward when holding jump, 740 falling)
    const holdingJump = keys.Space || keys.ArrowUp || keys.KeyW;
    const grav = p.vy < 0 && holdingJump ? 560 : 760;
    p.vy = Math.min(520, p.vy + grav * dt);

    const prevY = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Clamp street horizontal bounds & check boundary signpost transitions (Rule 10)
    if (p.x <= 42 && moveInput < 0 && game.transitionTimer <= 0) {
      const leftExit = st.nodes.find((n) => (n.type === "signpost" || n.type === "door") && n.x < 300 && n.verbs?.[0]?.target);
      if (leftExit) {
        game.changeStreet(leftExit.verbs[0].target);
        return;
      }
    } else if (p.x >= st.width - 42 && moveInput > 0 && game.transitionTimer <= 0) {
      const rightExit = st.nodes.find((n) => (n.type === "signpost" || n.type === "door") && n.x > st.width - 350 && n.verbs?.[0]?.target);
      if (rightExit) {
        game.changeStreet(rightExit.verbs[0].target);
        return;
      }
    }
    p.x = Math.max(36, Math.min(st.width - 36, p.x));

    // One-way Platform & Ground Collisions
    let landed = false;
    if (p.vy >= 0 && p.dropThroughTimer <= 0) {
      for (const plat of st.platforms) {
        if (p.x >= plat.x - 10 && p.x <= plat.x + plat.w + 10) {
          if (prevY <= plat.y + 6 && p.y >= plat.y) {
            p.y = plat.y;
            p.vy = 0;
            landed = true;
            break;
          }
        }
      }
    }
    if (p.y >= st.groundY) {
      p.y = st.groundY;
      p.vy = 0;
      landed = true;
    }

    if (landed && !p.onGround) {
      p.squashX = 1.18;
      p.squashY = 0.84;
      window.AudioSys.play("land");
    }
    p.onGround = landed;

    // Squash & stretch recovery
    p.squashX += (1 - p.squashX) * 12 * dt;
    p.squashY += (1 - p.squashY) * 12 * dt;

    // Animation state
    if (p.animTimer > 0) {
      p.animTimer -= dt;
      if (p.animTimer <= 0) p.anim = "idle";
    } else if (!p.onGround) {
      p.anim = "jump";
    } else if (Math.abs(p.vx) > 15) {
      p.anim = "walk";
      stepSoundTimer -= dt;
      if (stepSoundTimer <= 0) {
        stepSoundTimer = 0.28;
        window.AudioSys.play("step");
      }
    } else {
      p.anim = "idle";
    }

    if (p.speechTimer > 0) {
      p.speechTimer -= dt;
      if (p.speechTimer <= 0) p.speech = "";
    }
    if (p.thoughtTimer > 0) {
      p.thoughtTimer -= dt;
      if (p.thoughtTimer <= 0) p.thoughtTool = null;
    }

    // Andra Bureaucratic Hall 10-second Waiting Area Timer (Rule 17 & Footage B 04:30-05:25)
    if (game.area === "andra_hall" && !game.bureaucraticCertified) {
      if (p.x >= 625 && p.x <= 765 && Math.abs(p.vx) < 5) {
        game.waitingTimer += dt;
        if (game.waitingTimer >= 10) {
          game.bureaucraticCertified = true;
          window.AudioSys.play("quest");
          game.gainStats({ xp: 20, mood: 6 });
          game.advanceQuest("q_bureaucrat", 1);
          game.addChat("Bureaucracy", "10-second wait complete! Magister Piksnikson will now issue Qualifications!", true);
        }
      } else {
        game.waitingTimer = Math.max(0, game.waitingTimer - dt * 0.5);
      }
    }

    // Smooth look-ahead camera (Rule 8)
    const targetCamX = p.x + p.dir * 55 - canvas.width * 0.5;
    const maxCamX = Math.max(0, st.width - canvas.width);
    const clampedTarget = Math.max(0, Math.min(maxCamX, targetCamX));
    game.camX += (clampedTarget - game.camX) * Math.min(1, dt * 7.5);

    // Floating Stat Orbs Pickup (Rule 26)
    for (const orb of st.orbs) {
      if (orb.collectedTimer && orb.collectedTimer > 0) {
        orb.collectedTimer -= dt;
        continue;
      }
      const dx = p.x - orb.x;
      const dy = (p.y - 32) - orb.y;
      if (dx * dx + dy * dy < 34 * 34) {
        orb.collectedTimer = 14; // respawns after 14s
        window.AudioSys.play("orb", orb.kind);
        const amt = orb.amount || 3;
        if (orb.kind === "xp") game.gainStats({ xp: amt, x: orb.x, y: orb.y });
        else if (orb.kind === "currants") game.gainStats({ currants: amt, x: orb.x, y: orb.y });
        else if (orb.kind === "mood") game.gainStats({ mood: amt, x: orb.x, y: orb.y });
        else if (orb.kind === "energy") game.gainStats({ energy: amt, x: orb.x, y: orb.y });
        game.spawnParticles(orb.x, orb.y, "#a7ffeb", 10);
        game.advanceQuest("q_welcome", 1);
        pushEvent("pickup", { orb: orb.kind, amount: amt });
      }
    }

    // Update Node timers & proximity speech bubbles
    let closestSpeechNode = null;
    let closestSpeechDist = 165;
    for (const n of st.nodes) {
      if (n.activeTimer && n.activeTimer > 0) {
        n.activeTimer = Math.max(0, n.activeTimer - dt);
      }
      n.showSpeech = false;
      if (n.speech) {
        const d = Math.abs(p.x - n.x);
        if (d < closestSpeechDist) {
          closestSpeechDist = d;
          closestSpeechNode = n;
        }
      }
    }
    if (closestSpeechNode) closestSpeechNode.showSpeech = true;

    // Update Roaming Critters
    for (const c of st.critters) {
      c.x += (c.vx || 28) * (c.dir || 1) * dt;
      if (c.x > c.maxX) {
        c.x = c.maxX;
        c.dir = -1;
      } else if (c.x < c.minX) {
        c.x = c.minX;
        c.dir = 1;
      }
      if (c.type === "butterfly") {
        c.y = (c.baseY || 260) + Math.sin(totalTime * 3.5 + c.x * 0.03) * 18;
      }
    }

    // Update Cubimal Races (Rule 19)
    for (let i = game.cubimalRaces.length - 1; i >= 0; i--) {
      const cr = game.cubimalRaces[i];
      const step = 95 * dt;
      if (cr.traveled < cr.dist) {
        cr.x += cr.dir * step;
        cr.traveled += step;
      } else {
        cr.doneTimer = (cr.doneTimer || 0) + dt;
        if (!cr.announced) {
          cr.announced = true;
          game.addChat("Cubimal", `${cr.owner}'s Chick Cubimal raced ${cr.planks} planks before stopping!`, true);
        }
        if (cr.doneTimer > 2.5) game.cubimalRaces.splice(i, 1);
      }
    }

    // Update Particles, Arc Drops, Floating Texts, Rainbows
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const pt = game.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 180 * dt;
      pt.life -= dt;
      if (pt.life <= 0) game.particles.splice(i, 1);
    }

    for (let i = game.arcDrops.length - 1; i >= 0; i--) {
      const ad = game.arcDrops[i];
      ad.x += ad.vx * dt;
      ad.y += ad.vy * dt;
      ad.vy += 420 * dt;
      ad.life -= dt;
      if (ad.life <= 0) game.arcDrops.splice(i, 1);
    }

    for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
      const ft = game.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) game.floatingTexts.splice(i, 1);
    }

    for (let i = game.rainbows.length - 1; i >= 0; i--) {
      game.rainbows[i].life -= dt;
      if (game.rainbows[i].life <= 0) game.rainbows.splice(i, 1);
    }

    // Sync state to multiplayer server at 15Hz via net.state()
    net.state({
      x: Math.round(p.x),
      y: Math.round(p.y),
      dir: p.dir,
      anim: p.anim,
      area: game.area,
      speech: p.speech,
      speechTimer: p.speechTimer,
      thoughtTool: p.thoughtTool,
      sizeScale: p.sizeScale,
      hiSign: p.hiSign,
      look: p.look,
    });

    // Update contract window.State
    window.State = {
      player: {
        name: p.name,
        x: Math.round(p.x),
        y: Math.round(p.y),
        vx: Math.round(p.vx),
        vy: Math.round(p.vy),
        onGround: p.onGround,
        anim: p.anim,
        sizeScale: p.sizeScale,
      },
      area: game.area,
      streetName: st.name,
      score: game.xp,
      xp: game.xp,
      level: game.level,
      currants: game.currants,
      health: Math.round(game.energy),
      energy: Math.round(game.energy),
      maxEnergy: game.maxEnergy,
      mood: Math.round(game.mood),
      camera: { x: Math.round(game.camX), y: 0 },
      onlinePlayers: net.players.size + 1,
    };
  }

  function render() {
    const st = game.streets[game.area];
    if (!st) return;

    ctx.save();
    if (game.screenShake > 0) {
      ctx.translate((rand() - 0.5) * game.screenShake * 2, (rand() - 0.5) * game.screenShake * 2);
    }

    // 1. Render Street, Parallax Layers, Platforms, Nodes, Critters, Orbs
    window.StreetsSys.renderStreet(
      ctx,
      st,
      game.camX,
      canvas.width,
      canvas.height,
      totalTime,
      game.hoveredObj ? game.hoveredObj.id : null,
      game.placedFurniture
    );

    ctx.save();
    ctx.translate(-game.camX, 0);

    // 2. Render Random Kindness Rainbows
    for (const rb of game.rainbows) {
      const alpha = Math.min(1, rb.life);
      const colors = ["#ec407a", "#ff7043", "#ffca28", "#66bb6a", "#29b6f6", "#ab47bc"];
      colors.forEach((col, idx) => {
        ctx.strokeStyle = col;
        ctx.globalAlpha = alpha * 0.85;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(rb.x, rb.y + 15, 68 - idx * 5, Math.PI, 0);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    // 3. Render Cubimal Races
    for (const cr of game.cubimalRaces) {
      ctx.save();
      ctx.translate(cr.x, cr.y - 10);
      ctx.fillStyle = "#ffca28";
      ctx.strokeStyle = "#e65100";
      ctx.lineWidth = 1.5;
      ctx.fillRect(-9, -9, 18, 18);
      ctx.strokeRect(-9, -9, 18, 18);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${(cr.traveled / 10).toFixed(1)} planks`, 0, -14);
      ctx.restore();
    }

    // 4. Render Other Players on the same street
    for (const other of net.players.values()) {
      if (other.s && other.s.area === game.area) {
        window.AvatarRenderer.drawGlitchen(
          ctx,
          {
            id: other.id,
            name: other.name,
            x: other.s.x || 500,
            y: other.s.y || 375,
            dir: other.s.dir || 1,
            anim: other.s.anim || "idle",
            speech: other.s.speech,
            speechTimer: other.s.speechTimer || 0,
            thoughtTool: other.s.thoughtTool,
            sizeScale: other.s.sizeScale || 1,
            hiSign: other.s.hiSign || "Bats",
            look: other.s.look || {},
          },
          totalTime,
          false
        );
      }
    }

    // 5. Render Local Player Glitchen
    window.AvatarRenderer.drawGlitchen(ctx, game.player, totalTime, true);

    // Waiting Area 10-second countdown indicator in Andra Bureaucratic Hall
    if (game.area === "andra_hall" && game.waitingTimer > 0 && !game.bureaucraticCertified) {
      const rem = Math.max(0, 10 - game.waitingTimer).toFixed(1);
      ctx.fillStyle = "#ef6c00";
      ctx.font = "bold 12px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Waiting Patiently: ${rem}s`, game.player.x, game.player.y - 84);
    }

    // 6. Render Arcing Item Drops & Particles & Floating Numbers
    for (const ad of game.arcDrops) {
      const it = ITEMS[ad.itemId];
      ctx.fillStyle = it ? it.color : "#26c6da";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ad.x, ad.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    for (const pt of game.particles) {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.life * 2));
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const ft of game.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, ft.life));
      ctx.font = "bold 13px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.65)";
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // 7. Hover Label on Targeted World Object (Footage B 00:53 / 03:50)
    if (game.hoveredObj) {
      const hx = game.hoveredObj.obj.x;
      const hy = (game.hoveredObj.obj.y || 375) - (game.hoveredObj.obj.h || 60) - 14;
      ctx.font = "bold 12px 'Trebuchet MS', sans-serif";
      const tw = ctx.measureText(game.hoveredObj.name).width + 18;
      ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
      ctx.strokeStyle = "#4cc3d9";
      ctx.lineWidth = 1.8;
      window.AvatarRenderer.drawRoundedRect(ctx, hx - tw / 2, Math.max(12, hy - 18), tw, 22, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1c2833";
      ctx.textAlign = "center";
      ctx.fillText(game.hoveredObj.name, hx, Math.max(27, hy - 3));
    }

    ctx.restore(); // end world camera

    // 8. Giant Visitation Mask Overlay (Rule 14)
    if (game.giantBanner) {
      const gb = game.giantBanner;
      ctx.save();
      ctx.fillStyle = "rgba(18, 28, 36, 0.90)";
      window.AvatarRenderer.drawRoundedRect(ctx, canvas.width / 2 - 255, 42, 510, 74, 14);
      ctx.fill();
      ctx.strokeStyle = gb.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Illustrated Giant Mask with crown crest
      const mx = canvas.width / 2 - 212;
      const my = 79;
      ctx.fillStyle = gb.color;
      ctx.beginPath();
      ctx.arc(mx, my, 23, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe082";
      ctx.beginPath();
      ctx.moveTo(mx - 14, my - 18);
      ctx.lineTo(mx - 8, my - 29);
      ctx.lineTo(mx, my - 21);
      ctx.lineTo(mx + 8, my - 29);
      ctx.lineTo(mx + 14, my - 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#1c2833";
      ctx.beginPath();
      ctx.arc(mx - 8, my - 3, 4, 0, Math.PI * 2);
      ctx.arc(mx + 8, my - 3, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = gb.color;
      ctx.font = "bold 13px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${gb.name} — ${gb.title}`, canvas.width / 2 - 175, 68);
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px 'Trebuchet MS', sans-serif";
      ctx.fillText(gb.text.slice(0, 76), canvas.width / 2 - 175, 92);
      ctx.restore();
    }

    // 9. Street Loading / Spline Transition Overlay (Rule 10)
    if (game.transitionTimer > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(28, 43, 41, ${Math.min(1, game.transitionTimer * 2.2)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#a7ffeb";
      ctx.font = "bold 16px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(game.transitionText, canvas.width / 2, canvas.height / 2);
      ctx.restore();
    }

    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    accum += dt;
    while (accum >= DT) {
      stepSimulation(DT);
      accum -= DT;
    }
    render();
    requestAnimationFrame(frame);
  }

  // Initial setup
  ui.updateHUD();
  game.addChat("Magic Rock", "Welcome to Beau's Home Street! Jump for floating orbs or click any rock, tree, or chicken!", true);
  pushEvent("area_change", { area: game.area, name: streets[game.area].name });
  requestAnimationFrame(frame);
})();
