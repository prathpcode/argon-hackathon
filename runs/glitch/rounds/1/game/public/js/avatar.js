// Procedural 2D Vector Cartoon Avatar Renderer & Animator (Rules 1, 2, 3, 4)
(function () {
  function defaultLook(seedNum = 0) {
    const W = window.GameData.WARDROBE_OPTIONS;
    const pick = (arr, offset) => arr[(Math.abs(seedNum + offset)) % arr.length];
    return {
      skinColor: pick(W.skinColors, 0),
      hairColor: pick(W.hairColors, 1),
      shirtColor: pick(W.shirtColors, 2),
      pantsColor: pick(W.pantsColors, 3),
      hat: pick(W.hats, 0),
      hairStyle: pick(W.hairStyles, 1),
      eyeStyle: pick(W.eyeStyles, 2),
      coatStyle: pick(W.coatStyles, 0),
      bottomStyle: pick(W.bottomStyles, 0),
    };
  }

  function drawAvatar(ctx, p, timeSec, isLocal = false) {
    const look = p.look || defaultLook(0);
    const scale = (p.scale || 1) * (p.squashX ? 1 : 1);
    const sx = (p.squashX || 1) * scale;
    const sy = (p.squashY || 1) * scale;
    const dir = p.dir || 1;
    const anim = p.anim || "idle";

    ctx.save();
    ctx.translate(p.x, p.y);

    // Soft ground shadow
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.26)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 20 * scale, 6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.scale(dir * sx, sy);

    // Compute skeletal animation offsets
    let bobY = Math.sin(timeSec * 3.2) * 1.6;
    let legL = 0;
    let legR = 0;
    let armL = 0.25;
    let armR = -0.25;
    let headTilt = Math.sin(timeSec * 1.8) * 0.03;
    let torsoLean = 0;

    if (anim === "walk") {
      const w = timeSec * 12;
      bobY = Math.abs(Math.sin(w)) * -4.5;
      legL = Math.sin(w) * 0.65;
      legR = -Math.sin(w) * 0.65;
      armL = -Math.sin(w) * 0.55;
      armR = Math.sin(w) * 0.55;
      torsoLean = 0.07;
    } else if (anim === "jump") {
      bobY = -3;
      legL = -0.45;
      legR = 0.35;
      armL = -2.1;
      armR = -2.3;
      headTilt = -0.12;
    } else if (anim === "fall") {
      legL = 0.25;
      legR = -0.2;
      armL = -1.6;
      armR = -1.8;
      headTilt = 0.1;
    } else if (anim === "climb") {
      const c = timeSec * 9;
      legL = Math.sin(c) * 0.5;
      legR = -Math.sin(c) * 0.5;
      armL = -1.5 + Math.sin(c) * 0.45;
      armR = -1.5 - Math.sin(c) * 0.45;
    } else if (anim === "mine" || anim === "dig") {
      const m = timeSec * 14;
      bobY = Math.sin(m) * 2;
      torsoLean = Math.sin(m) * 0.18;
      armR = -1.2 + Math.sin(m) * 1.1;
      armL = -0.5 + Math.sin(m) * 0.4;
    } else if (anim === "water") {
      bobY = Math.sin(timeSec * 6) * 1.2;
      torsoLean = 0.1;
      armR = -0.75 + Math.sin(timeSec * 8) * 0.15;
      armL = 0.2;
    } else if (anim === "thriller") {
      // Synchronized group zombie dance (Rule 2 & 41)
      const beat = timeSec * 6.5;
      bobY = Math.abs(Math.sin(beat)) * -6;
      torsoLean = Math.sin(beat * 0.5) * 0.22;
      headTilt = Math.cos(beat) * 0.18;
      legL = Math.sin(beat) * 0.5;
      legR = -Math.cos(beat) * 0.5;
      armL = -1.25 + Math.sin(beat * 2) * 0.28;
      armR = -1.15 + Math.cos(beat * 2) * 0.28;
    }

    ctx.translate(0, bobY);

    // Coat / Cape behind body
    if (look.coatStyle === "cape" || look.coatStyle === "cloak") {
      ctx.save();
      ctx.fillStyle = look.coatStyle === "cape" ? "#9B2C3E" : "#34495E";
      ctx.beginPath();
      ctx.moveTo(-6, -42);
      ctx.quadraticCurveTo(-22 - Math.abs(legL) * 8, -22, -18, -10);
      ctx.lineTo(4, -12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Back Arm (Left)
    ctx.save();
    ctx.translate(-5, -39);
    ctx.rotate(armL);
    ctx.strokeStyle = look.skinColor;
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 15);
    ctx.stroke();
    ctx.restore();

    // Legs & Shoes
    const drawLeg = (hipX, angle, isFront) => {
      ctx.save();
      ctx.translate(hipX, -19);
      ctx.rotate(angle);
      ctx.strokeStyle = look.bottomStyle === "shorts" || look.bottomStyle === "skirt" || look.bottomStyle === "dress"
        ? look.skinColor
        : look.pantsColor;
      ctx.lineWidth = 5.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 15);
      ctx.stroke();
      // Shoe
      ctx.fillStyle = isFront ? "#2C221E" : "#1F1815";
      ctx.beginPath();
      ctx.ellipse(3, 16, 6.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    drawLeg(-4, legL, false);
    drawLeg(4, legR, true);

    // Torso (Shirt / Dress / Skirt / Waistcoat)
    ctx.save();
    ctx.translate(0, -20);
    ctx.rotate(torsoLean);
    ctx.fillStyle = look.shirtColor;
    ctx.beginPath();
    ctx.roundRect(-10, -24, 20, 24, 6);
    ctx.fill();

    if (look.coatStyle === "waistcoat") {
      ctx.fillStyle = "#3E2C41";
      ctx.fillRect(-9, -22, 6, 20);
      ctx.fillRect(3, -22, 6, 20);
    }

    if (look.bottomStyle === "skirt" || look.bottomStyle === "dress") {
      ctx.fillStyle = look.bottomStyle === "dress" ? look.shirtColor : look.pantsColor;
      ctx.beginPath();
      ctx.moveTo(-10, -6);
      ctx.lineTo(10, -6);
      ctx.lineTo(14, 7);
      ctx.lineTo(-14, 7);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = look.pantsColor;
      ctx.beginPath();
      ctx.roundRect(-10, -7, 20, 9, 3);
      ctx.fill();
    }

    // Head (Large whimsical Glitch-style head)
    ctx.save();
    ctx.translate(0, -26);
    ctx.rotate(headTilt);

    // Pointy Ears
    ctx.fillStyle = look.skinColor;
    ctx.beginPath();
    ctx.moveTo(-16, -15);
    ctx.lineTo(-27, -20);
    ctx.lineTo(-17, -9);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(16, -15);
    ctx.lineTo(25, -20);
    ctx.lineTo(17, -9);
    ctx.closePath();
    ctx.fill();

    // Main Head Shape
    ctx.fillStyle = look.skinColor;
    ctx.beginPath();
    ctx.ellipse(2, -16, 19, 17.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rosy cheek
    ctx.fillStyle = "rgba(225, 95, 105, 0.28)";
    ctx.beginPath();
    ctx.ellipse(-3, -11, 4.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (with periodic blink)
    const isBlinking = (Math.floor(timeSec * 2.3 + (p.id || 0)) % 9) === 0 && (timeSec % 1) < 0.14;
    if (isBlinking) {
      ctx.strokeStyle = "#2A2220";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(7, -17);
      ctx.moveTo(11, -17);
      ctx.lineTo(17, -17);
      ctx.stroke();
    } else {
      // Whites of eyes
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.ellipse(4, -17, 4.6, 5.2, 0, 0, Math.PI * 2);
      ctx.ellipse(13.5, -17, 4.2, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pupils
      ctx.fillStyle = anim === "thriller" ? "#E85D04" : "#1E242B";
      ctx.beginPath();
      ctx.arc(5.2, -17, 2.4, 0, Math.PI * 2);
      ctx.arc(14.5, -17, 2.2, 0, Math.PI * 2);
      ctx.fill();
      // Eye catchlight
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(6.0, -18.2, 0.9, 0, Math.PI * 2);
      ctx.arc(15.2, -18.2, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Small whimsical nose
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.arc(10, -13, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = "#2E211E";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (anim === "jump" || anim === "thriller") {
      ctx.fillStyle = "#4A1C24";
      ctx.arc(8, -7.5, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.arc(7.5, -8.5, 4.2, 0.15, Math.PI - 0.25);
      ctx.stroke();
    }

    // Hair
    ctx.fillStyle = look.hairColor;
    if (look.hairStyle === "spiky") {
      ctx.beginPath();
      ctx.moveTo(-16, -24);
      ctx.lineTo(-10, -37);
      ctx.lineTo(-2, -31);
      ctx.lineTo(5, -39);
      ctx.lineTo(12, -31);
      ctx.lineTo(19, -35);
      ctx.lineTo(18, -24);
      ctx.closePath();
      ctx.fill();
    } else if (look.hairStyle === "pigtails") {
      ctx.beginPath();
      ctx.arc(0, -24, 16, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-19, -22, 6, 0, Math.PI * 2);
      ctx.arc(19, -22, 5.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (look.hairStyle === "pompadour") {
      ctx.beginPath();
      ctx.ellipse(4, -31, 18, 8, -0.15, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, -27, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hat (Rule 1 & Footage B 01:12 black top-hat with red band)
    if (look.hat === "top_hat") {
      ctx.fillStyle = "#1E2226";
      // Brim
      ctx.beginPath();
      ctx.ellipse(1, -31, 21, 4.5, -0.05, 0, Math.PI * 2);
      ctx.fill();
      // Cylinder
      ctx.beginPath();
      ctx.roundRect(-12, -52, 26, 21, 3);
      ctx.fill();
      // Red band
      ctx.fillStyle = "#D63838";
      ctx.fillRect(-12, -36, 26, 4.5);
    } else if (look.hat === "crown") {
      ctx.fillStyle = "#F5C242";
      ctx.beginPath();
      ctx.moveTo(-12, -31);
      ctx.lineTo(-14, -44);
      ctx.lineTo(-5, -37);
      ctx.lineTo(1, -46);
      ctx.lineTo(7, -37);
      ctx.lineTo(15, -44);
      ctx.lineTo(13, -31);
      ctx.closePath();
      ctx.fill();
    } else if (look.hat === "fez") {
      ctx.fillStyle = "#B82937";
      ctx.beginPath();
      ctx.moveTo(-10, -31);
      ctx.lineTo(-7, -46);
      ctx.lineTo(9, -46);
      ctx.lineTo(12, -31);
      ctx.closePath();
      ctx.fill();
    } else if (look.hat === "witch_hat") {
      ctx.fillStyle = "#2E2540";
      ctx.beginPath();
      ctx.ellipse(1, -31, 22, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-11, -31);
      ctx.lineTo(-2, -56);
      ctx.lineTo(12, -31);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore(); // End Head
    ctx.restore(); // End Torso

    // Front Arm (Right) + Active Tool Prop
    ctx.save();
    ctx.translate(4, -39);
    ctx.rotate(armR);
    ctx.strokeStyle = look.skinColor;
    ctx.lineWidth = 4.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 15);
    ctx.stroke();

    // Tool rendering when mining, digging, or watering
    if (anim === "mine") {
      ctx.save();
      ctx.translate(0, 15);
      ctx.strokeStyle = "#8B5A2B";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(16, 12);
      ctx.stroke();
      ctx.strokeStyle = "#9BAAB5";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(14, 10, 9, -0.9, 0.9);
      ctx.stroke();
      ctx.restore();
    } else if (anim === "dig") {
      ctx.save();
      ctx.translate(0, 15);
      ctx.strokeStyle = "#8B5A2B";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(14, 14);
      ctx.stroke();
      ctx.fillStyle = "#7D8B94";
      ctx.beginPath();
      ctx.moveTo(12, 12);
      ctx.lineTo(20, 15);
      ctx.lineTo(15, 21);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (anim === "water") {
      ctx.save();
      ctx.translate(2, 14);
      ctx.fillStyle = "#5C9EC9";
      ctx.fillRect(0, -4, 12, 10);
      ctx.strokeStyle = "#5C9EC9";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(20, -5);
      ctx.stroke();
      // Water droplets
      ctx.fillStyle = "#8CE6FF";
      for (let i = 0; i < 3; i++) {
        const dropOff = ((timeSec * 22 + i * 5) % 14);
        ctx.beginPath();
        ctx.arc(21 + dropOff * 0.6, -4 + dropOff, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore(); // End Front Arm

    ctx.restore(); // End Avatar Transform

    // Name Tag & Speech Bubble (drawn unflipped in world coordinates)
    const headTopY = p.y - 88 * scale;
    ctx.save();
    ctx.font = isLocal ? "bold 12px 'Trebuchet MS', sans-serif" : "12px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    const nameStr = p.name || "Traveler";
    const tw = ctx.measureText(nameStr).width;
    ctx.fillStyle = isLocal ? "rgba(35, 56, 69, 0.78)" : "rgba(25, 38, 46, 0.68)";
    ctx.beginPath();
    ctx.roundRect(p.x - tw / 2 - 7, headTopY - 16, tw + 14, 18, 9);
    ctx.fill();
    ctx.fillStyle = isLocal ? "#E6F7D4" : "#FFFFFF";
    ctx.fillText(nameStr, p.x, headTopY - 3);

    // Overhead Speech Bubble (Rule 36 & Footage B 04:36)
    if (p.bubble && p.bubble.until > performance.now()) {
      drawSpeechBubble(ctx, p.x, headTopY - 24, p.bubble.text);
    }
    ctx.restore();
  }

  function drawSpeechBubble(ctx, x, bottomY, text) {
    ctx.save();
    ctx.font = "13px 'Trebuchet MS', sans-serif";
    const maxW = 210;
    const words = String(text).split(" ");
    const lines = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);

    let boxW = 48;
    for (const l of lines) boxW = Math.max(boxW, ctx.measureText(l).width + 22);
    const boxH = lines.length * 17 + 12;
    const bx = x - boxW / 2;
    const by = bottomY - boxH - 8;

    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#9BA8B0";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    // Pointer tail
    ctx.beginPath();
    ctx.moveTo(x - 6, by + boxH);
    ctx.lineTo(x, by + boxH + 7);
    ctx.lineTo(x + 6, by + boxH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#2E3B42";
    ctx.textAlign = "center";
    lines.forEach((l, i) => {
      ctx.fillText(l, x, by + 17 + i * 17);
    });
    ctx.restore();
  }

  window.AvatarRenderer = {
    defaultLook,
    drawAvatar,
    drawSpeechBubble,
  };
})();
