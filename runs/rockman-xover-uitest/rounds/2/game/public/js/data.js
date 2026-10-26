// public/js/data.js — Seeded RNG, Worlds, Bosses, OVER Armors, and Battle Memory Cards
(function () {
  const params = new URLSearchParams(location.search);
  const seedStr = params.get("seed") || "cyber-over-25th";

  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h || 123456789;
  }

  let rngState = hashSeed(seedStr);
  function rand() {
    // Mulberry32
    let t = (rngState += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function randInt(min, max) {
    return Math.floor(rand() * (max - min + 1)) + min;
  }
  function choice(arr) {
    return arr[Math.floor(rand() * arr.length)];
  }

  // 6 Playable OVER Armors with authentic slot geometries & elemental colors from footage
  // Colors: "blue" (Water/Ice), "red" (Fire), "yellow" (Elec), "green" (Wood/Wind), "white" (Neutral/Light)
  const ARMORS = [
    {
      id: "OVER-1",
      name: "OVER-1 Standard",
      desc: "Balanced prototype armor with 5-node X-formation links.",
      primary: "#2a6be4",
      secondary: "#1e293b",
      trim: "#facc15",
      scarf: "#f8fafc",
      baseHP: 700,
      baseATK: 260,
      baseDEF: 240,
      element: "blue",
      unlocked: true,
      partsRequired: 0,
      // 2-1-2 layout (5 slots)
      slots: [
        { x: 0.24, y: 0.26, color: "blue", icon: "buster" },
        { x: 0.24, y: 0.74, color: "blue", icon: "shield" },
        { x: 0.50, y: 0.50, color: "white", icon: "core" },
        { x: 0.76, y: 0.26, color: "blue", icon: "buster" },
        { x: 0.76, y: 0.74, color: "red", icon: "flame" },
      ],
      edges: [
        [0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4],
      ],
    },
    {
      id: "OVER-2",
      name: "OVER-2 Destroyer",
      desc: "Heavy assault armor boosting Charge Shot &ATK power.",
      primary: "#dc2626",
      secondary: "#27272a",
      trim: "#fb923c",
      scarf: "#fef08a",
      baseHP: 880,
      baseATK: 380,
      baseDEF: 290,
      element: "red",
      unlocked: false,
      partsRequired: 5,
      // 2-2-1 layout
      slots: [
        { x: 0.22, y: 0.28, color: "red", icon: "flame" },
        { x: 0.22, y: 0.72, color: "red", icon: "flame" },
        { x: 0.50, y: 0.28, color: "blue", icon: "buster" },
        { x: 0.50, y: 0.72, color: "blue", icon: "shield" },
        { x: 0.78, y: 0.50, color: "yellow", icon: "core" },
      ],
      edges: [
        [0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 4],
      ],
    },
    {
      id: "OVER-3",
      name: "OVER-3 Sonic Blade",
      desc: "High-speed mobility armor with rapid charge cycling.",
      primary: "#16a34a",
      secondary: "#0f172a",
      trim: "#4ade80",
      scarf: "#ffffff",
      baseHP: 820,
      baseATK: 350,
      baseDEF: 310,
      element: "green",
      unlocked: false,
      partsRequired: 5,
      slots: [
        { x: 0.50, y: 0.20, color: "green", icon: "wind" },
        { x: 0.22, y: 0.50, color: "green", icon: "buster" },
        { x: 0.50, y: 0.50, color: "white", icon: "core" },
        { x: 0.78, y: 0.50, color: "yellow", icon: "elec" },
        { x: 0.50, y: 0.80, color: "green", icon: "shield" },
      ],
      edges: [
        [0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [1, 4], [2, 4], [3, 4],
      ],
    },
    {
      id: "OVER-4",
      name: "OVER-4 Aegis Guard",
      desc: "Fortress armor with high DEF and shield mitigation.",
      primary: "#eab308",
      secondary: "#1e1b4b",
      trim: "#fef08a",
      scarf: "#38bdf8",
      baseHP: 1150,
      baseATK: 310,
      baseDEF: 460,
      element: "yellow",
      unlocked: false,
      partsRequired: 5,
      // 1 top yellow connected to 4 bottom blue
      slots: [
        { x: 0.50, y: 0.22, color: "yellow", icon: "core" },
        { x: 0.18, y: 0.72, color: "blue", icon: "shield" },
        { x: 0.39, y: 0.72, color: "blue", icon: "shield" },
        { x: 0.61, y: 0.72, color: "blue", icon: "buster" },
        { x: 0.82, y: 0.72, color: "yellow", icon: "elec" },
      ],
      edges: [
        [0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 3], [3, 4],
      ],
    },
    {
      id: "OVER-10",
      name: "OVER-10 Zenith Gold",
      desc: "6-slot legendary sovereign armor with dual core matrix.",
      primary: "#f59e0b",
      secondary: "#31102f",
      trim: "#fef08a",
      scarf: "#f43f5e",
      baseHP: 1450,
      baseATK: 520,
      baseDEF: 480,
      element: "white",
      unlocked: false,
      partsRequired: 5,
      // 3x2 6-slot layout from footage C 02:11
      slots: [
        { x: 0.22, y: 0.28, color: "yellow", icon: "buster" },
        { x: 0.50, y: 0.28, color: "red", icon: "core" },
        { x: 0.78, y: 0.28, color: "yellow", icon: "buster" },
        { x: 0.22, y: 0.72, color: "blue", icon: "shield" },
        { x: 0.50, y: 0.72, color: "white", icon: "core" },
        { x: 0.78, y: 0.72, color: "red", icon: "flame" },
      ],
      edges: [
        [0, 3], [0, 4], [1, 4], [1, 2], [2, 5], [1, 5], [3, 4], [4, 5],
      ],
    },
  ];

  // Battle Memory Card catalog spanning franchise eras
  const CARD_CATALOG = [
    {
      tplId: "bm_x_dive",
      name: "Hunter X-01",
      era: "X Era",
      rarity: 3, // R
      color: "blue",
      cost: 2,
      hp: 210,
      atk: 95,
      def: 80,
      skill: { id: "ATK_UP", name: "Buster Boost", desc: "ATK +18% at turn start", power: 0.18 },
      artType: "hunter_x",
    },
    {
      tplId: "bm_zero_crimson",
      name: "Crimson Saber Z",
      era: "X/Z Era",
      rarity: 5, // SR+
      color: "red",
      cost: 4,
      hp: 340,
      atk: 185,
      def: 120,
      skill: { id: "HEAT", name: "Rekkoha Burn", desc: "Deals 12% burn & ATK +22%", power: 0.22 },
      artType: "saber_z",
    },
    {
      tplId: "bm_classic_blue",
      name: "Rock Buster Mk-I",
      era: "Classic",
      rarity: 2, // N+
      color: "blue",
      cost: 1,
      hp: 150,
      atk: 70,
      def: 65,
      skill: { id: "DEF_UP", name: "Titanium Guard", desc: "DEF +15% at turn start", power: 0.15 },
      artType: "classic_rock",
    },
    {
      tplId: "bm_exe_nav",
      name: "Cyber Navi.EXE",
      era: "Network",
      rarity: 4, // SR
      color: "blue",
      cost: 3,
      hp: 280,
      atk: 135,
      def: 115,
      skill: { id: "CSHOT_UP", name: "Program Advance", desc: "C.Shot gauge +35% faster", power: 0.35 },
      artType: "cyber_exe",
    },
    {
      tplId: "bm_proto_shield",
      name: "Proto Vanguard",
      era: "Classic",
      rarity: 3, // R
      color: "red",
      cost: 2,
      hp: 240,
      atk: 105,
      def: 110,
      skill: { id: "DEF_DOWN", name: "Shield Break", desc: "Enemy DEF -20%", power: 0.20 },
      artType: "proto_red",
    },
    {
      tplId: "bm_star_pegasus",
      name: "Star Wave Geo",
      era: "Star Force",
      rarity: 4, // SR
      color: "yellow",
      cost: 3,
      hp: 295,
      atk: 145,
      def: 110,
      skill: { id: "ATK_UP", name: "EM Wave Surge", desc: "ATK +24% at turn start", power: 0.24 },
      artType: "star_geo",
    },
    {
      tplId: "bm_zx_biometal",
      name: "Model ZX Vent",
      era: "ZX Era",
      rarity: 4, // SR
      color: "green",
      cost: 3,
      hp: 270,
      atk: 150,
      def: 105,
      skill: { id: "STOP", name: "Overdrive Lock", desc: "Stuns boss or reduces dmg 25%", power: 0.25 },
      artType: "model_zx",
    },
    {
      tplId: "bm_volnutt_dig",
      name: "Trigger Digger",
      era: "Legends",
      rarity: 3, // R
      color: "yellow",
      cost: 2,
      hp: 260,
      atk: 90,
      def: 120,
      skill: { id: "HEAL", name: "Refractor Pulse", desc: "Restores 12% HP on C.Shot", power: 0.12 },
      artType: "digger",
    },
    {
      tplId: "bm_iris_core",
      name: "Navigator Iris",
      era: "X Era",
      rarity: 5, // SR+
      color: "white",
      cost: 4,
      hp: 410,
      atk: 160,
      def: 175,
      skill: { id: "ALL_UP", name: "Harmony Wish", desc: "ATK & DEF +25%, heals 10%", power: 0.25 },
      artType: "nav_iris",
    },
    {
      tplId: "bm_bass_treble",
      name: "Forte & Gospel",
      era: "Classic",
      rarity: 6, // SSR
      color: "yellow",
      cost: 5,
      hp: 490,
      atk: 240,
      def: 180,
      skill: { id: "ATK_UP", name: "Darkness Overload", desc: "ATK +35% & C.Shot boost", power: 0.35 },
      artType: "forte_gold",
    },
    {
      tplId: "bm_harupia_wind",
      name: "Sage Harpuia",
      era: "Zero Era",
      rarity: 4, // SR
      color: "green",
      cost: 3,
      hp: 290,
      atk: 155,
      def: 125,
      skill: { id: "DEF_DOWN", name: "Sonic Tempest", desc: "Enemy DEF -25%", power: 0.25 },
      artType: "harpuia",
    },
    {
      tplId: "bm_ultimate_x",
      name: "Nova Armor X",
      era: "25th Anniv",
      rarity: 6, // SSR
      color: "white",
      cost: 5,
      hp: 550,
      atk: 265,
      def: 220,
      skill: { id: "ALL_UP", name: "Nova Strike EX", desc: "All stats +30% & Pierce +1", power: 0.30 },
      artType: "nova_x",
    },
  ];

  // Worlds 1 to 5 (each with stages and boss details)
  const WORLDS = [
    {
      id: 1,
      name: "World 1: Bay Area Highway",
      era: "X1 Crossover",
      theme: "highway",
      epCost: 3,
      recommendLv: 1,
      armorReward: "OVER-2",
      masterBoss: {
        name: "Utsuboros Raid Mk-I",
        level: 25,
        maxHp: 28000,
        atk: 185,
        def: 90,
        sprite: "utsuboros",
        element: "green",
      },
      stages: [
        { id: 1, name: "1-1 Coastal Bridge", bossName: "Blizzard Penguin", bossSprite: "penguin", hp: 2200, atk: 96, def: 45, element: "blue", partName: "OVER-2 Head" },
        { id: 2, name: "1-2 Power Substation", bossName: "Volt Mandrill", bossSprite: "mandrill", hp: 3100, atk: 125, def: 60, element: "yellow", partName: "OVER-2 Body" },
        { id: 3, name: "1-3 Quarry Tunnel", bossName: "Iron Armadillo", bossSprite: "armadillo", hp: 3800, atk: 135, def: 95, element: "yellow", partName: "OVER-2 R.Arm" },
        { id: 4, name: "1-4 Molten Smelter", bossName: "Magma Mammoth", bossSprite: "mammoth", hp: 4500, atk: 160, def: 85, element: "red", partName: "OVER-2 L.Arm" },
        { id: 5, name: "1-5 Central Command", bossName: "Vava Ride Mk-I", bossSprite: "vava", hp: 5600, atk: 190, def: 110, element: "blue", partName: "OVER-2 Legs" },
      ],
    },
    {
      id: 2,
      name: "World 2: Night Cyber City",
      era: "X1 Night Skyline",
      theme: "nightcity",
      epCost: 4,
      recommendLv: 4,
      armorReward: "OVER-3",
      masterBoss: {
        name: "Bospider Cyber Raid",
        level: 45,
        maxHp: 55000,
        atk: 260,
        def: 140,
        sprite: "bospider",
        element: "red",
      },
      stages: [
        { id: 1, name: "2-1 Sky Control Tower", bossName: "Gale Eagle", bossSprite: "eagle", hp: 6200, atk: 210, def: 115, element: "green", partName: "OVER-3 Head" },
        { id: 2, name: "2-2 Neon Spire", bossName: "Boomer Beetle", bossSprite: "beetle", hp: 7200, atk: 235, def: 130, element: "yellow", partName: "OVER-3 Body" },
        { id: 3, name: "2-3 Deep Sea Trench", bossName: "Torpedo Octopus", bossSprite: "octopus", hp: 8400, atk: 255, def: 145, element: "blue", partName: "OVER-3 R.Arm" },
        { id: 4, name: "2-4 Bio Forest Lab", bossName: "Optic Chameleon", bossSprite: "chameleon", hp: 9500, atk: 275, def: 160, element: "green", partName: "OVER-3 L.Arm" },
        { id: 5, name: "2-5 Doppler Citadel", bossName: "Dr. Doppler Core", bossSprite: "doppler", hp: 11500, atk: 310, def: 180, element: "red", partName: "OVER-3 Legs" },
      ],
    },
    {
      id: 3,
      name: "World 3: Industrial Factory",
      era: "Classic 20XX",
      theme: "factory",
      epCost: 5,
      recommendLv: 8,
      armorReward: "OVER-4",
      masterBoss: {
        name: "Yellow Devil Mk-X",
        level: 70,
        maxHp: 92000,
        atk: 350,
        def: 210,
        sprite: "devil",
        element: "yellow",
      },
      stages: [
        { id: 1, name: "3-1 Timber Sector", bossName: "Shear Cutizer", bossSprite: "cutman", hp: 12800, atk: 320, def: 185, element: "green", partName: "OVER-4 Head" },
        { id: 2, name: "3-2 High Voltage Grid", bossName: "Thunder Electra", bossSprite: "elecman", hp: 14500, atk: 355, def: 195, element: "yellow", partName: "OVER-4 Body" },
        { id: 3, name: "3-3 Subzero Plant", bossName: "Frost Cryo", bossSprite: "penguin", hp: 16200, atk: 375, def: 215, element: "blue", partName: "OVER-4 R.Arm" },
        { id: 4, name: "3-4 Furnace Core", bossName: "Pyro Igniter", bossSprite: "fireman", hp: 18400, atk: 405, def: 230, element: "red", partName: "OVER-4 L.Arm" },
        { id: 5, name: "3-5 Skull Fortress", bossName: "Wily Machine 25", bossSprite: "wily", hp: 22000, atk: 450, def: 260, element: "white", partName: "OVER-4 Legs" },
      ],
    },
    {
      id: 4,
      name: "World 4: Cyber Network Grid",
      era: "Battle Network",
      theme: "cyber",
      epCost: 6,
      recommendLv: 12,
      armorReward: "OVER-10",
      masterBoss: {
        name: "Gospel Bug Beast",
        level: 99,
        maxHp: 150000,
        atk: 490,
        def: 290,
        sprite: "utsuboros",
        element: "red",
      },
      stages: [
        { id: 1, name: "4-1 LAN Highway 1", bossName: "AeroMan.EXE", bossSprite: "eagle", hp: 24500, atk: 470, def: 270, element: "green", partName: "OVER-10 Head" },
        { id: 2, name: "4-2 Firewall Sector", bossName: "TorchMan.EXE", bossSprite: "fireman", hp: 27000, atk: 505, def: 290, element: "red", partName: "OVER-10 Body" },
        { id: 3, name: "4-3 Heavy Data Cube", bossName: "TitanMan.EXE", bossSprite: "mandrill", hp: 30000, atk: 535, def: 320, element: "yellow", partName: "OVER-10 R.Arm" },
        { id: 4, name: "4-4 Dendro Server", bossName: "TimberMan.EXE", bossSprite: "chameleon", hp: 33500, atk: 570, def: 340, element: "green", partName: "OVER-10 L.Arm" },
        { id: 5, name: "4-5 Undernet Core", bossName: "Forte.EXE", bossSprite: "vava", hp: 40000, atk: 630, def: 380, element: "white", partName: "OVER-10 Legs" },
      ],
    },
    {
      id: 5,
      name: "World 5: Fortress Lab X",
      era: "Special World",
      theme: "fortress",
      epCost: 7,
      recommendLv: 16,
      armorReward: "OVER-10",
      masterBoss: {
        name: "Omega Sigma Emperor",
        level: 149,
        maxHp: 320000,
        atk: 720,
        def: 420,
        sprite: "wily",
        element: "white",
      },
      stages: [
        { id: 1, name: "5-1 Cryo Tube Bay", bossName: "Rosso.M Crimson", bossSprite: "fireman", hp: 44000, atk: 650, def: 390, element: "red", partName: "Zenith Core I" },
        { id: 2, name: "5-2 Bio Reactor", bossName: "Blu.D Azure", bossSprite: "octopus", hp: 49000, atk: 690, def: 410, element: "blue", partName: "Zenith Core II" },
        { id: 3, name: "5-3 Wind Turbine", bossName: "Verde.R Storm", bossSprite: "eagle", hp: 55000, atk: 740, def: 440, element: "green", partName: "Zenith Core III" },
        { id: 4, name: "5-4 Gold Vault", bossName: "Oro.S Golden", bossSprite: "mandrill", hp: 62000, atk: 790, def: 480, element: "yellow", partName: "Zenith Core IV" },
        { id: 5, name: "5-5 Throne of Nero", bossName: "Nero.L Final", bossSprite: "vava", hp: 75000, atk: 880, def: 520, element: "white", partName: "Zenith Core V" },
      ],
    },
  ];

  // Battle Tower Bosses (50 floors, milestone rewards)
  const TOWER_BOSSES = [
    { floor: 1, name: "Rosso.M Vanguard", sprite: "fireman", hp: 3500, atk: 140, def: 70, element: "red" },
    { floor: 2, name: "Blu.D Sentinel", sprite: "octopus", hp: 5200, atk: 175, def: 90, element: "blue" },
    { floor: 3, name: "Verde.R Tempest", sprite: "eagle", hp: 7500, atk: 215, def: 115, element: "green" },
    { floor: 4, name: "Oro.S Titan", sprite: "mandrill", hp: 10500, atk: 265, def: 145, element: "yellow" },
    { floor: 5, name: "Nero.L Overlord", sprite: "vava", hp: 15000, atk: 330, def: 180, element: "white" },
  ];

  // AI Rivals for Battle Arena PvP & Recent Players list (merged with live multiplayer peers!)
  const AI_RIVALS = [
    { id: "ai_1", name: "Heatman_X", level: 4, armorId: "OVER-1", hp: 920, atk: 310, def: 260, element: "red", rank: 1420 },
    { id: "ai_2", name: "MidniteW", level: 9, armorId: "OVER-2", hp: 1650, atk: 540, def: 420, element: "blue", rank: 680 },
    { id: "ai_3", name: "ZeroBlade25", level: 14, armorId: "OVER-3", hp: 2450, atk: 780, def: 590, element: "green", rank: 215 },
    { id: "ai_4", name: "AegisGold", level: 22, armorId: "OVER-10", hp: 4200, atk: 1180, def: 940, element: "yellow", rank: 42 },
  ];

  window.GameData = {
    rand,
    randInt,
    choice,
    ARMORS,
    CARD_CATALOG,
    WORLDS,
    TOWER_BOSSES,
    AI_RIVALS,
  };
})();
