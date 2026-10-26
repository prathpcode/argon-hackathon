// HUD, Verb Popups, Inventory Bar, Chat/Activity Log, and Modals (World Map, Skills, Wardrobe, Quests, Vendor)
(function () {
  const { ITEMS, FURNITURE_CATALOG, SKILLS, GIANTS, QUESTS, BADGES, AVATAR_OPTIONS } = window.GameData;

  function drawItemIcon(canvas, itemId) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 34, 34);
    const it = ITEMS[itemId];
    if (!it) return;
    ctx.save();
    ctx.translate(17, 17);

    if (itemId === "pickaxe") {
      ctx.strokeStyle = "#8d6e63";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, 8);
      ctx.lineTo(7, -7);
      ctx.stroke();
      ctx.strokeStyle = "#546e7a";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(3, -3, 9, -Math.PI * 0.8, -Math.PI * 0.05);
      ctx.stroke();
    } else if (itemId === "watering_can") {
      ctx.fillStyle = "#42a5f5";
      ctx.fillRect(-8, -3, 13, 10);
      ctx.strokeStyle = "#1e88e5";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(5, 1);
      ctx.lineTo(11, -5);
      ctx.stroke();
    } else if (itemId === "shovel") {
      ctx.strokeStyle = "#8d6e63";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-7, -7);
      ctx.lineTo(4, 4);
      ctx.stroke();
      ctx.fillStyle = "#90a4ae";
      ctx.fillRect(1, 1, 8, 8);
    } else if (itemId === "beryl") {
      ctx.fillStyle = "#26c6da";
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(9, -2);
      ctx.lineTo(5, 10);
      ctx.lineTo(-6, 9);
      ctx.lineTo(-9, -3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#a7ffeb";
      ctx.beginPath();
      ctx.arc(-2, -3, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (itemId === "cherry") {
      ctx.strokeStyle = "#5da037";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, 4);
      ctx.lineTo(1, -8);
      ctx.lineTo(6, 4);
      ctx.stroke();
      ctx.fillStyle = "#d9384a";
      ctx.beginPath();
      ctx.arc(-5, 5, 5, 0, Math.PI * 2);
      ctx.arc(5, 5, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (itemId === "pumpkin_ale") {
      ctx.fillStyle = "#ef6c00";
      ctx.fillRect(-7, -6, 14, 15);
      ctx.fillStyle = "#fff8e1";
      ctx.fillRect(-8, -9, 16, 4);
    } else if (itemId === "random_kindness") {
      const cols = ["#ec407a", "#ffca28", "#29b6f6"];
      cols.forEach((c, i) => {
        ctx.strokeStyle = c;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 6, 11 - i * 3, Math.PI, 0);
        ctx.stroke();
      });
    } else if (itemId === "cubimal") {
      ctx.fillStyle = "#ffca28";
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = "#ff7043";
      ctx.fillRect(5, -3, 5, 4);
      ctx.fillStyle = "#1c2833";
      ctx.fillRect(2, -5, 3, 3);
      // Wind-up key on back
      ctx.strokeStyle = "#90a4ae";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-10, -2, 3, 0, Math.PI * 2);
      ctx.stroke();
    } else if (itemId === "butterfly_lotion") {
      // Pink lotion bottle with pump
      ctx.fillStyle = "#f48fb1";
      ctx.fillRect(-6, -4, 12, 14);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-3, -8, 6, 4);
      ctx.fillRect(-1, -11, 6, 3);
    } else if (itemId === "sparkle_powder") {
      // Purple star pouch
      ctx.fillStyle = "#ab47bc";
      ctx.beginPath();
      ctx.arc(0, 3, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff176";
      ctx.beginPath();
      ctx.arc(-2, 2, 2.5, 0, Math.PI * 2);
      ctx.arc(4, -5, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (itemId === "musicblock") {
      // Indigo musicblock cube with speaker & note
      ctx.fillStyle = "#5c6bc0";
      ctx.fillRect(-9, -8, 18, 17);
      ctx.fillStyle = "#c5cae9";
      ctx.beginPath();
      ctx.arc(0, 1, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a237e";
      ctx.beginPath();
      ctx.arc(0, 1, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (itemId === "die12") {
      // Teal d12 pentagon
      ctx.fillStyle = "#26a69a";
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const x = Math.cos(a) * 10;
        const y = Math.sin(a) * 10;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("12", 0, 3);
    } else if (itemId === "shrinking_tonic") {
      // Blue potion flask
      ctx.fillStyle = "#29b6f6";
      ctx.beginPath();
      ctx.arc(0, 4, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-3, -7, 6, 6);
      ctx.fillStyle = "#8d6e63";
      ctx.fillRect(-2.5, -10, 5, 3);
    } else if (itemId === "plank") {
      // Wood plank
      ctx.fillStyle = "#c6945c";
      ctx.strokeStyle = "#8f6232";
      ctx.lineWidth = 1.5;
      ctx.fillRect(-10, -5, 20, 10);
      ctx.strokeRect(-10, -5, 20, 10);
    } else if (itemId === "grain") {
      // Golden grain kernels
      ctx.fillStyle = "#e6c15a";
      ctx.beginPath();
      ctx.ellipse(-4, 2, 4, 6, -0.3, 0, Math.PI * 2);
      ctx.ellipse(4, 0, 4, 6, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (itemId === "bean") {
      // Green bean pod
      ctx.fillStyle = "#7cb342";
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 5, -0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (itemId === "cup_of_water") {
      // Conical paper water cup
      ctx.fillStyle = "#e1f5fe";
      ctx.strokeStyle = "#4fc3f7";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-7, -7);
      ctx.lineTo(7, -7);
      ctx.lineTo(0, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = it.color || "#78909c";
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = it.accent || "#ffffff";
      ctx.beginPath();
      ctx.arc(-3, -3, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function initUI(game) {
    const verbMenu = document.getElementById("verb-popup");
    const modalBackdrop = document.getElementById("modal-backdrop");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body");

    function closeVerbMenu() {
      verbMenu.classList.add("hidden");
      game.activePopup = null;
    }

    function openVerbMenu(screenX, screenY, title, subtitle, verbs, onSelect) {
      window.AudioSys.play("popup");
      game.activePopup = { verbs, onSelect };
      verbMenu.innerHTML = "";
      const h = document.createElement("div");
      h.className = "vp-title";
      h.textContent = title;
      verbMenu.appendChild(h);

      if (subtitle) {
        const sub = document.createElement("div");
        sub.className = "vp-sub";
        sub.textContent = subtitle;
        verbMenu.appendChild(sub);
      }

      const list = document.createElement("div");
      list.className = "vp-list";
      verbs.forEach((v, idx) => {
        const btn = document.createElement("button");
        btn.className = "vp-btn" + (idx === 0 ? " vp-primary" : "");
        let label = v.label;
        if (v.energy && v.energy < 0 && !label.includes("Energy")) {
          label += ` (${v.energy}⚡)`;
        }
        btn.textContent = label;
        btn.onclick = (e) => {
          e.stopPropagation();
          closeVerbMenu();
          onSelect(v);
        };
        list.appendChild(btn);
      });
      verbMenu.appendChild(list);

      verbMenu.classList.remove("hidden");
      const clampX = Math.max(16, Math.min(window.innerWidth - 230, screenX - 75));
      const clampY = Math.max(54, Math.min(window.innerHeight - 190, screenY - 58));
      verbMenu.style.left = `${clampX}px`;
      verbMenu.style.top = `${clampY}px`;
    }

    function closeModal() {
      modalBackdrop.classList.add("hidden");
    }

    function openModal(title, renderFn) {
      window.AudioSys.play("click");
      modalTitle.textContent = title;
      modalBody.innerHTML = "";
      renderFn(modalBody);
      modalBackdrop.classList.remove("hidden");
    }

    document.getElementById("modal-close").onclick = closeModal;
    modalBackdrop.onclick = (e) => {
      if (e.target === modalBackdrop) closeModal();
    };

    // Build 16 Inventory Slots
    const invContainer = document.getElementById("inv-slots");
    const searchInput = document.getElementById("inv-search");

    function renderInventory() {
      const filter = (searchInput.value || "").trim().toLowerCase();
      invContainer.innerHTML = "";

      if (game.furnitureMode) {
        // Show placeable furniture items for Home Street cultivation
        FURNITURE_CATALOG.forEach((f) => {
          const slot = document.createElement("div");
          slot.className = "inv-slot furn-slot";
          slot.title = `${f.name} (${f.cost} currants) — Click to place on street`;
          slot.innerHTML = `<div class="furn-swatch" style="background:${f.color}"></div><span class="inv-count">${f.cost}c</span>`;
          slot.onclick = (e) => {
            e.stopPropagation();
            game.placeFurniture(f);
          };
          invContainer.appendChild(slot);
        });
        return;
      }

      for (let i = 0; i < 16; i++) {
        const entry = game.inventory[i];
        const slot = document.createElement("div");
        slot.className = "inv-slot";
        if (entry && entry.count > 0) {
          const it = ITEMS[entry.id];
          const matches = !filter || (it && it.name.toLowerCase().includes(filter));
          if (!matches) slot.style.opacity = "0.28";
          const c = document.createElement("canvas");
          c.width = 34;
          c.height = 34;
          drawItemIcon(c, entry.id);
          slot.appendChild(c);
          slot.title = it ? `${entry.count} ${it.name}: ${it.desc}` : entry.id;

          const countEl = document.createElement("span");
          countEl.className = "inv-count";
          countEl.textContent = entry.count;
          slot.appendChild(countEl);

          slot.onclick = (e) => {
            e.stopPropagation();
            if (!it) return;
            const rect = slot.getBoundingClientRect();
            openVerbMenu(rect.left + 18, rect.top - 12, it.name, it.desc, it.verbs || [], (v) => {
              game.executeInventoryVerb(i, entry, v);
            });
          };
        }
        invContainer.appendChild(slot);
      }
    }

    searchInput.oninput = renderInventory;

    // World Map Modal (Rule 9, 12 & Footage A 10:28-10:45)
    function openWorldMap() {
      openModal("World Map of Ur — Select a Region or Street to Teleport", (body) => {
        const wrap = document.createElement("div");
        wrap.className = "map-grid";
        const destinations = [
          {
            id: "home_street",
            region: "Ur Home",
            name: "Beau's Home Street",
            color: "#2b7a78",
            desc: "Your customizable Home Street: House of Whimsy, Magic Rock, Butler Roy, Beryl Rock & Tower.",
          },
          {
            id: "chego_chase",
            region: "Andra (Savannah)",
            name: "Chego Chase",
            color: "#9aa46c",
            desc: "Ministry of Departments Pyramid, Shrine to Grendaline, Spice Tree & Butterflies.",
          },
          {
            id: "andra_hall",
            region: "Andra Interior",
            name: "Andra Bureaucratic Hall",
            color: "#b89f5d",
            desc: "Director Wigglesbottom, Magister Piksnikson, Water Cooler & 10-second Waiting Area.",
          },
          {
            id: "bongul_beat",
            region: "Andra (Savannah)",
            name: "Bongul Beat",
            color: "#8d7440",
            desc: "Shrine to Humbaba, Animal Goods Street Spirit Vendor, Chickens, Piggy & Cherry Tree.",
          },
          {
            id: "goli_grabs",
            region: "Kalavana (Caverns)",
            name: "Goli Grabs",
            color: "#5e3c58",
            desc: "Earthy underground caverns, Shrine to Lem, Simmering Cauldron & Kitchen Vendor.",
          },
        ];

        // Visual continent banner (Zhambu / Andra / Kalavana / Ur Home)
        const banner = document.createElement("div");
        banner.className = "map-ocean";
        banner.innerHTML = `<div class="map-ocean-label">Regions of Ur: <strong>Zhambu</strong> • <strong>Andra</strong> • <strong>Kalavana</strong> • <strong>Groddle</strong></div>`;
        body.appendChild(banner);

        destinations.forEach((d) => {
          const card = document.createElement("div");
          card.className = "map-card" + (game.area === d.id ? " map-current" : "");
          card.style.cursor = "pointer";
          card.innerHTML = `
            <div class="map-badge" style="background:${d.color}">${d.region}</div>
            <div class="map-street">${d.name}</div>
            <div class="map-desc">${d.desc}</div>
            <button class="green-pill-btn">${game.area === d.id ? "Currently Here" : "GO • Teleport Here"}</button>
          `;
          const doGo = (e) => {
            e.stopPropagation();
            closeModal();
            if (game.area !== d.id) game.changeStreet(d.id);
          };
          card.onclick = doGo;
          card.querySelector("button").onclick = doGo;
          wrap.appendChild(card);
        });
        body.appendChild(wrap);
      });
    }

    // Skills & Brain Capacity Modal (Rule 27)
    function openSkillsModal() {
      openModal("Skills & Brain Capacity (133-Skill Web)", (body) => {
        const learnedCount = Object.keys(game.learnedSkills).length;
        const capacity = game.brainCapacity || 5;
        const over = Math.max(0, learnedCount - capacity);
        const penaltyPct = over === 0 ? 0 : Math.min(2764, Math.round(Math.pow(over, 2.2) * 45));

        const info = document.createElement("div");
        info.className = "skill-header-box";
        info.innerHTML = `
          <div><strong>Skills Learned:</strong> ${learnedCount} / ${capacity} Brain Capacity</div>
          <div><strong>Training Time Penalty:</strong> <span style="color:${penaltyPct > 0 ? "#c62828" : "#2e7d32"}">+${penaltyPct}%</span> (up to 2764% when over capacity)</div>
        `;
        body.appendChild(info);

        const list = document.createElement("div");
        list.className = "skill-list";
        SKILLS.forEach((sk) => {
          const isLearned = !!game.learnedSkills[sk.id];
          const isTraining = game.trainingSkill && game.trainingSkill.id === sk.id;
          const totalDur = Math.round(sk.duration * (1 + penaltyPct / 100));
          const row = document.createElement("div");
          row.className = "skill-row";
          let actionHtml = "";
          if (isLearned) {
            actionHtml = `<span class="skill-done">✓ Learned</span>`;
          } else if (isTraining) {
            const pct = Math.min(100, Math.round((game.trainingSkill.elapsed / game.trainingSkill.total) * 100));
            actionHtml = `<div class="skill-prog"><div style="width:${pct}%"></div><span>Training ${pct}%</span></div>`;
          } else {
            actionHtml = `<button class="green-pill-btn">Learn (${totalDur}s)</button>`;
          }
          row.innerHTML = `
            <div>
              <span class="skill-cat">${sk.category}</span>
              <strong>${sk.name}</strong>
              <div class="skill-desc">${sk.desc}</div>
            </div>
            <div>${actionHtml}</div>
          `;
          const btn = row.querySelector("button");
          if (btn) {
            btn.onclick = () => {
              game.startSkillTraining(sk, totalDur);
              openSkillsModal();
            };
          }
          list.appendChild(row);
        });
        body.appendChild(list);
      });
    }

    // Wardrobe / Vanity Avatar Customization Modal (Rule 1 & 31)
    function openWardrobeModal() {
      openModal("Wardrobe & Vanity — Customize Your Glitchen", (body) => {
        const look = game.player.look;
        const groups = [
          { key: "hairStyle", label: "Hair Style", opts: AVATAR_OPTIONS.hairStyles, isText: true },
          { key: "hairColor", label: "Hair Color", opts: AVATAR_OPTIONS.hairColors },
          { key: "skinColor", label: "Skin Tone", opts: AVATAR_OPTIONS.skinColors },
          { key: "shirtColor", label: "Shirt Color", opts: AVATAR_OPTIONS.shirtColors },
          { key: "pantsColor", label: "Pants Color", opts: AVATAR_OPTIONS.pantsColors },
          { key: "hat", label: "Hat / Mask", opts: AVATAR_OPTIONS.hats, isText: true },
          { key: "hiSign", label: "Daily 'Hi' Sign", opts: AVATAR_OPTIONS.hiSigns, isText: true },
        ];
        groups.forEach((g) => {
          const row = document.createElement("div");
          row.className = "wardrobe-row";
          const lbl = document.createElement("div");
          lbl.className = "wardrobe-lbl";
          lbl.textContent = g.label;
          row.appendChild(lbl);

          const choices = document.createElement("div");
          choices.className = "wardrobe-choices";
          g.opts.forEach((val) => {
            const b = document.createElement("button");
            const currentVal = g.key === "hiSign" ? game.player.hiSign : look[g.key];
            b.className = "wardrobe-btn" + (currentVal === val ? " active" : "");
            if (g.isText) {
              b.textContent = val;
            } else {
              b.style.background = val;
              b.style.width = "28px";
              b.style.height = "28px";
            }
            b.onclick = () => {
              window.AudioSys.play("click");
              if (g.key === "hiSign") game.player.hiSign = val;
              else look[g.key] = val;
              openWardrobeModal();
            };
            choices.appendChild(b);
          });
          row.appendChild(choices);
          body.appendChild(row);
        });
      });
    }

    // Quests, Giant Favor & Badges Modal (Rule 14, 24, 28)
    function openQuestsModal() {
      openModal("Quests, Giant Favor & Badges", (body) => {
        const h1 = document.createElement("h4");
        h1.textContent = "Active Quests";
        body.appendChild(h1);

        QUESTS.forEach((q) => {
          const prog = game.questProgress[q.id] || 0;
          const done = prog >= q.goal;
          const d = document.createElement("div");
          d.className = "quest-card" + (done ? " quest-done" : "");
          d.innerHTML = `
            <div><strong>${q.title}</strong> <span class="skill-cat">${q.giver}</span></div>
            <div class="skill-desc">${q.desc}</div>
            <div class="quest-reward">Progress: ${Math.min(prog, q.goal)} / ${q.goal} • Reward: +${q.rewardXp} iMG, +${q.rewardCurrants} Currants, +${q.rewardFavor} ${q.rewardGiant} Favor ${done ? "✓ Completed!" : ""}</div>
          `;
          body.appendChild(d);
        });

        const h2 = document.createElement("h4");
        h2.style.marginTop = "12px";
        h2.textContent = "Favor with the 11 Giants of Ur";
        body.appendChild(h2);
        const fWrap = document.createElement("div");
        fWrap.className = "favor-grid";
        Object.keys(GIANTS).forEach((gKey) => {
          const g = GIANTS[gKey];
          const fav = game.giantFavor[gKey] || 0;
          const pill = document.createElement("div");
          pill.className = "favor-pill";
          pill.style.borderLeft = `4px solid ${g.color}`;
          pill.innerHTML = `<strong>${g.name}</strong>: ${fav} Favor`;
          fWrap.appendChild(pill);
        });
        body.appendChild(fWrap);

        const h3 = document.createElement("h4");
        h3.style.marginTop = "12px";
        h3.textContent = "Badges & Achievements";
        body.appendChild(h3);
        const bWrap = document.createElement("div");
        bWrap.className = "favor-grid";
        BADGES.forEach((b) => {
          const earned = !!game.badges[b.id];
          const card = document.createElement("div");
          card.className = "favor-pill";
          card.style.opacity = earned ? "1" : "0.45";
          card.innerHTML = `<span>${b.icon}</span> <strong>${b.name}</strong> — ${b.desc}`;
          bWrap.appendChild(card);
        });
        body.appendChild(bWrap);
      });
    }

    // Street Spirit Vendor Buy/Sell Modal (Rule 16)
    function openVendorModal(vendorName) {
      openModal(`${vendorName} — Buy & Sell with Currants (${game.currants}c)`, (body) => {
        const shopIds = [
          "butterfly_lotion",
          "pumpkin_ale",
          "random_kindness",
          "sparkle_powder",
          "cubimal",
          "musicblock",
          "shrinking_tonic",
          "cherry",
          "grain",
          "bean",
        ];
        const grid = document.createElement("div");
        grid.className = "skill-list";
        shopIds.forEach((id) => {
          const it = ITEMS[id];
          if (!it) return;
          const row = document.createElement("div");
          row.className = "skill-row";
          row.innerHTML = `
            <div>
              <strong>${it.name}</strong> <span class="skill-cat">${it.price} Currants</span>
              <div class="skill-desc">${it.desc}</div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="green-pill-btn buy-btn">Buy (${it.price}c)</button>
              <button class="sell-pill-btn sell-btn">Sell (+${Math.max(2, Math.floor(it.price * 0.6))}c)</button>
            </div>
          `;
          row.querySelector(".buy-btn").onclick = () => {
            if (game.currants < it.price) {
              window.AudioSys.play("error");
              game.addChat("System", "Not enough currants!");
              return;
            }
            game.currants -= it.price;
            game.addItem(id, 1);
            window.AudioSys.play("pickup");
            game.addChat("Vendor", `Purchased 1 ${it.name} for ${it.price} currants.`);
            openVendorModal(vendorName);
            updateHUD();
          };
          row.querySelector(".sell-btn").onclick = () => {
            if (!game.removeItem(id, 1)) {
              window.AudioSys.play("error");
              return;
            }
            const gain = Math.max(2, Math.floor(it.price * 0.6));
            game.currants += gain;
            window.AudioSys.play("orb", "currants");
            game.addChat("Vendor", `Sold 1 ${it.name} for +${gain} currants.`);
            openVendorModal(vendorName);
            updateHUD();
          };
          grid.appendChild(row);
        });
        body.appendChild(grid);
      });
    }

    function updateHUD() {
      // Mood circular badge
      const moodPct = Math.round(game.mood);
      document.getElementById("hud-mood-val").textContent = moodPct;

      // Energy horizontal bar
      const ePct = Math.max(0, Math.min(100, Math.round((game.energy / game.maxEnergy) * 100)));
      document.getElementById("hud-energy-pct").textContent = `${ePct}%`;
      document.getElementById("hud-energy-fill").style.width = `${ePct}%`;
      document.getElementById("hud-energy-val").textContent = `${Math.round(game.energy)} / ${game.maxEnergy}`;

      // XP / iMG horizontal bar & Level
      const xpInLevel = game.xp % 200;
      const xpPct = Math.round((xpInLevel / 200) * 100);
      document.getElementById("hud-xp-pct").textContent = `${xpPct}% (${game.xp} iMG)`;
      document.getElementById("hud-xp-fill").style.width = `${xpPct}%`;
      document.getElementById("hud-level-val").textContent = game.level;

      // Street name & Currants
      const st = game.streets[game.area];
      if (st) {
        document.getElementById("hud-street-name").textContent = `${st.name} in ${st.region}`;
        document.getElementById("canvas-street-sign").textContent = st.name;
      }
      document.getElementById("hud-currants").textContent = game.currants.toLocaleString();
      document.getElementById("hud-player-name").textContent = game.player.name;

      // Left Pop-out drawer stats
      document.getElementById("drawer-level").textContent = game.level;
      document.getElementById("drawer-img").textContent = game.xp.toLocaleString();
      document.getElementById("drawer-currants").textContent = game.currants.toLocaleString();

      renderInventory();
    }

    // Wire Top Bar & Left Drawer buttons
    document.getElementById("btn-world-map").onclick = openWorldMap;
    document.getElementById("btn-skills").onclick = openSkillsModal;
    document.getElementById("btn-wardrobe").onclick = openWardrobeModal;
    document.getElementById("btn-quests").onclick = openQuestsModal;
    document.getElementById("btn-go-home").onclick = () => {
      if (game.area !== "home_street") game.changeStreet("home_street");
    };
    document.getElementById("btn-cultivate").onclick = () => {
      game.furnitureMode = !game.furnitureMode;
      document.getElementById("btn-cultivate").classList.toggle("active-btn", game.furnitureMode);
      renderInventory();
    };
    document.getElementById("btn-furniture-toggle").onclick = () => {
      game.furnitureMode = !game.furnitureMode;
      document.getElementById("btn-cultivate").classList.toggle("active-btn", game.furnitureMode);
      renderInventory();
    };
    document.getElementById("btn-mute").onclick = () => {
      const m = window.AudioSys.toggleMute();
      document.getElementById("btn-mute").textContent = m ? "🔇" : "🔊";
    };
    document.getElementById("btn-left-menu").onclick = () => {
      document.getElementById("left-drawer").classList.toggle("hidden");
    };
    document.getElementById("drawer-skills").onclick = openSkillsModal;
    document.getElementById("drawer-vanity").onclick = openWardrobeModal;
    document.getElementById("drawer-quests").onclick = openQuestsModal;
    document.getElementById("drawer-map").onclick = openWorldMap;

    return {
      updateHUD,
      renderInventory,
      openVerbMenu,
      closeVerbMenu,
      openWorldMap,
      openSkillsModal,
      openWardrobeModal,
      openQuestsModal,
      openVendorModal,
      closeModal,
    };
  }

  window.UISys = { initUI };
})();
