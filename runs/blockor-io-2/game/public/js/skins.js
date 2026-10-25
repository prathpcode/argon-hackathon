// Procedural gem & creator skin renderer for GEMBLOX.IO
(function () {
  // 6 signature gem palettes matching original footage (cyan, magenta, orange, yellow, lime, royal blue/purple)
  const GEM_PALETTES = [
    { id: "cyan", name: "Cyan Gem", base: "#19c5e8", top: "#6fe7ff", left: "#41d8f5", right: "#0f94b5", bottom: "#0a6f8a", border: "#063a4a", center: "#28d2f4" },
    { id: "magenta", name: "Magenta Gem", base: "#e62e8a", top: "#ff7bc0", left: "#f452a3", right: "#b81d6a", bottom: "#8c114e", border: "#4a0627", center: "#f03d96" },
    { id: "orange", name: "Orange Gem", base: "#f57d1f", top: "#ffb469", left: "#fa9641", right: "#c75b0a", bottom: "#994102", border: "#4d1f00", center: "#ff8829" },
    { id: "yellow", name: "Gold Gem", base: "#f2c618", top: "#ffe875", left: "#fadb43", right: "#c49b08", bottom: "#967402", border: "#4a3800", center: "#fad126" },
    { id: "green", name: "Lime Gem", base: "#32cc44", top: "#7df28a", left: "#55e066", right: "#1e9e2d", bottom: "#12751e", border: "#063d0d", center: "#3dd94f" },
    { id: "purple", name: "Royal Gem", base: "#6f42f5", top: "#a98cff", left: "#8c68fa", right: "#4f25c7", bottom: "#381499", border: "#1b064d", center: "#7b4fff" },
    { id: "red", name: "Ruby Gem", base: "#e82c2c", top: "#ff7878", left: "#f54e4e", right: "#b51818", bottom: "#8a0c0c", border: "#470404", center: "#f23838" }
  ];

  // Available selectable skins (solid gems + iconic creator/character skins from footage)
  const SKINS = [
    { id: "gem_cyan", name: "Cyan Crystal", paletteIndex: 0, emblem: null },
    { id: "gem_red", name: "Ruby Core", paletteIndex: 6, emblem: null },
    { id: "gem_orange", name: "Amber Blaze", paletteIndex: 2, emblem: null },
    { id: "gem_green", name: "Emerald Pulse", paletteIndex: 4, emblem: null },
    { id: "gem_purple", name: "Amethyst", paletteIndex: 5, emblem: null },
    { id: "gem_magenta", name: "Rose Quartz", paletteIndex: 1, emblem: null },
    { id: "gem_yellow", name: "Solar Gold", paletteIndex: 3, emblem: null },
    { id: "kops_flame", name: "Blaze K", paletteIndex: 2, emblem: "kops" },
    { id: "green_jelly", name: "Happy Jelly", paletteIndex: 4, emblem: "jelly" },
    { id: "shark_diamond", name: "Cyber Diamond", paletteIndex: 5, emblem: "diamond" },
    { id: "king_crown", name: "Royal Crown", paletteIndex: 3, emblem: "crown" },
    { id: "holiday_bear", name: "Winter Bear", paletteIndex: 2, emblem: "bear" }
  ];

  function getPalette(indexOrId) {
    if (typeof indexOrId === "number") {
      return GEM_PALETTES[((indexOrId % GEM_PALETTES.length) + GEM_PALETTES.length) % GEM_PALETTES.length];
    }
    return GEM_PALETTES.find((p) => p.id === indexOrId) || GEM_PALETTES[0];
  }

  function getSkin(skinId) {
    return SKINS.find((s) => s.id === skinId) || SKINS[0];
  }

  // Draw a single beveled gem block centered at (cx, cy) with side length `w`
  function drawGemBlock(ctx, cx, cy, w, palette, opts) {
    const o = opts || {};
    const half = w * 0.5;
    const x = cx - half;
    const y = cy - half;
    const bevel = Math.max(3, Math.min(w * 0.17, 22));
    const border = Math.max(1.5, Math.min(w * 0.045, 5));

    // Outer dark border + fill
    ctx.fillStyle = palette.border;
    ctx.fillRect(x, y, w, w);

    const ix = x + border;
    const iy = y + border;
    const iw = w - border * 2;
    if (iw <= 2) return;

    const b = Math.min(bevel, iw * 0.32);

    // Top trapezoid facet
    ctx.fillStyle = palette.top;
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(ix + iw, iy);
    ctx.lineTo(ix + iw - b, iy + b);
    ctx.lineTo(ix + b, iy + b);
    ctx.closePath();
    ctx.fill();

    // Left trapezoid facet
    ctx.fillStyle = palette.left;
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(ix + b, iy + b);
    ctx.lineTo(ix + b, iy + iw - b);
    ctx.lineTo(ix, iy + iw);
    ctx.closePath();
    ctx.fill();

    // Right trapezoid facet
    ctx.fillStyle = palette.right;
    ctx.beginPath();
    ctx.moveTo(ix + iw, iy);
    ctx.lineTo(ix + iw, iy + iw);
    ctx.lineTo(ix + iw - b, iy + iw - b);
    ctx.lineTo(ix + iw - b, iy + b);
    ctx.closePath();
    ctx.fill();

    // Bottom trapezoid facet
    ctx.fillStyle = palette.bottom;
    ctx.beginPath();
    ctx.moveTo(ix, iy + iw);
    ctx.lineTo(ix + b, iy + iw - b);
    ctx.lineTo(ix + iw - b, iy + iw - b);
    ctx.lineTo(ix + iw, iy + iw);
    ctx.closePath();
    ctx.fill();

    // Central square face
    const fx = ix + b;
    const fy = iy + b;
    const fw = iw - b * 2;
    ctx.fillStyle = palette.center;
    ctx.fillRect(fx, fy, fw, fw);

    // Subtle inner rim around central face
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = Math.max(1, border * 0.55);
    ctx.strokeRect(fx + 0.5, fy + 0.5, fw - 1, fw - 1);

    // Diagonal glossy highlight across central face
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + fw * 0.65, fy);
    ctx.lineTo(fx, fy + fw * 0.65);
    ctx.closePath();
    ctx.fill();

    // Draw custom skin emblem if active
    if (o.emblem && fw > 8) {
      drawEmblem(ctx, cx, cy, fw, o.emblem);
    }

    // Draw Heart icon if this is a Heart Core block
    if (o.isHeart && fw > 8) {
      drawHeartIcon(ctx, cx, cy, fw * 0.76);
    }

    // Draw 4-point sparkle if this is a Giant Food Gem
    if (o.sparkle && fw > 12) {
      drawSparkle(ctx, fx + fw * 0.18, fy + fw * 0.18, Math.max(5, fw * 0.16));
    }

    // Merge flash overlay
    if (o.flash && o.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, o.flash)})`;
      ctx.fillRect(ix, iy, iw, iw);
    }
  }

  function drawHeartIcon(ctx, cx, cy, size) {
    ctx.save();
    ctx.translate(cx, cy);
    const s = size * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.78);
    ctx.bezierCurveTo(-s * 1.15, s * 0.1, -s * 1.05, -s * 0.78, -s * 0.48, -s * 0.78);
    ctx.bezierCurveTo(-s * 0.15, -s * 0.78, 0, -s * 0.45, 0, -s * 0.35);
    ctx.bezierCurveTo(0, -s * 0.45, s * 0.15, -s * 0.78, s * 0.48, -s * 0.78);
    ctx.bezierCurveTo(s * 1.05, -s * 0.78, s * 1.15, s * 0.1, 0, s * 0.78);
    ctx.closePath();
    ctx.fillStyle = "#ff1e38";
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, size * 0.09);
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    // Specular highlight on top-left lobe
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(-s * 0.42, -s * 0.36, Math.max(1.2, s * 0.16), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSparkle(ctx, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.22, -r * 0.22, r, 0);
    ctx.quadraticCurveTo(r * 0.22, r * 0.22, 0, r);
    ctx.quadraticCurveTo(-r * 0.22, r * 0.22, -r, 0);
    ctx.quadraticCurveTo(-r * 0.22, -r * 0.22, 0, -r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawEmblem(ctx, cx, cy, fw, type) {
    ctx.save();
    ctx.translate(cx, cy);
    const r = fw * 0.36;
    if (type === "kops") {
      // Bold stylized dark/flame K emblem
      ctx.fillStyle = "#1a110a";
      ctx.strokeStyle = "#fff3d1";
      ctx.lineWidth = Math.max(1, fw * 0.05);
      ctx.beginPath();
      ctx.moveTo(-r * 0.75, -r * 0.85);
      ctx.lineTo(-r * 0.25, -r * 0.85);
      ctx.lineTo(-r * 0.25, -r * 0.1);
      ctx.lineTo(r * 0.35, -r * 0.85);
      ctx.lineTo(r * 0.85, -r * 0.85);
      ctx.lineTo(r * 0.15, 0);
      ctx.lineTo(r * 0.88, r * 0.85);
      ctx.lineTo(r * 0.32, r * 0.85);
      ctx.lineTo(-r * 0.25, r * 0.15);
      ctx.lineTo(-r * 0.25, r * 0.85);
      ctx.lineTo(-r * 0.75, r * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (type === "jelly") {
      // Cute smiling jelly face
      ctx.fillStyle = "#0a3311";
      const eyeR = Math.max(1.5, r * 0.22);
      ctx.beginPath();
      ctx.arc(-r * 0.45, -r * 0.2, eyeR, 0, Math.PI * 2);
      ctx.arc(r * 0.45, -r * 0.2, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-r * 0.5, -r * 0.26, eyeR * 0.42, 0, Math.PI * 2);
      ctx.arc(r * 0.4, -r * 0.26, eyeR * 0.42, 0, Math.PI * 2);
      ctx.fill();
      // Smile mouth
      ctx.strokeStyle = "#0a3311";
      ctx.lineWidth = Math.max(1.5, r * 0.18);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, r * 0.05, r * 0.48, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (type === "diamond") {
      // Glowing cyan diamond emblem
      ctx.fillStyle = "#5cf2ff";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.88);
      ctx.lineTo(r * 0.82, 0);
      ctx.lineTo(0, r * 0.88);
      ctx.lineTo(-r * 0.82, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (type === "crown") {
      // Royal crown emblem
      ctx.fillStyle = "#fff078";
      ctx.strokeStyle = "#593800";
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, r * 0.6);
      ctx.lineTo(-r * 0.85, -r * 0.45);
      ctx.lineTo(-r * 0.38, 0);
      ctx.lineTo(0, -r * 0.65);
      ctx.lineTo(r * 0.38, 0);
      ctx.lineTo(r * 0.85, -r * 0.45);
      ctx.lineTo(r * 0.8, r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (type === "bear") {
      // Bear face + red cap accent
      ctx.fillStyle = "#7a4419";
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.68, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e82c2c";
      ctx.beginPath();
      ctx.moveTo(-r * 0.65, -r * 0.25);
      ctx.lineTo(r * 0.65, -r * 0.25);
      ctx.lineTo(0, -r * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, -r * 0.92, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw white/grey arena obstacle block (2x2 unit scale) matching footage
  function drawObstacleBlock(ctx, cx, cy, w, damageRatio = 0) {
    const half = w * 0.5;
    const x = cx - half;
    const y = cy - half;
    const r = Math.max(3, w * 0.08);

    // Outer dark grey border
    ctx.fillStyle = "#585c66";
    roundRect(ctx, x, y, w, w, r);
    ctx.fill();

    // Main light grey/white body
    const b = Math.max(2, w * 0.055);
    ctx.fillStyle = damageRatio > 0.3 ? "#e3d5d8" : "#eceef2";
    roundRect(ctx, x + b, y + b, w - b * 2, w - b * 2, Math.max(2, r - 1));
    ctx.fill();

    // Recessed inner square frame
    const inset = w * 0.21;
    ctx.strokeStyle = "#b8bdc7";
    ctx.lineWidth = Math.max(1.5, w * 0.045);
    ctx.strokeRect(x + inset, y + inset, w - inset * 2, w - inset * 2);

    // Soft radial gray circle in center
    const grad = ctx.createRadialGradient(cx, cy, w * 0.03, cx, cy, w * 0.22);
    grad.addColorStop(0, "#aeb4c0");
    grad.addColorStop(1, "rgba(174, 180, 192, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  window.Skins = {
    GEM_PALETTES,
    SKINS,
    getPalette,
    getSkin,
    drawGemBlock,
    drawObstacleBlock,
    drawHeartIcon
  };
})();
