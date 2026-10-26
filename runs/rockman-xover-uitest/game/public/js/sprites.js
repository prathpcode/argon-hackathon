// public/js/sprites.js — Procedural Parallax Worlds, OVER Armors, Enemies, Bosses & Cards
(function () {
  const COLOR_MAP = {
    blue: { main: "#2563eb", glow: "#60a5fa", light: "#dbeafe", border: "#3b82f6" },
    red: { main: "#dc2626", glow: "#f87171", light: "#fee2e2", border: "#ef4444" },
    yellow: { main: "#ca8a04", glow: "#facc15", light: "#fef9c3", border: "#eab308" },
    green: { main: "#16a34a", glow: "#4ade80", light: "#dcfce7", border: "#22c55e" },
    white: { main: "#64748b", glow: "#f8fafc", light: "#f1f5f9", border: "#e2e8f0" },
  };

  function drawStageBackground(ctx, W, H, theme, scrollX, groundY) {
    ctx.save();
    // Sky gradient based on world theme
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    if (theme === "nightcity") {
      sky.addColorStop(0, "#070b19");
      sky.addColorStop(0.6, "#151e3f");
      sky.addColorStop(1, "#2a1b4e");
    } else if (theme === "factory") {
      sky.addColorStop(0, "#2c1206");
      sky.addColorStop(0.55, "#6b280e");
      sky.addColorStop(1, "#b84a18");
    } else if (theme === "cyber") {
      sky.addColorStop(0, "#02182b");
      sky.addColorStop(0.5, "#053c5e");
      sky.addColorStop(1, "#0d698b");
    } else if (theme === "fortress") {
      sky.addColorStop(0, "#090d16");
      sky.addColorStop(0.6, "#131c2e");
      sky.addColorStop(1, "#1e293b");
    } else if (theme === "arena") {
      sky.addColorStop(0, "#041028");
      sky.addColorStop(1, "#0a2a5e");
    } else {
      // "highway" — World 1 Mega Man X1 Bay Area Highway
      sky.addColorStop(0, "#1d4ed8");
      sky.addColorStop(0.45, "#3b82f6");
      sky.addColorStop(0.82, "#93c5fd");
      sky.addColorStop(1, "#dbeafe");
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, groundY);

    // Cyber grid overlay for cyber / arena themes
    if (theme === "cyber" || theme === "arena") {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.22)";
      ctx.lineWidth = 1;
      const step = 48;
      const off = -(scrollX * 0.3) % step;
      for (let x = off; x < W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, groundY);
        ctx.stroke();
      }
      for (let y = 40; y < groundY; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }

    // Far Parallax Layer: Suspension Bridge Towers / Distant Skyline
    const farOff = -(scrollX * 0.15) % 320;
    for (let x = farOff - 320; x < W + 320; x += 320) {
      if (theme === "highway" || theme === "nightcity") {
        // Suspension bridge tower
        ctx.fillStyle = theme === "nightcity" ? "#1e293b" : "#64748b";
        ctx.fillRect(x + 110, 90, 26, groundY - 90);
        ctx.fillRect(x + 180, 90, 26, groundY - 90);
        ctx.fillRect(x + 105, 130, 106, 14);
        ctx.fillRect(x + 105, 220, 106, 14);
        // Suspension cables
        ctx.strokeStyle = theme === "nightcity" ? "rgba(148,163,184,0.3)" : "rgba(71,85,105,0.45)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 123, 95);
        ctx.quadraticCurveTo(x + 20, 260, x - 40, groundY - 40);
        ctx.moveTo(x + 193, 95);
        ctx.quadraticCurveTo(x + 290, 260, x + 360, groundY - 40);
        ctx.stroke();
      }
    }

    // Mid Parallax Layer: Futuristic City Buildings / Fortress Canisters
    const midOff = -(scrollX * 0.35) % 180;
    for (let i = -2; i < Math.ceil(W / 180) + 2; i++) {
      const bx = midOff + i * 180;
      const idx = Math.abs(i * 7 + 3) % 5;
      const bh = 130 + idx * 38;
      const by = groundY - bh;

      if (theme === "fortress") {
        // Blue glowing specimen canisters & metallic wall panels
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(bx + 12, 80, 140, groundY - 80);
        ctx.fillStyle = "rgba(14, 165, 233, 0.38)";
        ctx.fillRect(bx + 36, 130, 92, groundY - 190);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 36, 130, 92, groundY - 190);
      } else {
        ctx.fillStyle =
          theme === "nightcity"
            ? "#0f172a"
            : theme === "factory"
            ? "#431407"
            : theme === "cyber"
            ? "#082f49"
            : "#475569";
        ctx.fillRect(bx + 10, by, 145, bh);
        // Building top bevel
        ctx.fillStyle =
          theme === "nightcity"
            ? "#38bdf8"
            : theme === "factory"
            ? "#fb923c"
            : "#94a3b8";
        ctx.fillRect(bx + 10, by, 145, 6);

        // Windows grid
        ctx.fillStyle =
          theme === "nightcity"
            ? "rgba(250, 204, 21, 0.65)"
            : theme === "factory"
            ? "rgba(251, 146, 60, 0.5)"
            : theme === "cyber"
            ? "rgba(56, 189, 248, 0.55)"
            : "rgba(226, 232, 240, 0.55)";
        for (let wy = by + 18; wy < groundY - 24; wy += 22) {
          for (let wx = bx + 22; wx < bx + 140; wx += 26) {
            ctx.fillRect(wx, wy, 14, 10);
          }
        }
      }
    }

    // Highway Guardrail along groundY
    const railOff = -(scrollX * 1.0) % 96;
    ctx.fillStyle = "#334155";
    ctx.fillRect(0, groundY - 26, W, 10);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(0, groundY - 24, W, 4);
    for (let x = railOff - 96; x < W + 96; x += 96) {
      ctx.fillStyle = "#475569";
      ctx.fillRect(x, groundY - 30, 12, 30);
      // Reflector light
      ctx.fillStyle = "#facc15";
      ctx.fillRect(x + 3, groundY - 22, 6, 6);
    }

    // Ground / Metallic Highway Road (flat greenish-grey road from footage A 00:44)
    const roadGrad = ctx.createLinearGradient(0, groundY, 0, H);
    if (theme === "fortress") {
      roadGrad.addColorStop(0, "#334155");
      roadGrad.addColorStop(0.25, "#1e293b");
      roadGrad.addColorStop(1, "#0f172a");
    } else {
      roadGrad.addColorStop(0, "#5b6e66");
      roadGrad.addColorStop(0.18, "#3f4f49");
      roadGrad.addColorStop(0.55, "#27332f");
      roadGrad.addColorStop(1, "#131a18");
    }
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, groundY, W, H - groundY);

    // Top road curb & hazard/lane markings
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(0, groundY, W, 5);

    const stripeOff = -(scrollX * 1.0) % 80;
    for (let x = stripeOff - 80; x < W + 80; x += 80) {
      ctx.fillStyle = theme === "fortress" ? "#facc15" : "#38bdf8";
      ctx.fillRect(x, groundY + 12, 42, 4);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(x + 10, groundY + 34, 48, 5);
    }

    // Under-bridge girders
    for (let x = stripeOff - 80; x < W + 80; x += 80) {
      ctx.strokeStyle = "rgba(15, 23, 42, 0.55)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, groundY + 48);
      ctx.lineTo(x + 40, H);
      ctx.lineTo(x + 80, groundY + 48);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Draw OVER-1 (or unlocked OVER-2..OVER-10) character sprite
  // Matches footage A 00:44: White & black under-armor, blue/colored armor plates, gold trim on helmet/chest, flowing scarf, buster cannon
  function drawOverCharacter(ctx, x, y, opts = {}) {
    const {
      armor = { primary: "#2a6be4", secondary: "#1e293b", trim: "#facc15", scarf: "#f8fafc" },
      animTime = 0,
      running = true,
      jumping = false,
      chargeTier = 0, // 0, 1 (blue), 2 (yellow), 3 (red/pink)
      shooting = 0,
      facing = 1,
      scale = 1,
      hurt = 0,
      label = null,
    } = opts;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing * scale, scale);

    // Soft ground shadow if near ground
    if (!jumping) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 2, 22, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Charge Aura (Rule 5: Blue tier 1 -> Yellow tier 2 -> Red/Pink tier 3)
    if (chargeTier > 0) {
      const auraColors = [
        null,
        { inner: "rgba(56, 189, 248, 0.40)", outer: "#38bdf8" }, // Tier 1 Blue/Purple
        { inner: "rgba(250, 204, 21, 0.45)", outer: "#facc15" }, // Tier 2 Yellow
        { inner: "rgba(244, 63, 94, 0.52)", outer: "#fb7185" },  // Tier 3 Red/Pink
      ];
      const ac = auraColors[chargeTier] || auraColors[1];
      const pulse = 1 + Math.sin(animTime * 18) * 0.12;
      ctx.save();
      ctx.translate(0, -28);
      ctx.fillStyle = ac.inner;
      ctx.beginPath();
      ctx.arc(0, 0, 32 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = ac.outer;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 36 * pulse, animTime * 8, animTime * 8 + Math.PI * 1.35);
      ctx.stroke();

      // Rising charge particles
      for (let i = 0; i < 4; i++) {
        const py = 18 - ((animTime * 90 + i * 14) % 46);
        const px = Math.sin(animTime * 6 + i * 2) * 20;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
      ctx.restore();
    }

    const stride = running && !jumping ? Math.sin(animTime * 15) : jumping ? 0.6 : 0;
    const bob = running && !jumping ? Math.abs(Math.cos(animTime * 15)) * 3 : 0;
    ctx.translate(0, -bob);

    // Yellow electric shock flinch when damaged (Footage A 16:32)
    if (hurt > 0) {
      ctx.translate(-5, -2);
      ctx.rotate(-0.14);
      if (Math.floor(animTime * 32) % 2 === 0) {
        ctx.save();
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 3; i++) {
          const ang = animTime * 20 + i * 2.1;
          const r1 = 10;
          const r2 = 30;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * r1, -28 + Math.sin(ang) * r1);
          ctx.lineTo(Math.cos(ang + 0.3) * 20, -28 + Math.sin(ang - 0.3) * 20);
          ctx.lineTo(Math.cos(ang) * r2, -28 + Math.sin(ang) * r2);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(254, 240, 138, 0.45)";
        ctx.beginPath();
        ctx.arc(0, -28, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Flowing White/Crimson Scarf trailing left
    ctx.fillStyle = armor.scarf || "#f8fafc";
    ctx.beginPath();
    const wave1 = Math.sin(animTime * 16) * 5;
    const wave2 = Math.cos(animTime * 16) * 7;
    ctx.moveTo(-6, -38);
    ctx.quadraticCurveTo(-24, -42 + wave1, -42, -34 + wave2);
    ctx.lineTo(-38, -25 + wave2);
    ctx.quadraticCurveTo(-20, -32 + wave1, -4, -30);
    ctx.closePath();
    ctx.fill();

    // Back Leg
    ctx.save();
    ctx.translate(-4, -18);
    ctx.rotate(-stride * 0.55);
    ctx.fillStyle = "#e2e8f0"; // White thigh
    ctx.fillRect(-4, 0, 8, 9);
    ctx.fillStyle = armor.primary; // Armored boot
    ctx.fillRect(-5, 8, 11, 11);
    ctx.fillStyle = armor.trim;
    ctx.fillRect(-5, 8, 11, 3);
    ctx.restore();

    // Back Arm (or swinging arm)
    ctx.save();
    ctx.translate(-6, -34);
    ctx.rotate(stride * 0.45);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(-4, 0, 7, 13);
    ctx.fillStyle = armor.primary;
    ctx.fillRect(-5, 9, 9, 8);
    ctx.restore();

    // Torso (Black & White base with Colored Chest Plate & Gold X-Trim)
    ctx.fillStyle = armor.secondary || "#1e293b";
    ctx.fillRect(-9, -38, 18, 21);
    // White side ribs
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(-8, -28, 16, 7);
    // Chest Armor
    ctx.fillStyle = armor.primary;
    ctx.fillRect(-10, -38, 20, 12);
    // Gold/Yellow Chest X-Trim
    ctx.fillStyle = armor.trim || "#facc15";
    ctx.fillRect(-8, -36, 16, 3);
    ctx.fillRect(-3, -38, 6, 10);
    // Core crystal
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(-2, -35, 4, 4);

    // Front Leg
    ctx.save();
    ctx.translate(4, -18);
    ctx.rotate(stride * 0.55);
    ctx.fillStyle = "#ffffff"; // White thigh
    ctx.fillRect(-4, 0, 8, 9);
    ctx.fillStyle = armor.primary; // Boot
    ctx.fillRect(-5, 8, 12, 11);
    ctx.fillStyle = armor.trim; // Knee guard
    ctx.fillRect(-5, 7, 12, 3);
    ctx.restore();

    // Head & Helmet (White face, Blue/Primary helmet, Gold V-Fin crest)
    ctx.save();
    ctx.translate(0, -49);
    // Helmet dome
    ctx.fillStyle = armor.primary;
    ctx.beginPath();
    ctx.arc(0, 0, 12, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(11, 8);
    ctx.lineTo(-11, 8);
    ctx.closePath();
    ctx.fill();

    // Faceplate
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(-4, -2, 11, 9);
    // Eyes (crimson/emerald)
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(2, 0, 4, 4);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(3, 1, 2, 2);

    // Helmet ear pods
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(-9, -2, 5, 7);
    // Gold V-Crest on forehead
    ctx.fillStyle = armor.trim || "#facc15";
    ctx.beginPath();
    ctx.moveTo(4, -3);
    ctx.lineTo(13, -11);
    ctx.lineTo(7, -11);
    ctx.lineTo(1, -5);
    ctx.closePath();
    ctx.fill();
    // Forehead crystal
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(3, -6, 4, 4);
    ctx.restore();

    // Front Arm / X-Buster Cannon aiming right
    ctx.save();
    ctx.translate(4, -33);
    if (shooting > 0 || chargeTier > 0) {
      // Aiming buster forward
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, -3, 8, 6);
      // Buster barrel
      ctx.fillStyle = armor.primary;
      ctx.fillRect(5, -6, 16, 11);
      ctx.fillStyle = armor.trim;
      ctx.fillRect(7, -4, 10, 3);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(19, -4, 3, 7);
      // Muzzle glow
      if (shooting > 0 || chargeTier > 0) {
        ctx.fillStyle = chargeTier === 3 ? "#fb7185" : chargeTier === 2 ? "#facc15" : "#38bdf8";
        ctx.beginPath();
        ctx.arc(23, -0.5, 4 + chargeTier * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.rotate(-stride * 0.45);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(-3, 0, 7, 10);
      ctx.fillStyle = armor.primary;
      ctx.fillRect(-4, 7, 10, 10);
    }
    ctx.restore();

    // Optional player name tag (for multiplayer co-op runners / raid allies)
    if (label) {
      ctx.scale(facing, 1);
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      const tw = ctx.measureText(label).width + 10;
      ctx.fillRect(-tw / 2, -76, tw, 15);
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(label, 0, -65);
    }

    ctx.restore();
  }

  // Draw Enemies in Action Stage (Rex-2000 wheeled mech, Batton aerial drone, Shield Cannon)
  function drawEnemy(ctx, e, animTime) {
    ctx.save();
    ctx.translate(e.x, e.y);

    if (e.type === "batton") {
      // Grey/purple robotic bat (Batton from footage A 00:52)
      const flap = Math.sin(animTime * 22 + e.id) * 10;
      ctx.fillStyle = "#7e22ce";
      ctx.beginPath();
      ctx.moveTo(-6, -14);
      ctx.lineTo(-24, -24 + flap);
      ctx.lineTo(-18, -6 + flap * 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(6, -14);
      ctx.lineTo(24, -24 + flap);
      ctx.lineTo(18, -6 + flap * 0.5);
      ctx.closePath();
      ctx.fill();

      // Body sphere
      ctx.fillStyle = "#475569";
      ctx.beginPath();
      ctx.arc(0, -14, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a855f7";
      ctx.fillRect(-8, -20, 16, 5);
      // Glowing yellow eye
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-6, -14, 6, 4);
    } else if (e.type === "cannon") {
      // Heavy Shielded Turret
      ctx.fillStyle = "#334155";
      ctx.fillRect(-16, -34, 32, 34);
      ctx.fillStyle = "#eab308";
      ctx.fillRect(-18, -28, 36, 6);
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(-24, -22, 16, 9);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(-12, -16, 8, 8);
    } else {
      // Purple/yellow wheeled ground robot (Rex-2000 from footage A 00:46)
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wheel
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(0, -10, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(0, -10, 4, 0, Math.PI * 2);
      ctx.fill();

      // Mech chassis (purple & yellow trim)
      ctx.fillStyle = "#6b21a8";
      ctx.fillRect(-14, -34, 28, 18);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-16, -36, 32, 5);
      ctx.fillRect(-10, -22, 20, 4);
      // Red visor facing left
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(-14, -30, 9, 5);
      // Side cannon
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(-21, -26, 9, 6);
    }

    ctx.restore();
  }

  // Draw Boss Sprite on the Right Side of Boss Battle / Raid Screen
  function drawBoss(ctx, x, y, boss, animTime, hurt = 0) {
    ctx.save();
    ctx.translate(x, y);
    const bob = Math.sin(animTime * 3.5) * 4;
    ctx.translate(0, bob);

    if (hurt > 0 && Math.floor(animTime * 30) % 2 === 0) {
      ctx.filter = "brightness(2.2)";
    }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(0, -bob + 4, 48, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    const sp = boss.sprite || boss.bossSprite || "penguin";
    if (sp === "penguin") {
      // Chill Penguin (Blue/Yellow/Red armor from footage A 02:18)
      // Feet
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-34, -14, 26, 14);
      ctx.fillRect(6, -14, 26, 14);
      // Round armored body
      ctx.fillStyle = "#1d4ed8";
      ctx.beginPath();
      ctx.ellipse(0, -46, 36, 38, 0, 0, Math.PI * 2);
      ctx.fill();
      // White/yellow belly plate
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.ellipse(-6, -42, 22, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      // Red forehead & respirator beak
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(-20, -82, 34, 14);
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(-18, -64);
      ctx.lineTo(-48, -56);
      ctx.lineTo(-18, -46);
      ctx.closePath();
      ctx.fill();
      // Fierce eyes
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(-22, -70, 10, 6);
      // Shoulder cannon arm
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(18, -58, 22, 26);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(22, -52, 14, 10);
    } else if (sp === "utsuboros" || sp === "bospider") {
      // Massive Master Raid Boss (Utsuboros cyber-serpent / Bospider from footage C 07:28)
      for (let i = 4; i >= 0; i--) {
        const sx = i * 22;
        const sy = -35 - i * 16 + Math.sin(animTime * 5 + i) * 8;
        ctx.fillStyle = i % 2 === 0 ? "#15803d" : "#ca8a04";
        ctx.beginPath();
        ctx.arc(sx, sy, 28 - i * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      // Head jaws
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(-38, -68, 42, 32);
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(-32, -62, 14, 10);
      // Fangs
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-36, -36, 8, 12);
      ctx.fillRect(-22, -36, 8, 12);
    } else {
      // Dynamic Heavy Maverick / Robot Master Boss (Mandrill / Eagle / Vava / Wily)
      const col = COLOR_MAP[boss.element || "red"] || COLOR_MAP.red;
      // Legs
      ctx.fillStyle = "#334155";
      ctx.fillRect(-28, -28, 20, 28);
      ctx.fillRect(8, -28, 20, 28);
      ctx.fillStyle = col.main;
      ctx.fillRect(-32, -16, 24, 16);
      ctx.fillRect(6, -16, 24, 16);
      // Armored Torso
      ctx.fillStyle = col.main;
      ctx.fillRect(-34, -78, 68, 52);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-26, -70, 52, 10);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-18, -54, 36, 20);
      ctx.fillStyle = col.glow;
      ctx.beginPath();
      ctx.arc(0, -44, 9, 0, Math.PI * 2);
      ctx.fill();
      // Shoulder Pauldrons
      ctx.fillStyle = col.border;
      ctx.fillRect(-48, -82, 20, 28);
      ctx.fillRect(28, -82, 20, 28);
      // Head & Visor
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-18, -102, 36, 24);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(-16, -94, 20, 7);
      // Heavy Arm Cannon
      ctx.fillStyle = "#475569";
      ctx.fillRect(-58, -64, 26, 16);
      ctx.fillStyle = col.glow;
      ctx.fillRect(-62, -60, 6, 8);
    }

    ctx.restore();
  }

  // Draw Battle Memory Card (Used in Deck grid, Enhancement, Drops, and Skill Cut-ins)
  function drawBattleMemoryCard(ctx, x, y, w, h, card, opts = {}) {
    const { selected = false, compact = false } = opts;
    const cInfo = COLOR_MAP[card.color] || COLOR_MAP.blue;

    ctx.save();
    ctx.translate(x, y);

    // Card drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(3, 4, w, h);

    // Outer Elemental Border
    ctx.fillStyle = cInfo.border;
    ctx.fillRect(0, 0, w, h);

    // Inner Card Canvas
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(3, 3, w - 6, h - 6);

    // Character Portrait Background Gradient
    const bg = ctx.createLinearGradient(0, 3, 0, h - 6);
    bg.addColorStop(0, cInfo.main);
    bg.addColorStop(1, "#090d16");
    ctx.fillStyle = bg;
    ctx.fillRect(5, 5, w - 10, h - 24);

    // Stylized Hero Silhouette / Portrait inside Card
    ctx.save();
    ctx.translate(w / 2, h * 0.44);
    ctx.fillStyle = cInfo.glow;
    ctx.beginPath();
    ctx.arc(0, -6, Math.min(w, h) * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Helmet crest
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(-6, -14);
    ctx.lineTo(0, -24);
    ctx.lineTo(6, -14);
    ctx.closePath();
    ctx.fill();
    // Visor
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-8, -8, 16, 5);
    // Shoulders
    ctx.fillStyle = cInfo.light;
    ctx.fillRect(-16, 6, 32, 12);
    ctx.restore();

    // Rarity Stars at Top-Left
    const stars = Math.min(6, card.rarity || 3);
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("★".repeat(stars), 6, 15);

    // Cost Badge at Top-Right
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(w - 28, 5, 23, 14);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`C${card.cost}`, w - 7, 15);

    // Level & Name Footer
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(3, h - 22, w - 6, 19);
    ctx.fillStyle = "#f8fafc";
    ctx.font = compact ? "bold 9px monospace" : "bold 10px monospace";
    ctx.textAlign = "left";
    const label = compact ? `Lv.${card.level || 1}` : `Lv.${card.level || 1} ${card.name.slice(0, 9)}`;
    ctx.fillText(label, 6, h - 9);

    if (selected) {
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 3;
      ctx.strokeRect(-2, -2, w + 4, h + 4);
    }

    ctx.restore();
  }

  window.Sprites = {
    COLOR_MAP,
    drawStageBackground,
    drawOverCharacter,
    drawEnemy,
    drawBoss,
    drawBattleMemoryCard,
  };
})();
