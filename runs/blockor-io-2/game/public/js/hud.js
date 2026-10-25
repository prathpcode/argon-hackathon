// HUD Renderer (Top-Left 4x4 Minimap, Bottom-Left Green Pill Energy Bar, Top-Right Neon Leaderboard)
(function () {
  const ROW_COLORS = [
    "#2ce8f5", // #1 cyan
    "#52f25d", // #2 lime
    "#ffe033", // #3 yellow
    "#ff922b", // #4 orange
    "#ff52a8", // #5 pink
    "#a875ff", // #6 purple
    "#2ce8f5",
    "#52f25d",
    "#ffe033",
    "#ff922b"
  ];

  function drawHUD(ctx, w, h, state) {
    const { localPlayer, leaderboard, myRank, arenaHalf, isDark, roomName, onlineCount } = state;

    // 1. Top-Left 4x4 Sector Minimap (Rule 23, Video A 00:37)
    const mapSize = 128;
    const mapX = 16;
    const mapY = 16;

    ctx.save();
    ctx.fillStyle = isDark ? "rgba(25, 165, 205, 0.22)" : "rgba(38, 190, 230, 0.28)";
    ctx.strokeStyle = isDark ? "rgba(95, 220, 255, 0.65)" : "rgba(18, 130, 168, 0.72)";
    ctx.lineWidth = 2;
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    ctx.strokeRect(mapX, mapY, mapSize, mapSize);

    // 4x4 grid lines (16 sectors)
    ctx.strokeStyle = isDark ? "rgba(140, 235, 255, 0.24)" : "rgba(15, 110, 145, 0.25)";
    ctx.lineWidth = 1;
    const cell = mapSize / 4;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(mapX + i * cell, mapY);
      ctx.lineTo(mapX + i * cell, mapY + mapSize);
      ctx.moveTo(mapX, mapY + i * cell);
      ctx.lineTo(mapX + mapSize, mapY + i * cell);
      ctx.stroke();
    }

    // Plot rival & remote dots on minimap
    if (state.allEntities) {
      for (const ent of state.allEntities) {
        if (!ent.alive || ent === localPlayer) continue;
        const nx = Math.max(0, Math.min(1, (ent.x + arenaHalf) / (arenaHalf * 2)));
        const ny = Math.max(0, Math.min(1, (ent.y + arenaHalf) / (arenaHalf * 2)));
        const px = mapX + nx * mapSize;
        const py = mapY + ny * mapSize;
        ctx.fillStyle = ent.isLeader ? "#ffe033" : "rgba(255,255,255,0.65)";
        ctx.beginPath();
        ctx.arc(px, py, ent.isLeader ? 3.5 : 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Plot Local Player dot on minimap
    if (localPlayer) {
      const nx = Math.max(0, Math.min(1, (localPlayer.x + arenaHalf) / (arenaHalf * 2)));
      const ny = Math.max(0, Math.min(1, (localPlayer.y + arenaHalf) / (arenaHalf * 2)));
      const px = mapX + nx * mapSize;
      const py = mapY + ny * mapSize;

      ctx.fillStyle = "#11161f";
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();

    // 2. Bottom-Left Vertical Green Energy / Boost Bar (Rules 8, 10, 23)
    const barW = 20;
    const barH = 148;
    const barX = 22;
    const barY = h - barH - 24;
    const energyPct = localPlayer ? Math.round(localPlayer.energy) : 100;
    const fillRatio = Math.max(0, Math.min(1, energyPct / 100));

    ctx.save();
    // Plain numeric readout above bar matching original footage (Video A 00:53)
    ctx.font = '800 12px "Trebuchet MS", sans-serif';
    ctx.textAlign = "center";
    ctx.fillStyle = isDark ? "#e8f0ff" : "#1d2430";
    ctx.fillText(`${energyPct}`, barX + barW * 0.5, barY - 8);

    // Outer pill border (thick black border + dark gray background)
    const r = barW * 0.5;
    roundRect(ctx, barX, barY, barW, barH, r);
    ctx.fillStyle = "#22262e";
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "#0b0d12";
    ctx.stroke();

    // Inner bright lime-green fill (or gold when actively spinning)
    if (fillRatio > 0.02) {
      const fillH = Math.max(barW, barH * fillRatio);
      const fillY = barY + barH - fillH;
      ctx.save();
      roundRect(ctx, barX + 2, barY + 2, barW - 4, barH - 4, r - 2);
      ctx.clip();
      const grad = ctx.createLinearGradient(barX, fillY, barX + barW, fillY);
      if (localPlayer && localPlayer.spinning) {
        grad.addColorStop(0, "#fff066");
        grad.addColorStop(1, "#f5b800");
      } else {
        grad.addColorStop(0, "#70ff4d");
        grad.addColorStop(1, "#29cc1b");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(barX, fillY, barW, fillH);
      ctx.restore();
    }
    ctx.restore();

    // 3. Top-Right Neon Leaderboard (#1 to #10 + player's own rank row) (Rules 21, 23)
    const lbW = 215;
    const lbX = w - lbW - 16;
    const lbY = 16;
    const rowH = 20;
    const top10 = leaderboard.slice(0, 10);

    ctx.save();
    ctx.font = '800 13px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.textBaseline = "middle";

    for (let i = 0; i < top10.length; i++) {
      const entry = top10[i];
      const y = lbY + i * rowH + 10;
      const skin = entry.skinId ? window.Skins.getSkin(entry.skinId) : null;
      const pal = skin ? window.Skins.getPalette(skin.paletteIndex) : null;
      const col = pal ? pal.top : ROW_COLORS[i % ROW_COLORS.length];
      const isMe = localPlayer && entry.id === localPlayer.id;

      // Subtle dark backing for readability on light grid
      if (isMe) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.fillRect(lbX - 6, y - 9, lbW + 8, rowH - 1);
      }

      ctx.strokeStyle = "rgba(8, 10, 15, 0.88)";
      ctx.lineWidth = 3;

      // Rank & Name colored by that player's block color (Video A 00:37, 00:41)
      ctx.textAlign = "left";
      const rankStr = `#${i + 1} `;
      const maxName = String(entry.name || "Player").slice(0, 14);
      ctx.strokeText(rankStr + maxName, lbX, y);
      ctx.fillStyle = col;
      ctx.fillText(rankStr + maxName, lbX, y);

      // Score
      ctx.textAlign = "right";
      const scStr = String(entry.score);
      ctx.strokeText(scStr, lbX + lbW, y);
      ctx.fillStyle = col;
      ctx.fillText(scStr, lbX + lbW, y);
    }

    // If local player is outside Top 10, show their row directly underneath
    if (localPlayer && myRank > 10) {
      const y = lbY + top10.length * rowH + 16;
      const mySkin = window.Skins.getSkin(localPlayer.skinId);
      const myPal = mySkin ? window.Skins.getPalette(mySkin.paletteIndex) : null;
      const col = myPal ? myPal.top : "#ffffff";
      ctx.strokeStyle = "rgba(8, 10, 15, 0.9)";
      ctx.lineWidth = 3;
      ctx.textAlign = "left";
      const txt = `#${myRank} ${String(localPlayer.name).slice(0, 14)}`;
      ctx.strokeText(txt, lbX, y);
      ctx.fillStyle = col;
      ctx.fillText(txt, lbX, y);

      ctx.textAlign = "right";
      const scStr = String(localPlayer.score);
      ctx.strokeText(scStr, lbX + lbW, y);
      ctx.fillText(scStr, lbX + lbW, y);
    }

    // Subtle bottom-right controls reminder & score badge
    if (localPlayer) {
      ctx.font = '700 12px "Trebuchet MS", sans-serif';
      ctx.textAlign = "right";
      ctx.fillStyle = isDark ? "rgba(220,230,248,0.65)" : "rgba(35,42,56,0.68)";
      const modeLabel = localPlayer.heartMode ? "Heart Core" : "Classic Core";
      ctx.fillText(
        `[A/D] Rotate & Boost   [W] Eject Block   [M] Menu   •   ${modeLabel} (${roomName})`,
        w - 18,
        h - 16
      );
    }

    ctx.restore();
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

  window.HUD = {
    drawHUD
  };
})();
