# PLAN.md — CYBER-OVER: Memory Horizon

## Core Loop
Players control customizable **OVER-1** reploid units in brisk, side-scrolling auto-runner action stages across iconic cyber-metropolis and fortress worlds. While automatically sprinting left-to-right along parallax highways, players time vertical jumps (with coyote time and jump buffering), auto-charge their buster through three color tiers (Blue 1-pierce, Yellow 2-pierce, Red/Pink 3-pierce), blast formations of ground and aerial mechaniloids for multi-hit combos, and unleash screen-clearing 6-beam **Giga Crush** barrages. Defeated enemies drop Zenny, Battle Memory cards, EP capsules, and 3x3 Map Parts. Completing a stage run triggers a dramatic **"WARNING!!"** transition into a turn-based **Boss Battle** (with normal Shot, charging **C.Shot** gauge, Battle Memory skill cut-ins, and 50-turn counter) to earn **OVER Armor Parts**. Between runs—or directly via the persistent command bar—players customize 5-to-6-slot **Battle Memory Decks** with color-matched **Bonus Lines**, fuse duplicate cards in Enhancement, allocate Level-Up status points (EP / COST), pull Gacha, climb the **Battle Tower**, duel in the **Battle Arena**, and team up with live multiplayer allies in **4-Player Master Boss Raids**.

## What Made the Original Fun
1. **Rhythmic Charge-and-Pierce Action**: Holding fire just long enough for the red/pink tier-3 aura to line up 3 enemies in a row for a satisfying piercing blast, combo counter, and rapid Giga Crush gauge fill.
2. **Synergistic Deck & Armor Building**: Collecting Battle Memory cards from across franchise eras and slotting matching elemental colors onto OVER-1 through OVER-10 armor grids to light up glowing Bonus Lines that multiply HP, ATK, and DEF.
3. **Constant Drops & Fast Pacing**: Every 25-second stage showers the player with Zenny, Battle Memory cards, Map puzzle pieces, Level Ups, and Armor Parts.
4. **Multiplayer Camaraderie**: Seeing fellow OVER units running stages, sending bulk Cheers for Zenny, inspecting decks, and lining up in a 4-unit staggered formation to unleash sequential combo attacks on massive Master Raid Bosses.

## Ordered Feature List

### 1. First Minute: Live Action Stage & Core Combat (`public/js/stage.js`, `public/js/game.js`)
- Instant warp-in to **World 1: Bay Area Highway** (one keypress or click dismisses the title banner; action begins immediately).
- Fixed-timestep 60 FPS side-scrolling auto-runner with multi-layer parallax city skyline, highway bridge, support pillars, and upper platforms.
- Responsive Jump (`Space` / `ArrowUp` / `W` / `Z` or on-screen Jump button) with jump buffering, variable jump height, and coyote time off upper platforms.
- Auto-charging Buster system: cycles Blue (Tier 1, 1 hit) -> Yellow (Tier 2, pierces 2) -> Red/Pink (Tier 3, pierces 3) with particle aura rings; fire with `X` / `ArrowRight` / `J` / `Enter` or on-screen Shot button.
- **Giga Crush** gauge under the top-right action button: fills on multi-kills, fires a leap + 6 vertical laser explosions clearing all enemies on screen (`C` / `K` / `Shift` or Giga Crush button).
- AutoPlay toggle in the top-right corner for hands-free farming.
- Enemy waves (wheeled Rex-2000 mechs, flying Batton drones, shielded cannons) dropping magnetized Zenny coins, glowing green/gold Battle Memory cards, yellow EP capsules, and Map Parts (3x3 puzzle pieces).

### 2. Turn-Based Boss Battles & 4-Player Master Raids (`public/js/boss.js`)
- Reaching 100% stage progress (or clicking "BOSS BATTLE" / "MASTER RAID") triggers the flashing red **WARNING!!** intro.
- faithful turn-based HUD: `Remaining Turns: 49` at top-left, `SKIP` button at top-right, vertical segmented yellow/orange HP bars on left and right edges, and bottom-left `Lv.0 -> Lv.5` **C.Shot** gauge.
- Start-of-turn Battle Memory skill cut-ins (`ATK UP`, `DEF UP`, `SHIELD BREAK`, `HEAT BURN`, `OVERDRIVE`).
- Player chooses Normal Shot or high-damage orange Charge Shot (`C.Shot`); numbers pop with hit-pause and screen shake.
- **4-Player Master Boss Raid**: Staggered 2x2 squad of OVER units on the left (including live room players!) with 4 top-left vertical HP bars attacking sequentially against colossal bosses (Utsuboros, Bospider, Dread Sigma).
- Defeating bosses awards **Armor Parts** (Head, Body, R.Arm, L.Arm, Legs) and unlocks the next World.

### 3. Armors, Battle Memory Deck, Bonus Lines & Enhancement (`public/js/deck.js`, `public/js/data.js`)
- 6 unlockable OVER Armors (`OVER-1` Balanced, `OVER-2` Heavy Buster, `OVER-3` Speed/Blade, `OVER-4` Guard, `OVER-6` Blaze, `OVER-10` Ultimate Gold), each with distinct sprite design, elemental affinity, and slot geometry.
- Interactive Battle Memory Deck screen with Left Stats Panel (`HP`, `ATK`, `DEF`, `CST`), center slot node graph, and glowing **Bonus Lines** when connected cards share border colors (Red, Blue, Yellow, Green, White).
- **Card Enhancement** (fuse duplicates/fodder for Zenny to raise Card Lv and Skill Lv) & **Gacha Pulls** (200 Zenny Normal / 300 Crest Special).
- **Level Up Modal / Bar**: Distribute 5 Status Points per level between `EP` and `COST`.

### 4. Worlds, Battle Arena PvP & Battle Tower (`public/js/data.js`, `public/js/ui.js`)
- 6 distinct playable Worlds with unique procedural parallax art and bosses:
  1. **World 1: Bay Area Highway** (Chill Penguin, Spark Mandrill, Armored Armadillo, Flame Mammoth)
  2. **World 2: Night Cyber Metropolis** (Storm Eagle, Boomer Kuwanger, Launch Octopus, Dr. Doppler)
  3. **World 3: Industrial Factory City** (Cutizer, Electra, Pyro Rex, Dr. Wily Mech)
  4. **World 4: Cyber Network Grid** (Aero.EXE, Pyro.EXE, Titan.EXE, Wood.EXE)
  5. **World 5: Fortress Lab Interior** (Vava Mk-II, Colonel, General, Sigma Core)
  6. **Battle Tower & Battle Arena**: 50-floor persistent boss gauntlet + 1v1 Tug-of-War PvP Arena using PP pips.

### 5. Real-Time Multiplayer, Cheers & Audio (`public/js/sound.js`, `public/net.js`, `server.js`)
- Live co-op runners on the action stage: see other players in the room sprinting, jumping, charging auras, and firing in real time.
- Shared Master Raid Boss HP pool across the room via `net.set` / `net.send`, plus live 4-player raid squad formation.
- Post-stage & HUD **Bulk Cheer (一括応援)** button and quick chat/emote wheel that sends cheers to room players and grants Zenny to everyone.
- Full procedural WebAudio synthesizer: energetic Mega-style rock/chiptune BGM loops (Stage, Boss, Menu) + crisp SFX for buster shots, charge loop, multi-hit pierce, Giga Crush lasers, coin/card pickup, skill cut-in, and victory fanfare.
