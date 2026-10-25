// Procedural 2D Vector Street & Entity Renderer (Rules 5, 8, 9, 12-22, 32, 33)
(function () {
  function drawStreet(ctx, street, camera, state, timeSec) {
    const W = camera.vw;
    const H = camera.vh;

    // 1. Sky gradient (or Home Street style override)
    let skyTop = street.skyTop;
    let skyBottom = street.skyBottom;
    let groundColor = street.groundColor;
    let groundTopColor = street.groundTopColor;
    let theme = street.theme;

    if (street.id === "beaus_home" && state.homeStyle) {
      if (state.homeStyle === "snowy") {
        // Vorn Road snowy pine style (SPEC A 32:06)
        theme = "snowy";
        skyTop = "#B8D4E3";
        skyBottom = "#E6F2F7";
        groundColor = "#D8E8F0";
        groundTopColor = "#FFFFFF";
      } else if (state.homeStyle === "meadow") {
        theme = "savanna";
        skyTop = "#A9DDF2";
        skyBottom = "#E8F5C8";
        groundColor = "#548235";
        groundTopColor = "#78B84A";
      }
    }

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(1, skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 2. Parallax Distant & Midground Layers (Rule 5)
    drawParallax(ctx, street, theme, camera, timeSec);

    // 3. World-space Transform
    ctx.save();
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

    // 4. Interior Wall Decals / Background Architecture
    if (street.id === "bureaucratic_hall") {
      drawBureaucraticHallBackdrop(ctx, street);
    } else if (street.id === "house_interior") {
      drawHouseInteriorBackdrop(ctx, street);
    }

    // 5. Ground Plane with multi-layer soil strata & pebbles
    ctx.fillStyle = groundColor;
    ctx.fillRect(0, street.groundY, street.width, street.height - street.groundY + 200);

    // Deeper soil layer for visual depth
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(0, street.groundY + 34, street.width, street.height - street.groundY + 180);

    // Sub-surface pebbles & roots
    for (let px = 40; px < street.width; px += 95) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.ellipse(px, street.groundY + 20 + (px % 17), 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.beginPath();
      ctx.ellipse(px + 38, street.groundY + 46 + (px % 23), 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground top lip / grass / jagged spooky edge
    ctx.fillStyle = groundTopColor;
    ctx.fillRect(0, street.groundY - 7, street.width, 12);

    // Decorative ground tufts / pebbles
    for (let gx = 60; gx < street.width; gx += 130) {
      if (theme === "savanna") {
        ctx.fillStyle = "#C7BC71";
        ctx.beginPath();
        ctx.moveTo(gx, street.groundY);
        ctx.lineTo(gx - 6, street.groundY - 14);
        ctx.lineTo(gx + 2, street.groundY - 4);
        ctx.lineTo(gx + 8, street.groundY - 16);
        ctx.lineTo(gx + 12, street.groundY);
        ctx.fill();
      } else if (theme === "spooky") {
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.moveTo(gx, street.groundY);
        ctx.lineTo(gx + 18, street.groundY - 10);
        ctx.lineTo(gx + 36, street.groundY);
        ctx.fill();
      } else if (theme === "snowy") {
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.ellipse(gx + 15, street.groundY, 28, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. Doors & Buildings (Rule 9)
    for (const d of street.doors) {
      const hovered = state.hoveredObj && state.hoveredObj.id === d.id;
      drawDoorBuilding(ctx, d, hovered, timeSec);
    }

    // 7. Platforms & Ledges (Rule 3)
    for (const plat of street.platforms) {
      drawPlatform(ctx, plat, theme);
    }

    // 8. Ladders (Rule 2)
    for (const lad of street.ladders || []) {
      drawLadder(ctx, lad);
    }

    // 9. Signposts at Left / Right Boundaries (Rule 8)
    for (const sp of street.signposts) {
      const hovered = state.hoveredObj && state.hoveredObj.id === sp.id;
      drawSignpost(ctx, sp, hovered);
    }

    // 10. Placed Furniture on Street
    for (const furn of state.placedFurniture || []) {
      if (furn.street === street.id) {
        drawPlacedFurniture(ctx, furn);
      }
    }

    // 11. Interactive Entities (Shrines, Trees, Rocks, Vendors, Animals, Bureaucrats, Tower)
    for (const ent of street.entities) {
      const hovered = state.hoveredObj && state.hoveredObj.id === ent.id;
      drawEntity(ctx, ent, hovered, timeSec, state);
    }

    // 12. Active Racing Cubimals (Rule 16)
    for (const cub of state.activeCubimals || []) {
      if (cub.street === street.id) {
        drawCubimal(ctx, cub, timeSec);
      }
    }

    // 13. Floating Quoins (Rule 22)
    for (const q of street.quoins) {
      if (!q.collectedUntil || q.collectedUntil < performance.now()) {
        drawQuoin(ctx, q, timeSec);
      }
    }

    // 14. Other Players on the same street
    if (window.net && window.net.players) {
      for (const [, rp] of window.net.players) {
        if (rp.s && rp.s.area === street.id) {
          window.AvatarRenderer.drawAvatar(
            ctx,
            {
              id: rp.id,
              name: rp.name || rp.s.name || `Player ${rp.id}`,
              x: rp.s.x,
              y: rp.s.y,
              dir: rp.s.dir || 1,
              anim: rp.s.anim || "idle",
              scale: rp.s.scale || 1,
              look: rp.s.look,
              bubble: rp.s.bubble,
            },
            timeSec,
            false
          );
        }
      }
    }

    // 15. Local Player Avatar
    window.AvatarRenderer.drawAvatar(ctx, state.player, timeSec, true);

    // 16. World-Space Particles & Floating Text Feedback
    drawParticlesAndFloats(ctx, state);

    // 17. Hover Pill Tooltip in World Space (Footage A 02:01 pale yellow-green pill)
    if (state.hoveredObj && !state.actionMenu) {
      drawHoverTooltip(ctx, state.hoveredObj);
    }

    ctx.restore();
  }

  function drawParallax(ctx, street, theme, camera, timeSec) {
    const W = camera.vw;
    const H = camera.vh;

    if (theme === "office") return;

    // Distant clouds (0.1x scroll)
    if (theme === "savanna" || theme === "snowy") {
      ctx.save();
      const cloudOff = -(camera.x * 0.1 + timeSec * 4) % 700;
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      for (let cx = cloudOff - 700; cx < W + 700; cx += 350) {
        ctx.beginPath();
        ctx.ellipse(cx + 120, 85, 65, 20, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 155, 76, 48, 24, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 85, 80, 42, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Distant hills / caverns / spooky silhouettes (0.2x scroll)
    ctx.save();
    const offFar = -(camera.x * 0.2) % 600;
    for (let x = offFar - 600; x < W + 600; x += 300) {
      if (theme === "savanna") {
        ctx.fillStyle = "#D5C89A";
        ctx.beginPath();
        ctx.ellipse(x + 150, H - 140, 210, 95, 0, Math.PI, 0);
        ctx.fill();
        // Flat-topped distant acacia silhouette
        ctx.fillStyle = "#B8A978";
        ctx.fillRect(x + 135, H - 240, 6, 65);
        ctx.beginPath();
        ctx.ellipse(x + 138, H - 242, 46, 11, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme === "spooky") {
        // Foggy dark teal mountains & crooked bare trees (Footage A 00:00)
        ctx.fillStyle = "#26332E";
        ctx.beginPath();
        ctx.ellipse(x + 140, H - 120, 220, 130, 0, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = "#141C19";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(x + 90, H - 90);
        ctx.quadraticCurveTo(x + 70, H - 220, x + 110, H - 310);
        ctx.stroke();
      } else if (theme === "snowy") {
        ctx.fillStyle = "#9BBAD1";
        ctx.beginPath();
        ctx.moveTo(x, H - 110);
        ctx.lineTo(x + 150, H - 290);
        ctx.lineTo(x + 300, H - 110);
        ctx.fill();
      } else if (theme === "cavern") {
        // Kalavana rocky arches & holes (Footage A 24:40)
        ctx.fillStyle = "#5E4532";
        ctx.fillRect(x + 40, 60, 220, H - 120);
        ctx.fillStyle = "#3D2C1F";
        ctx.beginPath();
        ctx.arc(x + 150, 240, 42, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Mid-ground layer (0.45x scroll)
    ctx.save();
    const offMid = -(camera.x * 0.45) % 500;
    for (let x = offMid - 500; x < W + 500; x += 250) {
      if (theme === "savanna") {
        ctx.fillStyle = "#B5AC6B";
        ctx.beginPath();
        ctx.ellipse(x + 120, H - 95, 165, 65, 0, Math.PI, 0);
        ctx.fill();
        // Painterly twisted mid-ground savanna tree
        ctx.strokeStyle = "#7D5A38";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(x + 70, H - 125);
        ctx.quadraticCurveTo(x + 62, H - 175, x + 82, H - 210);
        ctx.stroke();
        ctx.fillStyle = "#8C9948";
        ctx.beginPath();
        ctx.ellipse(x + 82, H - 214, 38, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme === "spooky") {
        ctx.strokeStyle = "#0E1412";
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(x + 120, H - 80);
        ctx.lineTo(x + 105, H - 280);
        ctx.lineTo(x + 70, H - 340);
        ctx.stroke();
      } else if (theme === "snowy") {
        // Snowy pine trees
        ctx.fillStyle = "#3E6B5C";
        ctx.beginPath();
        ctx.moveTo(x + 80, H - 110);
        ctx.lineTo(x + 120, H - 250);
        ctx.lineTo(x + 160, H - 110);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawBureaucraticHallBackdrop(ctx, street) {
    // Beige walls, brown baseboard, wall lettering, desk, filing cabinets (Footage B 03:38 - 05:25)
    ctx.fillStyle = "#E6DEC8";
    ctx.fillRect(0, 0, street.width, street.groundY);
    ctx.fillStyle = "#6B4E35";
    ctx.fillRect(0, street.groundY - 18, street.width, 18);

    // Wall Typography: Department of Administrative Affairs / Ministry of Departments
    ctx.fillStyle = "#4A3525";
    ctx.font = "bold 22px Georgia, serif";
    ctx.textAlign = "left";
    ctx.fillText("Department of Administrative Affairs", 260, 385);
    ctx.font = "18px Georgia, serif";
    ctx.fillText("Ministry of Departments", 260, 412);

    // Low wooden reception desk & white trash bin beneath wall text
    ctx.fillStyle = "#B88A58";
    ctx.fillRect(280, 520, 210, 14);
    ctx.fillRect(295, 534, 12, 56);
    ctx.fillRect(465, 534, 12, 56);
    // Papers & tethered pen on desk
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(320, 513, 35, 7);
    ctx.fillRect(370, 514, 28, 6);
    // Small white trash bin
    ctx.fillStyle = "#F2F4F5";
    ctx.fillRect(430, 552, 24, 38);

    // Tall grey metal filing cabinets & counter partition on the right
    for (let fx = 1360; fx <= 1620; fx += 65) {
      ctx.fillStyle = "#8C98A0";
      ctx.fillRect(fx, 390, 58, 200);
      ctx.strokeStyle = "#5E6970";
      ctx.lineWidth = 2;
      ctx.strokeRect(fx, 390, 58, 200);
      for (let dy = 405; dy < 570; dy += 48) {
        ctx.strokeRect(fx + 6, dy, 46, 38);
        ctx.fillStyle = "#CBD4D9";
        ctx.fillRect(fx + 22, dy + 14, 14, 5);
      }
    }
    // Counter desk in front of Secretary Wigglesbottom
    ctx.fillStyle = "#7D6249";
    ctx.fillRect(1400, 510, 180, 80);
  }

  function drawHouseInteriorBackdrop(ctx, street) {
    // Cozy whimsical wallpaper, warm floorboards, framed Giant portraits
    ctx.fillStyle = "#483252";
    ctx.fillRect(0, 0, street.width, street.groundY);
    for (let x = 80; x < street.width; x += 140) {
      ctx.fillStyle = "rgba(255, 220, 160, 0.05)";
      ctx.fillRect(x, 0, 50, street.groundY);
    }
    // Framed portrait
    ctx.fillStyle = "#D4A445";
    ctx.fillRect(580, 220, 110, 85);
    ctx.fillStyle = "#2A3F4D";
    ctx.fillRect(590, 230, 90, 65);
  }

  function drawPlatform(ctx, plat, theme) {
    ctx.save();
    if (plat.style === "rock" || plat.style === "cliff") {
      // Layered faceted rock platform (Footage B 01:25, A 24:40)
      ctx.fillStyle = theme === "cavern" ? "#6B4C35" : "#8A7250";
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.w, plat.h + 26, 8);
      ctx.fill();
      ctx.fillStyle = theme === "cavern" ? "#8A6548" : "#A89862";
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.w, 10, 5);
      ctx.fill();
    } else if (plat.style === "roof") {
      // Crooked house purple/magenta roof ledge (Footage A 00:00, 09:20)
      ctx.fillStyle = "#6B385C";
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 6);
      ctx.fill();
      ctx.fillStyle = "#914E7D";
      ctx.fillRect(plat.x + 4, plat.y, plat.w - 8, 6);
    } else if (plat.style === "bridge") {
      ctx.fillStyle = "#7D5332";
      for (let bx = plat.x; bx < plat.x + plat.w; bx += 28) {
        ctx.fillRect(bx, plat.y, 24, 12);
      }
    } else {
      ctx.fillStyle = "#9C8E75";
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    }
    ctx.restore();
  }

  function drawLadder(ctx, lad) {
    ctx.save();
    ctx.strokeStyle = "#8C6239";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(lad.x - 14, lad.y1);
    ctx.lineTo(lad.x - 14, lad.y2);
    ctx.moveTo(lad.x + 14, lad.y1);
    ctx.lineTo(lad.x + 14, lad.y2);
    ctx.stroke();
    ctx.lineWidth = 3.5;
    for (let y = lad.y1 + 16; y < lad.y2; y += 22) {
      ctx.beginPath();
      ctx.moveTo(lad.x - 14, y);
      ctx.lineTo(lad.x + 14, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawDoorBuilding(ctx, d, hovered, timeSec) {
    ctx.save();
    if (hovered) {
      ctx.shadowColor = "#5CE1E6";
      ctx.shadowBlur = 18;
    }

    if (d.style === "ziggurat") {
      // Ministry of Departments ziggurat stone building (Footage B 02:29)
      const cx = d.x;
      const by = d.y;
      ctx.fillStyle = "#B8B09C";
      ctx.fillRect(cx - 170, by - 140, 340, 140);
      ctx.fillStyle = "#A39B87";
      ctx.fillRect(cx - 130, by - 205, 260, 65);
      ctx.fillStyle = "#8F8774";
      ctx.fillRect(cx - 85, by - 250, 170, 45);

      // Stone block lines
      ctx.strokeStyle = "rgba(60,50,40,0.22)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 170, by - 140, 340, 140);

      // Plaque above door
      ctx.fillStyle = "#574E41";
      ctx.fillRect(cx - 115, by - 126, 230, 24);
      ctx.fillStyle = "#EAE3D2";
      ctx.font = "bold 11px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("Ministry of Departments", cx, by - 110);

      // Wooden Double Doors
      ctx.fillStyle = "#6E4726";
      ctx.beginPath();
      ctx.roundRect(cx - 38, by - 92, 76, 92, [8, 8, 0, 0]);
      ctx.fill();
      if (hovered) {
        ctx.strokeStyle = "#5CE1E6";
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }
      ctx.strokeStyle = "#3E2613";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, by - 92);
      ctx.lineTo(cx, by);
      ctx.stroke();
    } else if (d.style === "crooked_house") {
      // Beau's Crooked House of Whimsy (Footage A 00:00, 09:20)
      const cx = d.x;
      const by = d.y;
      // First story teal-blue walls
      ctx.fillStyle = "#2E5A6B";
      ctx.beginPath();
      ctx.moveTo(cx - 145, by);
      ctx.lineTo(cx - 155, by - 125);
      ctx.lineTo(cx + 150, by - 125);
      ctx.lineTo(cx + 135, by);
      ctx.closePath();
      ctx.fill();

      // Second story crooked teal-blue
      ctx.fillStyle = "#36687A";
      ctx.beginPath();
      ctx.moveTo(cx - 125, by - 125);
      ctx.lineTo(cx - 110, by - 235);
      ctx.lineTo(cx + 125, by - 235);
      ctx.lineTo(cx + 115, by - 125);
      ctx.closePath();
      ctx.fill();

      // Third story turret
      ctx.fillStyle = "#29505E";
      ctx.beginPath();
      ctx.moveTo(cx - 75, by - 235);
      ctx.lineTo(cx - 65, by - 340);
      ctx.lineTo(cx + 75, by - 340);
      ctx.lineTo(cx + 65, by - 235);
      ctx.closePath();
      ctx.fill();

      // Warm orange-lit windows
      ctx.fillStyle = "#F5A623";
      ctx.fillRect(cx - 105, by - 95, 36, 42);
      ctx.fillRect(cx + 60, by - 95, 36, 42);
      ctx.fillRect(cx - 75, by - 195, 42, 42);
      ctx.fillRect(cx + 30, by - 195, 42, 42);
      ctx.fillRect(cx - 20, by - 305, 38, 42);

      // Hanging yellow lantern on top-left gable
      ctx.strokeStyle = "#1A1A1A";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 125, by - 235);
      ctx.lineTo(cx - 150, by - 210);
      ctx.stroke();
      ctx.fillStyle = "#FFE066";
      ctx.beginPath();
      ctx.arc(cx - 150, by - 202, 8 + Math.sin(timeSec * 4) * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Porch steps & arched wooden door
      ctx.fillStyle = "#5C3D28";
      ctx.fillRect(cx - 48, by - 16, 96, 16);
      ctx.fillStyle = "#7A4928";
      ctx.beginPath();
      ctx.roundRect(cx - 30, by - 96, 60, 80, [28, 28, 0, 0]);
      ctx.fill();
      if (hovered) {
        ctx.strokeStyle = "#5CE1E6";
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }
    } else {
      // Interior exit door
      ctx.fillStyle = "#7A5230";
      ctx.fillRect(d.x - 42, d.y - 140, 84, 140);
      ctx.fillStyle = "#A9D6E5";
      ctx.fillRect(d.x - 32, d.y - 128, 28, 60);
      ctx.fillRect(d.x + 4, d.y - 128, 28, 60);
      if (hovered) {
        ctx.strokeStyle = "#5CE1E6";
        ctx.lineWidth = 3.5;
        ctx.strokeRect(d.x - 42, d.y - 140, 84, 140);
      }
    }
    ctx.restore();
  }

  function drawSignpost(ctx, sp, hovered) {
    ctx.save();
    if (hovered) {
      ctx.shadowColor = "#5CE1E6";
      ctx.shadowBlur = 16;
    }
    // Wooden vertical post
    ctx.fillStyle = "#4F3522";
    ctx.fillRect(sp.x - 6, sp.y - 118, 12, 118);

    // Directional planks (Footage B 00:10, A 01:46)
    sp.signs.forEach((s, i) => {
      const sy = sp.y - 105 + i * 32;
      ctx.fillStyle = hovered ? "#6E4B30" : "#5C3D26";
      ctx.strokeStyle = hovered ? "#5CE1E6" : "#3B2616";
      ctx.lineWidth = hovered ? 2.5 : 1.5;
      ctx.beginPath();
      if (sp.dir === "left") {
        ctx.moveTo(sp.x + 55, sy);
        ctx.lineTo(sp.x - 65, sy);
        ctx.lineTo(sp.x - 78, sy + 11);
        ctx.lineTo(sp.x - 65, sy + 22);
        ctx.lineTo(sp.x + 55, sy + 22);
      } else {
        ctx.moveTo(sp.x - 55, sy);
        ctx.lineTo(sp.x + 65, sy);
        ctx.lineTo(sp.x + 78, sy + 11);
        ctx.lineTo(sp.x + 65, sy + 22);
        ctx.lineTo(sp.x - 55, sy + 22);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#F5F2EB";
      ctx.font = "bold 11px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(s.label, sp.x, sy + 15);
    });
    ctx.restore();
  }

  function drawEntity(ctx, ent, hovered, timeSec, state) {
    ctx.save();
    if (hovered) {
      ctx.shadowColor = "#5CE1E6";
      ctx.shadowBlur = 16;
    }

    const x = ent.x;
    const y = ent.y;

    if (ent.type === "shrine") {
      // Stone pedestal/basin sitting on green grass patch (Footage B 00:53, A 24:42)
      ctx.fillStyle = "#68A848";
      ctx.beginPath();
      ctx.ellipse(x, y, 48, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      if (ent.giant === "Lem") {
        // Blue banner & orange cauldron on wooden base (Footage A 24:42)
        ctx.fillStyle = "#2E77B8";
        ctx.fillRect(x - 24, y - 125, 48, 85);
        ctx.fillStyle = "#E08238";
        ctx.beginPath();
        ctx.arc(x, y - 38, 26, 0, Math.PI);
        ctx.fill();
      } else {
        ctx.fillStyle = "#8E969C";
        ctx.fillRect(x - 22, y - 56, 44, 56);
        ctx.fillStyle = "#A7B0B8";
        ctx.beginPath();
        ctx.ellipse(x, y - 58, 36, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Glowing Giant orb above basin
      const gColor = (window.GameData.GIANTS[ent.giant] || {}).color || "#5CE1E6";
      ctx.fillStyle = gColor;
      ctx.beginPath();
      ctx.arc(x, y - 78 + Math.sin(timeSec * 3) * 4, 11, 0, Math.PI * 2);
      ctx.fill();
      if (hovered) {
        ctx.strokeStyle = "#5CE1E6";
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 36, y - 92, 72, 92);
      }
    } else if (ent.type === "fruit_tree") {
      // Pink cherry-blossom Fruit Tree (Footage A 01:51, B 06:04)
      ctx.fillStyle = "#6E492D";
      ctx.beginPath();
      ctx.moveTo(x - 12, y);
      ctx.quadraticCurveTo(x - 6, y - 60, x - 4, y - 105);
      ctx.lineTo(x + 8, y - 105);
      ctx.quadraticCurveTo(x + 10, y - 55, x + 14, y);
      ctx.fill();

      const canopyClusters = [
        { dx: 0, dy: -135, r: 42 },
        { dx: -34, dy: -115, r: 32 },
        { dx: 34, dy: -115, r: 32 },
        { dx: -18, dy: -155, r: 28 },
        { dx: 20, dy: -155, r: 28 },
      ];
      ctx.fillStyle = "#F598B6";
      for (const c of canopyClusters) {
        ctx.beginPath();
        ctx.arc(x + c.dx, y + c.dy, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Hanging red/pink fruits
      ctx.fillStyle = "#D92B4B";
      for (let i = 0; i < (ent.harvestLeft ?? 4); i++) {
        ctx.beginPath();
        ctx.arc(x - 24 + i * 16, y - 115 + (i % 2) * 14, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (ent.type === "wood_tree") {
      // Bare light-brown wooden tree trunk with lopped-off branch stumps (Footage A 02:27)
      ctx.fillStyle = "#A67B52";
      ctx.beginPath();
      ctx.moveTo(x - 16, y);
      ctx.lineTo(x - 10, y - 135);
      ctx.lineTo(x + 10, y - 135);
      ctx.lineTo(x + 16, y);
      ctx.closePath();
      ctx.fill();

      // Stumps
      const count = ent.stumps || 3;
      for (let s = 0; s < count; s++) {
        const sy = y - 45 - s * 28;
        const dir = s % 2 === 0 ? -1 : 1;
        ctx.fillStyle = "#A67B52";
        ctx.beginPath();
        ctx.moveTo(x, sy);
        ctx.lineTo(x + dir * 28, sy - 12);
        ctx.lineTo(x + dir * 28, sy - 2);
        ctx.lineTo(x, sy + 10);
        ctx.fill();
        ctx.fillStyle = "#D9B88F";
        ctx.beginPath();
        ctx.ellipse(x + dir * 28, sy - 7, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (ent.type === "gas_plant") {
      // Coral-pink/red fan-shaped branching plant with glowing cyan circular pods (Footage A 01:54)
      ctx.strokeStyle = "#E05353";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      const branches = [-36, -18, 0, 18, 36];
      branches.forEach((dx, i) => {
        const by = y - 75 - (i % 2) * 18;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + dx * 0.4, y - 40, x + dx, by);
        ctx.stroke();

        ctx.fillStyle = "#5CE1E6";
        ctx.beginPath();
        ctx.arc(x + dx, by, 8.5, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (ent.type === "beryl_rock") {
      // Tall jagged crystalline cyan/teal rock; turns into flat rubble when mined out (Footage A 08:23-08:25)
      if ((ent.health ?? 100) <= 0) {
        ctx.fillStyle = "#3B8F94";
        ctx.beginPath();
        ctx.ellipse(x, y - 8, 38, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#2E9CA3";
        ctx.beginPath();
        ctx.moveTo(x - 36, y);
        ctx.lineTo(x - 24, y - 68);
        ctx.lineTo(x - 4, y - 92);
        ctx.lineTo(x + 22, y - 74);
        ctx.lineTo(x + 38, y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#5CE1E6";
        ctx.beginPath();
        ctx.moveTo(x - 12, y - 10);
        ctx.lineTo(x - 4, y - 84);
        ctx.lineTo(x + 14, y - 62);
        ctx.closePath();
        ctx.fill();
      }
    } else if (ent.type === "magic_rock") {
      // Pale-grey rectangular stone with googly eyes (Footage A 01:44, B 02:44)
      ctx.fillStyle = "#596268";
      ctx.fillRect(x - 24, y - 10, 48, 10);
      ctx.fillStyle = "#A9B4BC";
      ctx.beginPath();
      ctx.roundRect(x - 20, y - 46, 40, 36, 8);
      ctx.fill();
      // Googly eyes
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(x - 7, y - 30, 5.5, 0, Math.PI * 2);
      ctx.arc(x + 7, y - 30, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1A1E21";
      ctx.beginPath();
      ctx.arc(x - 6, y - 30, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 8, y - 30, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (ent.type === "butler") {
      // Butler Roy (Beau): small grey-skinned character with black top hat, white eyes, dark suit (Footage A 00:00, 03:23)
      ctx.fillStyle = "#242A2E";
      ctx.beginPath();
      ctx.roundRect(x - 10, y - 36, 20, 36, 5);
      ctx.fill();
      ctx.fillStyle = "#9BA4AB";
      ctx.beginPath();
      ctx.arc(x, y - 48, 14, 0, Math.PI * 2);
      ctx.fill();
      // White eyes
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(x - 4, y - 49, 3.5, 0, Math.PI * 2);
      ctx.arc(x + 5, y - 49, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Top hat
      ctx.fillStyle = "#14181A";
      ctx.fillRect(x - 16, y - 62, 32, 4);
      ctx.fillRect(x - 11, y - 78, 22, 16);
    } else if (ent.type === "vendor") {
      // Floating brown tiki/totem wooden head with turquoise base (Footage B 05:49)
      const hoverY = y - 32 + Math.sin(timeSec * 3.2) * 5;
      ctx.fillStyle = "#45B8C4";
      ctx.beginPath();
      ctx.ellipse(x, y - 8, 24, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#7A4E2D";
      ctx.beginPath();
      ctx.roundRect(x - 20, hoverY - 46, 40, 46, 6);
      ctx.fill();
      // Glowing eyes
      ctx.fillStyle = "#9EFFD6";
      ctx.beginPath();
      ctx.arc(x - 8, hoverY - 26, 4.5, 0, Math.PI * 2);
      ctx.arc(x + 8, hoverY - 26, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (ent.type === "dirt_pile") {
      // Lumpy dark-brown mound of earth (Footage B 03:01, 06:21)
      ctx.fillStyle = "#63462D";
      ctx.beginPath();
      ctx.ellipse(x, y - 6, 34, 15, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#7D5A3C";
      ctx.beginPath();
      ctx.arc(x - 10, y - 10, 14, Math.PI, 0);
      ctx.arc(x + 8, y - 12, 16, Math.PI, 0);
      ctx.fill();
    } else if (ent.type === "chicken") {
      // Small white chicken with red comb & wattle (Footage B 05:44)
      const dir = ent.vx >= 0 ? 1 : -1;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.ellipse(0, -14, 15, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Red comb
      ctx.fillStyle = "#D93838";
      ctx.beginPath();
      ctx.arc(6, -26, 4.5, 0, Math.PI * 2);
      ctx.arc(1, -26, 4, 0, Math.PI * 2);
      ctx.fill();
      // Beak
      ctx.fillStyle = "#F5A623";
      ctx.beginPath();
      ctx.moveTo(14, -17);
      ctx.lineTo(21, -14);
      ctx.lineTo(14, -11);
      ctx.fill();
      // Eye
      ctx.fillStyle = "#1A1A1A";
      ctx.beginPath();
      ctx.arc(9, -17, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (ent.type === "piggy") {
      // Plump pink Piggy (Rule 15)
      const dir = ent.vx >= 0 ? 1 : -1;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      ctx.fillStyle = "#F598B2";
      ctx.beginPath();
      ctx.ellipse(0, -16, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      // Snout
      ctx.fillStyle = "#E07594";
      ctx.beginPath();
      ctx.ellipse(19, -15, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1A1A1A";
      ctx.beginPath();
      ctx.arc(12, -20, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (ent.type === "butterfly") {
      // Flying blue butterfly (Rule 15 & Footage B 06:05)
      const flap = Math.abs(Math.sin(timeSec * 12));
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = "#5CE1E6";
      ctx.beginPath();
      ctx.ellipse(-6, -4, 10 * flap + 2, 13, -0.3, 0, Math.PI * 2);
      ctx.ellipse(6, -4, 10 * flap + 2, 13, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1F2E38";
      ctx.fillRect(-1.5, -10, 3, 14);
      ctx.restore();
    } else if (ent.type === "water_cooler") {
      // White Water Cooler with translucent light-blue jug on top (Footage B 03:50)
      ctx.fillStyle = "#F2F5F7";
      ctx.fillRect(x - 16, y - 54, 32, 54);
      ctx.fillStyle = "#8AD6F5";
      ctx.beginPath();
      ctx.roundRect(x - 13, y - 86, 26, 32, 8);
      ctx.fill();
      // Spigot
      ctx.fillStyle = "#3B7EA1";
      ctx.fillRect(x - 4, y - 40, 8, 5);
    } else if (ent.type === "waiting_area") {
      // Waiting Area sign & 6 orange molded-plastic chairs (Footage B 03:38 - 05:28)
      ctx.fillStyle = "#4A3525";
      ctx.beginPath();
      ctx.roundRect(x - 95, y - 165, 190, 34, 6);
      ctx.fill();
      ctx.fillStyle = "#F5EBD6";
      ctx.font = "bold 15px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Waiting Area", x, y - 143);

      // Six orange molded-plastic chairs with thin grey metal legs
      for (let i = 0; i < 6; i++) {
        const cx = x - 135 + i * 54;
        ctx.strokeStyle = "#8C969E";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - 10, y - 22);
        ctx.lineTo(cx - 13, y);
        ctx.moveTo(cx + 10, y - 22);
        ctx.lineTo(cx + 13, y);
        ctx.stroke();

        ctx.fillStyle = "#E8702A";
        ctx.beginPath();
        ctx.roundRect(cx - 15, y - 46, 30, 26, 6);
        ctx.fill();
      }
      // Metal stanchion post on right
      ctx.fillStyle = "#7E8A91";
      ctx.fillRect(x + 170, y - 56, 5, 56);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(x + 158, y - 72, 28, 18);
    } else if (ent.type === "bureaucrat") {
      // Frog/lizard-like green bureaucrats with dark suits & glasses (Footage B 04:30 - 05:25)
      ctx.save();
      ctx.translate(x, y);
      // Green tail
      ctx.strokeStyle = "#6BA346";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-8, -14);
      ctx.quadraticCurveTo(-24, -10, -28, -22);
      ctx.stroke();
      // Dark suit
      ctx.fillStyle = "#222A30";
      ctx.beginPath();
      ctx.roundRect(-12, -44, 24, 34, 5);
      ctx.fill();
      // White shirt & red tie
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(-4, -42, 8, 16);
      ctx.fillStyle = "#C93434";
      ctx.fillRect(-1.5, -40, 3, 14);
      // Frog head
      ctx.fillStyle = "#76B54D";
      ctx.beginPath();
      ctx.ellipse(0, -54, 16, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Glasses & eyes
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(-5, -57, 4.5, 0, Math.PI * 2);
      ctx.arc(6, -57, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1A1A1A";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#1A1A1A";
      ctx.beginPath();
      ctx.arc(-5, -57, 2, 0, Math.PI * 2);
      ctx.arc(6, -57, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (ent.type === "tower_project") {
      // Wooden scaffolding/palisade enclosure with floating progress badge (Footage A 02:33)
      ctx.fillStyle = "#7A5230";
      for (let px = x - 65; px <= x + 55; px += 16) {
        ctx.fillRect(px, y - 85, 13, 85);
      }
      ctx.strokeStyle = "#52351E";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x - 70, y - 65);
      ctx.lineTo(x + 70, y - 25);
      ctx.moveTo(x - 70, y - 25);
      ctx.lineTo(x + 70, y - 65);
      ctx.stroke();

      // Floating white speech-bubble badge: "Project available / 11.4% complete"
      const pct = Number(ent.progress || 11.4).toFixed(1);
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#9BA8B0";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x - 68, y - 142, 136, 40, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2C4A5E";
      ctx.font = "bold 11px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Tower Project", x, y - 125);
      ctx.fillStyle = "#5C9E31";
      ctx.fillText(`${pct}% complete`, x, y - 110);
    } else if (ent.type === "ground_bag") {
      // Bright lime-green tied sack on ground (Footage A 24:43)
      ctx.fillStyle = "#63C74D";
      ctx.beginPath();
      ctx.arc(x, y - 14, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4BA336";
      ctx.fillRect(x - 6, y - 31, 12, 6);
    }

    ctx.restore();
  }

  function drawPlacedFurniture(ctx, furn) {
    ctx.save();
    ctx.translate(furn.x, furn.y);
    if (furn.itemId === "orange_chair") {
      ctx.fillStyle = "#E87A35";
      ctx.beginPath();
      ctx.roundRect(-16, -42, 32, 26, 6);
      ctx.fill();
      ctx.strokeStyle = "#7E8A91";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-11, -16);
      ctx.lineTo(-14, 0);
      ctx.moveTo(11, -16);
      ctx.lineTo(14, 0);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#F2C14E";
      ctx.beginPath();
      ctx.arc(0, -20, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCubimal(ctx, cub, timeSec) {
    // Wind-up boxy racing creature (Footage A 23:25 - 23:48)
    ctx.save();
    const hop = Math.abs(Math.sin(timeSec * 18)) * 7;
    ctx.translate(cub.x, cub.y - hop);
    ctx.fillStyle = cub.color || "#F7D44C";
    ctx.beginPath();
    ctx.roundRect(-12, -24, 24, 24, 4);
    ctx.fill();
    ctx.fillStyle = "#1A1A1A";
    ctx.beginPath();
    ctx.arc(cub.dir * 5, -14, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Wind-up key on back
    ctx.strokeStyle = "#CBD4D9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-cub.dir * 15, -12, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawQuoin(ctx, q, timeSec) {
    // Floating spinning circular orb (Rule 22 & Footage B 05:54 - 06:26)
    ctx.save();
    const bob = Math.sin(timeSec * 3.5 + q.x * 0.02) * 6;
    const spinX = Math.max(0.25, Math.abs(Math.cos(timeSec * 2.8 + q.x * 0.01)));
    ctx.translate(q.x, q.y + bob);
    ctx.scale(spinX, 1);

    const colors = {
      img: { ring: "#B47AEA", fill: "#F3E8FF", sym: "iMG" },
      mood: { ring: "#5C9E31", fill: "#E5F7D4", sym: "+M" },
      currants: { ring: "#3B8ED6", fill: "#DCF0FF", sym: "c" },
      energy: { ring: "#F2B738", fill: "#FFF5D6", sym: "En" },
      qurazy: { ring: "#E04592", fill: "#6EEB83", sym: "Q!" },
    };
    const c = colors[q.type] || colors.img;
    const r = q.type === "qurazy" ? 21 : 16;

    ctx.fillStyle = c.fill;
    ctx.strokeStyle = c.ring;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = c.ring;
    ctx.font = "bold 11px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(c.sym, 0, 4);
    ctx.restore();
  }

  function drawParticlesAndFloats(ctx, state) {
    for (const pt of state.particles || []) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const fl of state.floats || []) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, fl.life / fl.maxLife);
      ctx.font = "bold 15px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 3;
      ctx.strokeText(fl.text, fl.x, fl.y);
      ctx.fillStyle = fl.color || "#FFFFFF";
      ctx.fillText(fl.text, fl.x, fl.y);
      ctx.restore();
    }
  }

  function drawHoverTooltip(ctx, hov) {
    // Pale yellow-green pill with dark text and bottom pointer arrow (Footage A 02:01)
    ctx.save();
    const label = hov.label || hov.name || "Interact";
    ctx.font = "bold 12px 'Trebuchet MS', sans-serif";
    const w = ctx.measureText(label).width + 22;
    const h = 24;
    const bx = hov.x - w / 2;
    const by = (hov.topY || hov.y - 90) - 34;

    ctx.fillStyle = "#DCE8B8";
    ctx.strokeStyle = "#8EA858";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, 10);
    ctx.fill();
    ctx.stroke();

    // Pointer arrow
    ctx.beginPath();
    ctx.moveTo(hov.x - 5, by + h);
    ctx.lineTo(hov.x, by + h + 6);
    ctx.lineTo(hov.x + 5, by + h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#233845";
    ctx.textAlign = "center";
    ctx.fillText(label, hov.x, by + 16);
    ctx.restore();
  }

  window.WorldRenderer = {
    drawStreet,
  };
})();
