// Glitchen avatar renderer: oversized cartoon head, expressive animations, thought bubbles, speech bubbles
(function () {
  function drawRoundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawGlitchen(ctx, p, time, isMe) {
    ctx.save();
    const x = p.x || 0;
    const y = p.y || 0;
    const dir = p.dir || 1;
    const scale = p.sizeScale || 1;
    const sx = (p.squashX || 1) * scale;
    const sy = (p.squashY || 1) * scale;
    const anim = p.anim || "idle";

    ctx.translate(x, y);

    // Soft ground shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 2, 16 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.scale(dir * sx, sy);

    // Animation offsets
    let bob = 0;
    let lean = 0;
    let armL = 0;
    let armR = 0;
    let legL = 0;
    let legR = 0;
    let hairLift = 0;

    if (anim === "walk") {
      const w = time * 13;
      bob = Math.abs(Math.sin(w)) * -4;
      lean = 0.08;
      armL = Math.sin(w) * 0.65;
      armR = -Math.sin(w) * 0.65;
      legL = -Math.sin(w) * 7;
      legR = Math.sin(w) * 7;
      hairLift = Math.sin(w * 2) * 1.5;
    } else if (anim === "jump") {
      bob = -2;
      armL = -0.85;
      armR = -0.65;
      legL = -3;
      legR = 4;
      hairLift = -4;
    } else if (anim === "dance") {
      // Synchronized Thriller dance!
      const beat = time * 7.5;
      bob = Math.abs(Math.sin(beat)) * -5;
      lean = Math.sin(beat * 0.5) * 0.16;
      armL = -1.2 + Math.sin(beat) * 0.35;
      armR = -1.1 + Math.cos(beat) * 0.35;
      legL = Math.sin(beat) * 6;
      legR = -Math.sin(beat) * 6;
    } else if (anim === "wave" || anim === "highfive") {
      bob = Math.sin(time * 8) * -2;
      armR = -2.2 + Math.sin(time * 16) * 0.4;
    } else if (anim === "hug") {
      lean = 0.12;
      armL = -1.1;
      armR = -1.1;
    } else if (anim === "drink" || anim === "squeeze") {
      bob = Math.sin(time * 12) * -2;
      armR = -1.4 + Math.sin(time * 14) * 0.25;
    } else {
      // Idle breathing
      bob = Math.sin(time * 2.6 + (p.id || 0)) * -1.2;
    }

    ctx.translate(0, bob);
    ctx.rotate(lean);

    const look = p.look || {};
    const skinColor = look.skinColor || "#f7d7c4";
    const hairColor = look.hairColor || "#f4d03f";
    const hairStyle = look.hairStyle || "Side Part";
    const shirtColor = look.shirtColor || "#212529";
    const pantsColor = look.pantsColor || "#1c2833";
    const hat = look.hat || "None";

    // Back arm
    ctx.save();
    ctx.translate(-5, -27);
    ctx.rotate(armL);
    ctx.strokeStyle = shirtColor;
    ctx.lineWidth = 5.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-4, 13);
    ctx.stroke();
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(-4, 14, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Legs & White Shoes
    // Back leg
    ctx.strokeStyle = pantsColor;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-3, -14);
    ctx.lineTo(-4 + legL * 0.6, -3);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#37474f";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-2 + legL * 0.6, -1.5, 5.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Front leg
    ctx.strokeStyle = pantsColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(3, -14);
    ctx.lineTo(4 + legR * 0.6, -3);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#37474f";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(6 + legR * 0.6, -1.5, 5.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Torso (small cartoon body)
    ctx.fillStyle = shirtColor;
    drawRoundedRect(ctx, -8.5, -31, 17, 19, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Subtle shirt stripe/detail
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(-6, -24, 12, 2.5);

    // Front arm
    ctx.save();
    ctx.translate(5, -27);
    ctx.rotate(armR);
    ctx.strokeStyle = shirtColor;
    ctx.lineWidth = 5.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(4, 13);
    ctx.stroke();
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(4, 14, 3, 0, Math.PI * 2);
    ctx.fill();
    if (anim === "drink") {
      // Little cup/mug in hand
      ctx.fillStyle = "#ef6c00";
      ctx.fillRect(2, 11, 6, 7);
    }
    ctx.restore();

    // Oversized Rounded Cartoon Head
    ctx.save();
    ctx.translate(0, -45);

    // Back hair layer for long/side-part
    ctx.fillStyle = hairColor;
    if (hairStyle === "Side Part" || hairStyle === "Curly Bob") {
      ctx.beginPath();
      ctx.ellipse(-8, 1 + hairLift * 0.5, 9, 13, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Head base
    ctx.fillStyle = skinColor;
    ctx.strokeStyle = "#2c221e";
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, -15, -14, 30, 27, 13);
    ctx.fill();
    ctx.stroke();

    // Rosy cheek
    ctx.fillStyle = "rgba(236, 112, 99, 0.28)";
    ctx.beginPath();
    ctx.ellipse(8, 3, 3.5, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Large Oval Eyes (white sclera, dark pupils, periodic blink)
    const blinkCycle = (time * 0.8 + (p.id || 1) * 1.7) % 4.2;
    const blinking = blinkCycle > 4.05;
    if (blinking) {
      ctx.strokeStyle = "#1c2833";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(5, -2);
      ctx.moveTo(8, -2);
      ctx.lineTo(13, -2);
      ctx.stroke();
    } else {
      // Left eye
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#1c2833";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(2.5, -2.5, 3.8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Right eye
      ctx.beginPath();
      ctx.ellipse(10.2, -2.5, 3.6, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupils
      ctx.fillStyle = "#17202a";
      ctx.beginPath();
      ctx.arc(3.5, -2.2, 2.1, 0, Math.PI * 2);
      ctx.arc(11.0, -2.2, 2.0, 0, Math.PI * 2);
      ctx.fill();

      // Eye shine
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(4.2, -3.5, 0.9, 0, Math.PI * 2);
      ctx.arc(11.6, -3.5, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth
    ctx.strokeStyle = "#2c221e";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (anim === "dance" || anim === "wave" || anim === "highfive") {
      ctx.arc(6.5, 5.5, 3.5, 0.1, Math.PI - 0.1);
    } else {
      ctx.moveTo(3.5, 6.5);
      ctx.quadraticCurveTo(6.8, 8.2, 10, 6.2);
    }
    ctx.stroke();

    // Hair foreground
    ctx.fillStyle = hairColor;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.2;
    if (hairStyle === "Side Part") {
      // Classic Beau sweeping side-part blond hair
      ctx.beginPath();
      ctx.moveTo(-15, -4);
      ctx.quadraticCurveTo(-14, -18 + hairLift, 2, -16 + hairLift);
      ctx.quadraticCurveTo(15, -15 + hairLift, 16, -4 + hairLift);
      ctx.quadraticCurveTo(7, -8, -4, -6);
      ctx.quadraticCurveTo(-10, 3 + hairLift, -14, 9 + hairLift);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (hairStyle === "Spiky Tuft") {
      ctx.beginPath();
      ctx.moveTo(-14, -6);
      ctx.lineTo(-9, -19 + hairLift);
      ctx.lineTo(-2, -14);
      ctx.lineTo(4, -21 + hairLift);
      ctx.lineTo(9, -13);
      ctx.lineTo(15, -17 + hairLift);
      ctx.lineTo(14, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (hairStyle === "Twin Buns") {
      ctx.beginPath();
      ctx.arc(-11, -14 + hairLift, 6, 0, Math.PI * 2);
      ctx.arc(9, -14 + hairLift, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -11, 14, 5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    } else if (hairStyle === "Tall Pompadour") {
      ctx.beginPath();
      ctx.ellipse(3, -15 + hairLift, 15, 8, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Curly Bob
      ctx.beginPath();
      ctx.arc(-9, -11 + hairLift, 7, 0, Math.PI * 2);
      ctx.arc(0, -13 + hairLift, 7, 0, Math.PI * 2);
      ctx.arc(9, -10 + hairLift, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Optional Hat / Mask (Rule 1 & Footage B top-right red/black top hat)
    if (hat === "Red Top Hat") {
      ctx.fillStyle = "#1c2833";
      ctx.fillRect(-16, -15, 32, 3.5);
      ctx.fillStyle = "#c62828";
      drawRoundedRect(ctx, -11, -30, 22, 16, 3);
      ctx.fill();
      ctx.fillStyle = "#1c2833";
      ctx.fillRect(-11, -18, 22, 3);
    } else if (hat === "Crown of Ur") {
      ctx.fillStyle = "#ffca28";
      ctx.strokeStyle = "#b7791f";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-10, -13);
      ctx.lineTo(-11, -24);
      ctx.lineTo(-4, -18);
      ctx.lineTo(0, -26);
      ctx.lineTo(4, -18);
      ctx.lineTo(11, -24);
      ctx.lineTo(10, -13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (hat === "Feathered Cap") {
      ctx.fillStyle = "#2e7d32";
      ctx.beginPath();
      ctx.ellipse(0, -14, 15, 6, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ef5350";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-6, -16);
      ctx.quadraticCurveTo(-16, -28, -4, -29);
      ctx.stroke();
    } else if (hat === "Fox Mask") {
      ctx.fillStyle = "#ff7043";
      ctx.beginPath();
      ctx.moveTo(-4, -9);
      ctx.lineTo(0, -17);
      ctx.lineTo(5, -10);
      ctx.lineTo(11, -17);
      ctx.lineTo(15, -4);
      ctx.lineTo(6, 4);
      ctx.closePath();
      ctx.fill();
    } else if (hat === "Propeller Beanie") {
      ctx.fillStyle = "#1e88e5";
      ctx.beginPath();
      ctx.arc(0, -12, 11, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = "#fdd835";
      ctx.lineWidth = 2.2;
      const spin = Math.cos(time * 18) * 9;
      ctx.beginPath();
      ctx.moveTo(-spin, -25);
      ctx.lineTo(spin, -25);
      ctx.stroke();
    }

    ctx.restore(); // end head
    ctx.restore(); // end flip/scale

    // Nameplate below or above
    ctx.save();
    ctx.translate(x, y);
    const topY = -68 * scale;

    // Thought-bubble tool animation when mining / watering / digging (A 08:26-08:33)
    if (p.thoughtTool) {
      const bx = 0;
      const by = topY - 26;
      // Little thought cloud circles
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#90a4ae";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-4, topY - 6, 3, 0, Math.PI * 2);
      ctx.arc(-1, topY - 12, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Main white thought bubble
      drawRoundedRect(ctx, bx - 18, by - 16, 36, 30, 12);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(bx, by - 1);
      const swing = Math.sin(time * 14) * 0.65;
      ctx.rotate(swing);
      if (p.thoughtTool === "pickaxe") {
        // Animated black/steel pickaxe swinging up and down (exact A 08:26 detail)
        ctx.strokeStyle = "#5d4037";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-6, 7);
        ctx.lineTo(6, -7);
        ctx.stroke();
        ctx.strokeStyle = "#263238";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(2, -3, 8, -Math.PI * 0.75, -Math.PI * 0.05);
        ctx.stroke();
      } else if (p.thoughtTool === "watering_can") {
        ctx.fillStyle = "#42a5f5";
        ctx.fillRect(-7, -4, 12, 9);
        ctx.strokeStyle = "#1e88e5";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(11, -5);
        ctx.stroke();
      } else if (p.thoughtTool === "shovel") {
        ctx.strokeStyle = "#6d4c41";
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(4, 4);
        ctx.stroke();
        ctx.fillStyle = "#90a4ae";
        ctx.fillRect(2, 2, 6, 6);
      } else if (p.thoughtTool === "hi") {
        // Daily hi-sign badge (e.g., Bats!)
        ctx.fillStyle = "#6a1b9a";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.hiSign || "Bats!", 0, 4);
      }
      ctx.restore();
    }

    // Overhead speech bubble
    if (p.speech && p.speechTimer > 0) {
      ctx.font = "600 12px 'Trebuchet MS', sans-serif";
      const text = String(p.speech).slice(0, 64);
      const tw = Math.min(220, Math.max(48, ctx.measureText(text).width + 20));
      const bx = -tw / 2;
      const by = topY - (p.thoughtTool ? 62 : 34);
      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      ctx.strokeStyle = "#78909c";
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, bx, by, tw, 24, 9);
      ctx.fill();
      ctx.stroke();
      // Pointer triangle
      ctx.beginPath();
      ctx.moveTo(-4, by + 24);
      ctx.lineTo(0, by + 30);
      ctx.lineTo(4, by + 24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#263238";
      ctx.textAlign = "center";
      ctx.fillText(text, 0, by + 16);
    }

    // Player Name Tag
    ctx.font = isMe ? "bold 11px 'Trebuchet MS', sans-serif" : "600 11px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    const nameStr = p.name || "Glitchen";
    const nw = ctx.measureText(nameStr).width + 10;
    ctx.fillStyle = isMe ? "rgba(25, 42, 52, 0.68)" : "rgba(38, 50, 56, 0.58)";
    drawRoundedRect(ctx, -nw / 2, 6, nw, 15, 6);
    ctx.fill();
    ctx.fillStyle = isMe ? "#a7ffeb" : "#ffffff";
    ctx.fillText(nameStr, 0, 17);

    ctx.restore();
  }

  window.AvatarRenderer = {
    drawGlitchen,
    drawRoundedRect,
  };
})();
