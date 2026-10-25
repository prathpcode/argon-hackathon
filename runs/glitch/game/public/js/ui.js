// Complete UI Manager: HUD, 16-Slot Inventory + Sub-slots, Chat/Activity, Modals & Popups
(function () {
  const UI = {
    activeChannel: "local", // local | global | party
    inventoryMode: "inventory", // inventory | furniture
    searchFilter: "",
    bagExpanded: false,
    lastMiniMapTime: 0,
    _hudCache: {},
    _els: null,

    _getEls() {
      if (this._els) return this._els;
      this._els = {
        moodEl: document.getElementById("hud-mood-val"),
        moodBadge: document.getElementById("hud-mood-badge"),
        enFill: document.getElementById("hud-energy-fill"),
        enText: document.getElementById("hud-energy-val"),
        xpFill: document.getElementById("hud-xp-fill"),
        xpText: document.getElementById("hud-xp-val"),
        lvlEl: document.getElementById("hud-level-val"),
        curEl: document.getElementById("hud-currants-val"),
        nameEl: document.getElementById("hud-player-name"),
        streetLabel: document.getElementById("minimap-street-name"),
        skillBadge: document.getElementById("hud-skill-active"),
        waitBox: document.getElementById("waiting-timer-box"),
        waitFill: document.getElementById("waiting-timer-fill"),
        waitLabel: document.getElementById("waiting-timer-label"),
        qurazyBanner: document.getElementById("qurazy-banner"),
      };
      return this._els;
    },

    _setText(el, key, val) {
      if (!el) return;
      const str = String(val);
      if (this._hudCache[key] !== str) {
        this._hudCache[key] = str;
        el.textContent = str;
      }
    },

    _setWidth(el, key, pct) {
      if (!el) return;
      const str = `${Math.round(pct * 10) / 10}%`;
      if (this._hudCache[key] !== str) {
        this._hudCache[key] = str;
        el.style.width = str;
      }
    },

    _setHidden(el, key, isHidden) {
      if (!el) return;
      const flag = Boolean(isHidden);
      if (this._hudCache[key] !== flag) {
        this._hudCache[key] = flag;
        el.classList.toggle("hidden", flag);
      }
    },

    init() {
      // Top Header Buttons
      document.getElementById("btn-magic-rock")?.addEventListener("click", () => {
        window.AudioEngine.playClick();
        this.openModal("quests");
      });
      document.getElementById("btn-skills-top")?.addEventListener("click", () => {
        window.AudioEngine.playClick();
        this.openModal("skills");
      });
      document.getElementById("btn-world-map")?.addEventListener("click", () => {
        window.AudioEngine.playClick();
        this.openModal("map");
      });
      document.getElementById("minimap-box")?.addEventListener("click", () => {
        window.AudioEngine.playClick();
        this.openModal("map");
      });
      document.getElementById("btn-go-home")?.addEventListener("click", () => {
        window.AudioEngine.playClick();
        window.Game.transitionToStreet("beaus_home", 980);
      });
      document.getElementById("btn-wardrobe-top")?.addEventListener("click", () => {
        window.AudioEngine.playClick();
        this.openModal("wardrobe");
      });

      // Avatar Portrait Menu Toggle (Rule 40)
      const portraitBtn = document.getElementById("avatar-menu-btn");
      const navMenu = document.getElementById("avatar-dropdown-menu");
      portraitBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        window.AudioEngine.playClick();
        navMenu.classList.toggle("hidden");
      });

      document.addEventListener("click", () => {
        navMenu?.classList.add("hidden");
      });

      // Audio toggles (Rule 41)
      document.getElementById("btn-sfx-toggle")?.addEventListener("click", (e) => {
        window.AudioEngine.muted = !window.AudioEngine.muted;
        e.currentTarget.classList.toggle("muted", window.AudioEngine.muted);
      });
      document.getElementById("btn-music-toggle")?.addEventListener("click", (e) => {
        window.AudioEngine.musicMuted = !window.AudioEngine.musicMuted;
        e.currentTarget.classList.toggle("muted", window.AudioEngine.musicMuted);
      });

      // Inventory Mode Tabs & Search Filter (Rule 23)
      document.getElementById("tab-inv-mode")?.addEventListener("click", () => {
        this.inventoryMode = "inventory";
        document.getElementById("tab-inv-mode").classList.add("active");
        document.getElementById("tab-furn-mode").classList.remove("active");
        this.renderInventory();
      });
      document.getElementById("tab-furn-mode")?.addEventListener("click", () => {
        this.inventoryMode = "furniture";
        document.getElementById("tab-furn-mode").classList.add("active");
        document.getElementById("tab-inv-mode").classList.remove("active");
        this.renderInventory();
      });
      const searchEl = document.getElementById("inv-search");
      searchEl?.addEventListener("input", () => {
        this.searchFilter = searchEl.value.trim().toLowerCase();
        this.renderInventory();
      });

      // Chat Channel Bookmark Tabs (Rule 35)
      document.querySelectorAll(".chat-tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          window.AudioEngine.playClick();
          const ch = btn.dataset.channel;
          this.setChatChannel(ch);
        });
      });

      // Chat Form Submit & Tab Cycling (Rule 35 & 36)
      const chatInput = document.getElementById("chat-input");
      const chatForm = document.getElementById("chat-form");
      chatForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        const txt = chatInput.value.trim();
        if (!txt) return;
        chatInput.value = "";
        window.Game.sendChatMessage(txt, this.activeChannel);
        chatInput.blur();
      });

      chatInput?.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Tab") {
          e.preventDefault();
          const order = ["local", "global", "party"];
          const next = order[(order.indexOf(this.activeChannel) + 1) % order.length];
          this.setChatChannel(next);
        } else if (e.key === "Escape") {
          chatInput.blur();
        }
      });

      // Close modal button
      document.getElementById("modal-close-btn")?.addEventListener("click", () => {
        window.AudioEngine.playClick();
        this.closeModal();
      });
      document.getElementById("modal-backdrop")?.addEventListener("click", (e) => {
        if (e.target.id === "modal-backdrop") this.closeModal();
      });
    },

    setChatChannel(ch) {
      this.activeChannel = ch;
      document.querySelectorAll(".chat-tab-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.channel === ch);
      });
      const titles = {
        local: "Local Chat / Activity",
        global: "Global & Help Channel",
        party: "Party & Neighbor IM",
      };
      const header = document.getElementById("chat-panel-title");
      if (header) header.textContent = titles[ch] || "Local Chat / Activity";
      this.renderChatLog();
    },

    updateHUD() {
      const S = window.State;
      if (!S || !S.player) return;
      const els = this._getEls();

      // Mood Circle Badge
      const moodVal = Math.round(S.player.mood);
      this._setText(els.moodEl, "moodVal", moodVal);
      const moodTitle = `${moodVal} of ${S.player.maxMood} Mood (${moodVal >= 80 ? "1.5x iMG Bonus" : "Normal iMG"})`;
      if (els.moodBadge && this._hudCache.moodTitle !== moodTitle) {
        this._hudCache.moodTitle = moodTitle;
        els.moodBadge.title = moodTitle;
      }

      // Energy Pill Bar
      const enVal = Math.round(S.player.energy);
      const enPct = Math.max(0, Math.min(100, (enVal / S.player.maxEnergy) * 100));
      this._setWidth(els.enFill, "enFill", enPct);
      this._setText(els.enText, "enText", `${enVal}/${S.player.maxEnergy}`);

      // XP / iMG Progress & Level
      const imgVal = Math.round(S.player.img);
      const lvl = S.player.level || 1;
      const imgPct = Math.max(6, Math.min(100, ((imgVal % 150) / 150) * 100));
      this._setWidth(els.xpFill, "xpFill", imgPct);
      this._setText(els.xpText, "xpText", `${imgVal} iMG`);
      this._setText(els.lvlEl, "lvlEl", lvl);

      // Currants Counter (Bottom-Left)
      this._setText(els.curEl, "curEl", Number(S.player.currants || 0).toLocaleString());

      // Player Name & Street Name
      this._setText(els.nameEl, "nameEl", S.player.name);
      const curStreet = window.GameData.STREETS[S.area];
      if (curStreet) this._setText(els.streetLabel, "streetLabel", curStreet.name);

      // Active Skill Header Indicator
      if (els.skillBadge) {
        if (S.activeSkill) {
          const sk = window.GameData.SKILLS.find((s) => s.id === S.activeSkill.id);
          const rem = Math.max(0, Math.ceil((S.activeSkill.finishAt - Date.now()) / 1000));
          this._setText(els.skillBadge, "skillText", `Learning: ${sk ? sk.name : S.activeSkill.id} (${rem}s)`);
          this._setHidden(els.skillBadge, "skillHidden", false);
        } else {
          this._setText(els.skillBadge, "skillText", "Skills (Idle)");
        }
      }

      // 15-Second Bureaucratic Waiting Timer (Rule 17 & Footage B 04:45)
      if (els.waitBox) {
        const showWait = S.area === "bureaucratic_hall" && S.waitingTimer > 0 && !S.waitingQualified;
        this._setHidden(els.waitBox, "waitHidden", !showWait);
        if (showWait) {
          const pct = Math.min(100, (S.waitingTimer / 15) * 100);
          this._setWidth(els.waitFill, "waitFill", pct);
          const rem = Math.max(0, Math.ceil(15 - S.waitingTimer));
          this._setText(els.waitLabel, "waitLabel", `Please Wait (${rem}s)`);
        }
      }

      // Qurazy Quoin Top Banner on Goli Grabs (Footage A 24:39)
      if (els.qurazyBanner && curStreet) {
        const hasActiveQurazy = curStreet.quoins.some(
          (q) => q.type === "qurazy" && (!q.collectedUntil || q.collectedUntil < performance.now())
        );
        this._setHidden(els.qurazyBanner, "qurazyHidden", !hasActiveQurazy);
      }

      // Update Mini-Map Canvas at ~4fps
      const now = performance.now();
      if (now - this.lastMiniMapTime > 250) {
        this.lastMiniMapTime = now;
        this.drawMiniMap();
      }
    },

    drawMiniMap() {
      const c = document.getElementById("minimap-canvas");
      if (!c) return;
      const ctx = c.getContext("2d");
      const S = window.State;
      const street = window.GameData.STREETS[S.area];
      if (!street) return;

      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = street.skyBottom || "#E6DEC8";
      ctx.fillRect(0, 0, c.width, c.height);

      const sx = c.width / street.width;
      const sy = c.height / street.height;

      // Ground strip
      ctx.fillStyle = street.groundTopColor || "#8C8245";
      ctx.fillRect(0, street.groundY * sy, c.width, c.height);

      // Platforms
      ctx.fillStyle = "#6E523B";
      for (const p of street.platforms) {
        ctx.fillRect(p.x * sx, p.y * sy, Math.max(4, p.w * sx), 3);
      }

      // Other players (cyan/blue dots)
      if (window.net && window.net.players) {
        ctx.fillStyle = "#2E86DE";
        for (const [, rp] of window.net.players) {
          if (rp.s && rp.s.area === street.id) {
            ctx.beginPath();
            ctx.arc(rp.s.x * sx, rp.s.y * sy - 3, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Local player dot (bright green with white ring)
      ctx.fillStyle = "#5C9E31";
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(S.player.x * sx, S.player.y * sy - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    },

    renderInventory() {
      const S = window.State;
      const bar = document.getElementById("inventory-slots");
      const subBar = document.getElementById("bag-subslots");
      if (!bar || !S) return;

      // Check if player owns Generic Green Bag to show expandable sub-slots (Rule 23)
      const hasBag = S.inventory.some((slot) => slot && slot.id === "green_bag");
      if (subBar) {
        subBar.classList.toggle("hidden", !hasBag || !this.bagExpanded);
        if (hasBag && this.bagExpanded) {
          subBar.innerHTML = "";
          for (let i = 0; i < 6; i++) {
            const subItem = S.bagSlots[i] || null;
            subBar.appendChild(this.createSlotElement(subItem, i, true));
          }
        }
      }

      bar.innerHTML = "";
      for (let i = 0; i < 16; i++) {
        const slot = S.inventory[i] || null;
        bar.appendChild(this.createSlotElement(slot, i, false));
      }
    },

    createSlotElement(slot, idx, isBagSlot) {
      const div = document.createElement("div");
      div.className = "inv-slot";
      if (!slot) return div;

      const item = window.GameData.ITEMS[slot.id];
      if (!item) return div;

      const isFurn = item.category === "furniture";
      if (this.inventoryMode === "furniture" && !isFurn) {
        div.classList.add("dimmed");
      }
      if (this.searchFilter && !item.name.toLowerCase().includes(this.searchFilter)) {
        div.classList.add("dimmed");
      }

      div.title = `${slot.count} ${slot.count > 1 ? item.plural : item.name} — ${item.desc}`;

      const icon = document.createElement("div");
      icon.className = "inv-icon";
      icon.innerHTML = this.getItemSvg(slot.id, item.color);
      div.appendChild(icon);

      const qty = document.createElement("span");
      qty.className = "inv-qty";
      qty.textContent = slot.count;
      div.appendChild(qty);

      div.addEventListener("click", (e) => {
        e.stopPropagation();
        window.AudioEngine.playClick();
        if (slot.id === "green_bag") {
          this.bagExpanded = !this.bagExpanded;
          this.renderInventory();
          return;
        }
        this.openItemContextMenu(slot, idx, isBagSlot, div);
      });

      return div;
    },

    // Procedural vector SVG icons for all inventory items (zero emoji dependency)
    getItemSvg(id, color = "#8EB8C9") {
      const svgs = {
        grain: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#F5E6B8"/><path d="M9 22 C11 15, 15 10, 19 6" stroke="#C89628" stroke-width="2.5" fill="none"/><ellipse cx="12" cy="15" rx="3" ry="1.8" transform="rotate(-30 12 15)" fill="#E5B53A"/><ellipse cx="15" cy="11" rx="3" ry="1.8" transform="rotate(-30 15 11)" fill="#E5B53A"/><ellipse cx="17" cy="16" rx="3" ry="1.8" transform="rotate(20 17 16)" fill="#D9A326"/></svg>`,
        watering_can: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#D9EDF7"/><rect x="8" y="11" width="11" height="10" rx="2" fill="#5294BD"/><path d="M19 14 L25 9 L26 11 L19 17 Z" fill="#5294BD"/><path d="M8 13 C4 13, 4 19, 8 19" stroke="#3B7599" stroke-width="2" fill="none"/></svg>`,
        red_apple: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#FCE4DF"/><circle cx="14" cy="16" r="7.5" fill="#D93B30"/><path d="M14 8 Q16 5 19 7" stroke="#5C9E31" stroke-width="2.2" fill="none"/><circle cx="11.5" cy="13.5" r="1.8" fill="#FF9E96"/></svg>`,
        cherry: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#FCE4EC"/><path d="M10 18 Q13 9 16 7 Q16 13 18 18" stroke="#5C9E31" stroke-width="2" fill="none"/><circle cx="10" cy="19" r="4.5" fill="#D9234B"/><circle cx="18" cy="19" r="4.5" fill="#D9234B"/></svg>`,
        blender: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#E3EFF5"/><rect x="9" y="19" width="10" height="5" rx="2" fill="#4A6070"/><path d="M8 7 L20 7 L18 19 L10 19 Z" fill="#9ED6F0" stroke="#5B8FA8" stroke-width="1.5"/><rect x="7" y="5" width="14" height="2.5" rx="1" fill="#4A6070"/></svg>`,
        shovel: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#EFE6D8"/><line x1="8" y1="8" x2="18" y2="18" stroke="#8C5A2B" stroke-width="3" stroke-linecap="round"/><path d="M16 16 L22 18 L20 23 L15 21 Z" fill="#768692"/></svg>`,
        pickaxe: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#E4ECEF"/><line x1="8" y1="20" x2="19" y2="9" stroke="#8C5A2B" stroke-width="3" stroke-linecap="round"/><path d="M13 6 Q20 7 22 15" stroke="#6E828F" stroke-width="3.2" fill="none" stroke-linecap="round"/></svg>`,
        butterfly_lotion: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#FCE8F2"/><rect x="9" y="10" width="10" height="13" rx="3" fill="#E882B2"/><rect x="12" y="6" width="4" height="4" fill="#FFFFFF"/><circle cx="14" cy="16.5" r="2.8" fill="#FFFFFF"/></svg>`,
        butterfly_milker: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#FAF2D4"/><circle cx="11" cy="17" r="5" fill="#E0B646"/><path d="M14 14 L21 8 L23 11 L16 17 Z" fill="#8CD1E6"/></svg>`,
        pumpkin_ale: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#FCE9D4"/><rect x="8" y="9" width="11" height="14" rx="2" fill="#E0721E"/><path d="M8 9 Q13.5 5 19 9" fill="#FFFFFF"/><path d="M19 12 C23 12, 23 19, 19 19" stroke="#B85612" stroke-width="2.2" fill="none"/></svg>`,
        chick_cubimal: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#FFF7D6"/><rect x="7" y="8" width="14" height="14" rx="3" fill="#F5C836"/><circle cx="16" cy="13" r="1.6" fill="#1E242B"/><polygon points="21,14 25,15.5 21,17" fill="#E87A24"/></svg>`,
        shrinking_potion: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#E2F9E6"/><polygon points="12,7 16,7 19,21 9,21" fill="#47C960"/><rect x="11" y="5" width="6" height="3" rx="1" fill="#8C6239"/></svg>`,
        embiggening_tonic: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#F1E4FC"/><circle cx="14" cy="16" r="6.5" fill="#9B5DE5"/><rect x="11.5" y="6" width="5" height="4" rx="1" fill="#8C6239"/></svg>`,
        musicblock_gng: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#DCF5EC"/><rect x="6" y="6" width="16" height="16" rx="3" fill="#46B58E"/><path d="M11 18 L11 10 L18 9 L18 16" stroke="#FFFFFF" stroke-width="2" fill="none"/><circle cx="10" cy="18" r="2" fill="#FFFFFF"/><circle cx="17" cy="16" r="2" fill="#FFFFFF"/></svg>`,
        emblem_of_friendly: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#FFF6D6"/><circle cx="14" cy="14" r="8" fill="#F5B82E" stroke="#FFE680" stroke-width="2"/><path d="M10 15 Q14 19 18 15" stroke="#5E3A00" stroke-width="2" fill="none"/></svg>`,
        beryl_chunk: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#DCF7F9"/><polygon points="14,5 22,12 19,22 9,22 6,12" fill="#32B5BD"/></svg>`,
        lump_of_earth: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#EFE5DC"/><ellipse cx="14" cy="16" rx="8" ry="6" fill="#7A5436"/></svg>`,
        wood_plank: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#F5E9DC"/><rect x="6" y="10" width="16" height="8" rx="2" fill="#B8804A"/></svg>`,
        cup_of_water: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#E3F5FC"/><polygon points="9,8 19,8 17,22 11,22" fill="#7AD0F5"/></svg>`,
        green_bag: `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#E4F7DF"/><circle cx="14" cy="16" r="7.5" fill="#5BBF45"/><rect x="11" y="6" width="6" height="4" rx="1" fill="#3E8E2C"/></svg>`,
      };
      if (svgs[id]) return svgs[id];
      return `<svg viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="${color}"/><circle cx="14" cy="14" r="6" fill="rgba(255,255,255,0.65)"/></svg>`;
    },

    openItemContextMenu(slot, idx, isBagSlot, anchorEl) {
      const item = window.GameData.ITEMS[slot.id];
      if (!item) return;

      const menu = document.getElementById("item-context-menu");
      if (!menu) return;

      const rect = anchorEl.getBoundingClientRect();
      menu.style.left = `${Math.max(12, Math.min(window.innerWidth - 180, rect.left - 30))}px`;
      menu.style.bottom = `${window.innerHeight - rect.top + 8}px`;

      menu.innerHTML = `
        <div class="ctx-header">${item.name} (${slot.count})</div>
        <div class="ctx-desc">${item.desc}</div>
        <div class="ctx-actions"></div>
      `;
      const actContainer = menu.querySelector(".ctx-actions");
      for (const act of item.actions || ["Use", "Inspect", "Drop"]) {
        const btn = document.createElement("button");
        btn.className = "ctx-btn";
        btn.textContent = act;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          menu.classList.add("hidden");
          window.Game.performItemAction(slot, idx, isBagSlot, act);
        });
        actContainer.appendChild(btn);
      }

      menu.classList.remove("hidden");
      const closeOnce = () => {
        menu.classList.add("hidden");
        document.removeEventListener("click", closeOnce);
      };
      setTimeout(() => document.addEventListener("click", closeOnce), 10);
    },

    openWorldActionMenu(obj, screenX, screenY) {
      const menu = document.getElementById("world-action-menu");
      if (!menu) return;

      menu.style.left = `${Math.max(16, Math.min(window.innerWidth - 360, screenX - 95))}px`;
      menu.style.top = `${Math.max(55, Math.min(window.innerHeight - 240, screenY - 130))}px`;

      menu.innerHTML = `
        <div class="wa-title">${obj.title || obj.name}</div>
        <div class="wa-sub">${obj.subtitle || ""}</div>
        ${obj.lore ? `<div class="wa-lore">"${obj.lore}"</div>` : ""}
        <div class="wa-buttons"></div>
      `;
      const btnWrap = menu.querySelector(".wa-buttons");
      for (const action of obj.actions || []) {
        const b = document.createElement("button");
        b.className = "wa-btn" + (action.disabled ? " disabled" : "");
        b.innerHTML = `${action.cost ? `<span class="wa-cost">-${action.cost} En</span>` : ""}${action.label}`;
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          menu.classList.add("hidden");
          window.State.actionMenu = null;
          if (!action.disabled && action.fn) action.fn();
        });
        btnWrap.appendChild(b);
      }

      menu.classList.remove("hidden");
      const closeHandler = () => {
        menu.classList.add("hidden");
        window.State.actionMenu = null;
        document.removeEventListener("click", closeHandler);
      };
      setTimeout(() => document.addEventListener("click", closeHandler), 10);
    },

    logActivity(htmlText, channel = "local") {
      const S = window.State;
      if (!S) return;
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      S.chatLogs.push({ channel, html: htmlText, time: timeStr });
      if (S.chatLogs.length > 80) S.chatLogs.shift();
      this.renderChatLog();
    },

    renderChatLog() {
      const S = window.State;
      const container = document.getElementById("chat-messages");
      if (!container || !S) return;
      const logs = S.chatLogs.filter(
        (m) => m.channel === this.activeChannel || (this.activeChannel === "local" && m.channel === "system")
      );
      container.innerHTML = logs
        .map(
          (m) => `
          <div class="chat-entry ${m.channel}">
            <span class="chat-time">${m.time}</span>
            <div class="chat-body">${m.html}</div>
          </div>
        `
        )
        .join("");
      container.scrollTop = container.scrollHeight;
    },

    showBanner(text, duration = 3500) {
      const b = document.getElementById("bottom-toast-banner");
      if (!b) return;
      b.textContent = text;
      b.classList.remove("hidden");
      clearTimeout(this._bannerTimeout);
      this._bannerTimeout = setTimeout(() => b.classList.add("hidden"), duration);
    },

    showGiantVisage(giantKey, customText) {
      const g = window.GameData.GIANTS[giantKey] || window.GameData.GIANTS.Grendaline;
      const overlay = document.getElementById("giant-visage-overlay");
      if (!overlay) return;
      window.AudioEngine.playGiantFanfare();
      document.getElementById("giant-visage-name").textContent = `${g.name} — ${g.title}`;
      document.getElementById("giant-visage-text").textContent = customText || g.blessing;
      document.getElementById("giant-visage-orb").style.background = g.color;
      overlay.classList.remove("hidden");
      setTimeout(() => overlay.classList.add("hidden"), 4200);
    },

    openModal(kind, payload = null) {
      const backdrop = document.getElementById("modal-backdrop");
      const titleEl = document.getElementById("modal-title");
      const bodyEl = document.getElementById("modal-body");
      if (!backdrop || !titleEl || !bodyEl) return;

      backdrop.classList.remove("hidden");
      bodyEl.innerHTML = "";

      if (kind === "map") {
        titleEl.textContent = "World & Region Map of Ur";
        this.renderWorldMapModal(bodyEl);
      } else if (kind === "skills") {
        titleEl.textContent = "Skills & Brain Capacity";
        this.renderSkillsModal(bodyEl);
      } else if (kind === "quests") {
        titleEl.textContent = "Active Quests & Giant Favor";
        this.renderQuestsModal(bodyEl);
      } else if (kind === "vendor") {
        titleEl.textContent = payload ? payload.name : "Street Spirit Vendor";
        this.renderVendorModal(bodyEl, payload);
      } else if (kind === "wardrobe") {
        titleEl.textContent = "Vanity & Avatar Wardrobe";
        this.renderWardrobeModal(bodyEl);
      } else if (kind === "magic_rock") {
        titleEl.textContent = "Home Street Magic Rock Management";
        this.renderMagicRockModal(bodyEl);
      } else if (kind === "butler") {
        titleEl.textContent = "Butler Roy (Beau) — Home Street Concierge";
        this.renderButlerModal(bodyEl);
      }
    },

    closeModal() {
      document.getElementById("modal-backdrop")?.classList.add("hidden");
    },

    renderWorldMapModal(container) {
      const S = window.State;
      const streets = Object.values(window.GameData.STREETS);
      let html = `
        <div class="map-canvas-wrap">
          <svg viewBox="0 0 680 320" class="world-map-svg">
            <rect width="680" height="320" fill="#2A4B5E" rx="10"/>
            <text x="24" y="298" fill="#B8D4E3" font-style="italic" font-size="13">The Sea of Predictability</text>
            <!-- Region Landmasses -->
            <ellipse cx="185" cy="130" rx="95" ry="60" fill="#5D9E6E" opacity="0.88"/>
            <text x="185" y="88" fill="#FFFFFF" font-weight="bold" font-size="14" text-anchor="middle">Zhambu (Homes)</text>

            <ellipse cx="290" cy="225" rx="135" ry="65" fill="#D9B86C" opacity="0.92"/>
            <text x="290" y="178" fill="#3B2C1A" font-weight="bold" font-size="15" text-anchor="middle">Andra</text>

            <ellipse cx="505" cy="165" rx="110" ry="65" fill="#B57C52" opacity="0.92"/>
            <text x="505" y="118" fill="#FFFFFF" font-weight="bold" font-size="15" text-anchor="middle">Kalavana</text>

            <!-- Dashed Interconnected Street Lines (Rule 7) -->
            <line x1="215" y1="215" x2="340" y2="200" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="6,5"/>
            <line x1="340" y1="200" x2="375" y2="235" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="6,5"/>
            <line x1="340" y1="200" x2="470" y2="170" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="6,5"/>
            <line x1="340" y1="200" x2="175" y2="135" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="6,5"/>
            <line x1="175" y1="135" x2="155" y2="115" stroke="#FFFFFF" stroke-width="2.5" stroke-dasharray="4,4"/>

            <!-- Street Nodes -->
            <circle cx="215" cy="215" r="7" fill="#5C9E31" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="340" cy="200" r="7" fill="#5C9E31" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="375" cy="235" r="6" fill="#3B7EA1" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="470" cy="170" r="7" fill="#E89C31" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="175" cy="135" r="7" fill="#9B5DE5" stroke="#FFFFFF" stroke-width="2"/>
          </svg>
        </div>
        <div class="map-street-cards"></div>
      `;
      container.innerHTML = html;

      const list = container.querySelector(".map-street-cards");
      streets.forEach((st) => {
        const isCurrent = S.area === st.id;
        const visited = S.visitedStreets.includes(st.id);
        const card = document.createElement("div");
        card.className = "map-street-card" + (isCurrent ? " current" : "");
        card.innerHTML = `
          <div>
            <div class="msc-title">${st.name} <span class="msc-region">(${st.region})</span></div>
            <div class="msc-meta">${visited ? "Visited" : "Unvisited (+2 iMG First Visit Bonus)"}</div>
          </div>
          <button class="btn-green" ${isCurrent ? "disabled" : ""}>
            ${isCurrent ? "Current Street" : "Teleport Here (-10 En)"}
          </button>
        `;
        card.querySelector("button")?.addEventListener("click", () => {
          this.closeModal();
          window.Game.transitionToStreet(st.id, st.spawnX, true);
        });
        list.appendChild(card);
      });
    },

    renderSkillsModal(container) {
      const S = window.State;
      const learnedCount = S.learnedSkills.length;
      const brainCap = 10;
      const hasEmblem = S.inventory.some((i) => i && i.id === "emblem_of_friendly");

      let html = `
        <div class="skills-header-bar">
          <div><strong>Brain Capacity:</strong> ${learnedCount} / ${brainCap} skills learned (0% time penalty)</div>
          ${
            S.activeSkill && hasEmblem
              ? `<button id="btn-use-emblem" class="btn-gold">Use Emblem of Friendly (-60s)</button>`
              : ""
          }
        </div>
        <div class="skills-grid"></div>
      `;
      container.innerHTML = html;

      container.querySelector("#btn-use-emblem")?.addEventListener("click", () => {
        window.Game.useEmblemOfFriendly();
        this.renderSkillsModal(container);
      });

      const grid = container.querySelector(".skills-grid");
      window.GameData.SKILLS.forEach((sk) => {
        const isLearned = S.learnedSkills.includes(sk.id);
        const isLearning = S.activeSkill && S.activeSkill.id === sk.id;
        const prereqMet = !sk.prereq || S.learnedSkills.includes(sk.prereq);
        const rem = isLearning ? Math.max(0, Math.ceil((S.activeSkill.finishAt - Date.now()) / 1000)) : sk.durationSec;

        const card = document.createElement("div");
        card.className = `skill-card ${isLearned ? "learned" : isLearning ? "learning" : ""}`;
        card.innerHTML = `
          <div class="sk-cat">${sk.category}</div>
          <div class="sk-name">${sk.name}</div>
          <div class="sk-desc">${sk.desc}</div>
          <div class="sk-footer">
            <span>Reward: +${sk.rewardImg} iMG</span>
            <button class="btn-green" ${isLearned || isLearning || !prereqMet ? "disabled" : ""}>
              ${
                isLearned
                  ? "Learned"
                  : isLearning
                  ? `Learning (${rem}s)...`
                  : !prereqMet
                  ? `Requires ${sk.prereq}`
                  : `Learn (${sk.durationSec}s)`
              }
            </button>
          </div>
        `;
        card.querySelector("button")?.addEventListener("click", () => {
          window.Game.startLearningSkill(sk.id);
          this.renderSkillsModal(container);
        });
        grid.appendChild(card);
      });
    },

    renderQuestsModal(container) {
      const S = window.State;
      let html = `<div class="quests-list"></div>`;
      container.innerHTML = html;
      const list = container.querySelector(".quests-list");

      window.GameData.QUESTS.forEach((q) => {
        const prog = S.questProgress[q.id] || { completed: false, steps: {} };
        const stepsHtml = q.steps
          .map((st) => {
            const cur = Math.min(st.target, prog.steps[st.key] || 0);
            const done = cur >= st.target;
            return `<div class="q-step ${done ? "done" : ""}">${done ? "[Done]" : "[ ]"} ${st.label}: <strong>${cur}/${st.target}</strong></div>`;
          })
          .join("");

        const card = document.createElement("div");
        card.className = `quest-card ${prog.completed ? "completed" : ""}`;
        card.innerHTML = `
          <div class="q-header">
            <span class="q-title">${q.title}</span>
            <span class="q-badge">${prog.completed ? "Completed" : `Patron: ${q.giver}`}</span>
          </div>
          <div class="q-desc">${q.desc}</div>
          <div class="q-steps">${stepsHtml}</div>
          <div class="q-rewards">
            Rewards: <strong>+${q.rewards.img} iMG</strong>, <strong>+${q.rewards.currants}c</strong>, +${q.rewards.favor} ${q.rewards.giant} Favor
            <button class="btn-link q-hint-btn">Tell me more</button>
          </div>
        `;
        card.querySelector(".q-hint-btn")?.addEventListener("click", () => {
          this.showBanner(`Hint: ${q.hint}`, 4500);
        });
        list.appendChild(card);
      });
    },

    renderVendorModal(container, vendor) {
      const S = window.State;
      const items = (vendor?.inventory || [
        "watering_can",
        "shovel",
        "pickaxe",
        "butterfly_lotion",
        "red_apple",
        "pumpkin_ale",
        "green_bag",
      ]).map((id) => window.GameData.ITEMS[id]).filter(Boolean);

      container.innerHTML = `
        <div class="vendor-balance">Your Balance: <strong>${S.player.currants} currants</strong></div>
        <div class="vendor-tabs">
          <div class="vendor-section-title">Buy from ${vendor ? vendor.name : "Vendor"}</div>
          <div class="vendor-grid" id="vendor-buy-grid"></div>
          <div class="vendor-section-title" style="margin-top:14px;">Sell Your Harvested Goods</div>
          <div class="vendor-grid" id="vendor-sell-grid"></div>
        </div>
      `;

      const buyGrid = container.querySelector("#vendor-buy-grid");
      items.forEach((it) => {
        const row = document.createElement("div");
        row.className = "vendor-item-row";
        row.innerHTML = `
          <div class="vi-icon">${this.getItemSvg(it.id, it.color)}</div>
          <div class="vi-info">
            <div class="vi-name">${it.name}</div>
            <div class="vi-desc">${it.desc}</div>
          </div>
          <button class="btn-green" ${S.player.currants < it.price ? "disabled" : ""}>Buy (${it.price}c)</button>
        `;
        row.querySelector("button")?.addEventListener("click", () => {
          window.Game.buyItem(it.id, it.price);
          this.renderVendorModal(container, vendor);
        });
        buyGrid.appendChild(row);
      });

      const sellGrid = container.querySelector("#vendor-sell-grid");
      S.inventory.forEach((slot, idx) => {
        if (!slot) return;
        const it = window.GameData.ITEMS[slot.id];
        if (!it) return;
        const sellPrice = Math.max(1, Math.floor(it.price * 0.6));
        const row = document.createElement("div");
        row.className = "vendor-item-row";
        row.innerHTML = `
          <div class="vi-icon">${this.getItemSvg(it.id, it.color)}</div>
          <div class="vi-info">
            <div class="vi-name">${it.name} (x${slot.count})</div>
          </div>
          <button class="btn-gold">Sell 1 (+${sellPrice}c)</button>
        `;
        row.querySelector("button")?.addEventListener("click", () => {
          window.Game.sellItem(idx, sellPrice);
          this.renderVendorModal(container, vendor);
        });
        sellGrid.appendChild(row);
      });
    },

    renderWardrobeModal(container) {
      const S = window.State;
      const W = window.GameData.WARDROBE_OPTIONS;
      const look = S.player.look;

      const makeRow = (label, key, options, isColor = false) => {
        const div = document.createElement("div");
        div.className = "wardrobe-row";
        div.innerHTML = `<div class="wr-label">${label}</div><div class="wr-opts"></div>`;
        const optsWrap = div.querySelector(".wr-opts");
        options.forEach((val) => {
          const b = document.createElement("button");
          b.className = "wr-btn" + (look[key] === val ? " active" : "");
          if (isColor) {
            b.style.background = val;
            b.textContent = " ";
          } else {
            b.textContent = val.replace("_", " ");
          }
          b.addEventListener("click", () => {
            window.AudioEngine.playClick();
            look[key] = val;
            this.renderWardrobeModal(container);
          });
          optsWrap.appendChild(b);
        });
        return div;
      };

      container.appendChild(makeRow("Skin Tone", "skinColor", W.skinColors, true));
      container.appendChild(makeRow("Hair Color", "hairColor", W.hairColors, true));
      container.appendChild(makeRow("Hair Style", "hairStyle", W.hairStyles, false));
      container.appendChild(makeRow("Hat / Mask", "hat", W.hats, false));
      container.appendChild(makeRow("Shirt Color", "shirtColor", W.shirtColors, true));
      container.appendChild(makeRow("Coat / Cape", "coatStyle", W.coatStyles, false));
      container.appendChild(makeRow("Bottom Style", "bottomStyle", W.bottomStyles, false));
      container.appendChild(makeRow("Pants/Skirt Color", "pantsColor", W.pantsColors, true));
    },

    renderMagicRockModal(container) {
      const S = window.State;
      container.innerHTML = `
        <p style="margin-bottom:12px;">The ancient Magic Rock hums with imagination. Customize <strong>Beau's Home Street</strong> theme or cultivate new resources:</p>
        <div class="magic-rock-options">
          <div class="mr-card">
            <div>
              <strong>Lost Woods Style (Spooky Forest)</strong>
              <div class="vi-desc">Dark teal fog, silhouettes of crooked trees, and eerie chimes.</div>
            </div>
            <button class="btn-green" data-style="spooky">${S.homeStyle === "spooky" ? "Active" : "Apply (190 iMG)"}</button>
          </div>
          <div class="mr-card">
            <div>
              <strong>Vorn Road Style (Snowy Pine)</strong>
              <div class="vi-desc">Crisp winter snowdrifts, evergreen pines, and crystalline bells.</div>
            </div>
            <button class="btn-green" data-style="snowy">${S.homeStyle === "snowy" ? "Active" : "Apply (190 iMG)"}</button>
          </div>
          <div class="mr-card">
            <div>
              <strong>Groddle Meadow Style (Sunny Green)</strong>
              <div class="vi-desc">Lush green grass and warm afternoon breeze.</div>
            </div>
            <button class="btn-green" data-style="meadow">${S.homeStyle === "meadow" ? "Active" : "Apply (190 iMG)"}</button>
          </div>
          <div class="mr-card">
            <div>
              <strong>Cultivate Land &amp; Replenish Street</strong>
              <div class="vi-desc">Restores all Beryl Rocks, Fruit Trees, Wood Trees, and Gas Plants on the street.</div>
            </div>
            <button id="btn-cultivate-land" class="btn-gold">Cultivate (50 iMG)</button>
          </div>
        </div>
      `;

      container.querySelectorAll("[data-style]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const st = btn.dataset.style;
          window.Game.changeHomeStyle(st);
          this.renderMagicRockModal(container);
        });
      });
      container.querySelector("#btn-cultivate-land")?.addEventListener("click", () => {
        window.Game.cultivateHomeLand();
        this.closeModal();
      });
    },

    renderButlerModal(container) {
      const S = window.State;
      const visitors = S.visitorsLog.length ? S.visitorsLog.join(", ") : "CreepyBaldishG, stormoffara, Artichoke";
      container.innerHTML = `
        <div class="butler-box">
          <p><strong>Roy (Beau)</strong> bows politely: <em>"Welcome to the Home Street! Yesterday's visitor traffic earned +25 iMG."</em></p>
          <p style="margin-top:8px;"><strong>Recent Visitors:</strong> ${visitors}</p>
          <div class="butler-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;">
            <button class="btn-green" data-act="visited">Who visited? (+10 iMG Traffic Bonus)</button>
            <button class="btn-green" data-act="yahoo">Yahoo! (+8 Mood)</button>
            <button class="btn-green" data-act="gipe">Gipe!</button>
            <button class="btn-green" data-act="muffle">Muffle butterfly wisdom</button>
            <button class="btn-green" data-act="ziplip">Zip lip</button>
            <button class="btn-gold" data-act="mailbox">Check Mailbox</button>
          </div>
        </div>
      `;
      container.querySelectorAll("[data-act]").forEach((b) => {
        b.addEventListener("click", () => {
          window.Game.butlerAction(b.dataset.act);
          this.closeModal();
        });
      });
    },
  };

  window.UI = UI;
})();
