// Revive multiplayer client. Load with <script src="net.js"></script>, then:
//   const net = Net.connect({ name, onJoin, onLeave, onState, onMsg, onSet, onHost, onWelcome });
//   net.state({x, y, anim})   // call every frame; sent at most 15 times a second
//   net.send("chat", {text})  // others receive {t:"chat", text, from}
//   net.set("door1", true)    // shared world state for everyone in the room
//   net.players  Map<id, {id, name, s}> of the OTHER players     net.me  my id     net.isHost
//   net.shared   shared world state     net.online  false while solo / disconnected
// The game must stay fully playable solo: when the server is unreachable, nothing here throws.
(function () {
  function connect(opts) {
    const params = new URLSearchParams(location.search);
    const net = { players: new Map(), shared: {}, me: null, host: null, online: false, get isHost() { return !this.online || this.host === this.me; } };
    let ws = null, lastState = 0, pending = null, retry = 500;
    const call = (fn, ...a) => { try { opts[fn] && opts[fn](...a); } catch (e) { console.error(e); } };

    function open() {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      try { ws = new WebSocket(`${proto}://${location.host}/ws?room=${encodeURIComponent(params.get("room") || opts.room || "main")}`); } catch { return; }
      ws.onopen = () => { retry = 500; ws.send(JSON.stringify({ t: "hello", name: opts.name || params.get("name") || "Player" })); };
      ws.onmessage = (e) => {
        let m; try { m = JSON.parse(e.data); } catch { return; }
        if (m.t === "welcome") {
          net.me = m.id; net.host = m.host ?? m.id; net.online = true; net.shared = m.shared || {};
          net.players.clear();
          for (const p of m.players) net.players.set(p.id, p);
          call("onWelcome", net);
          for (const p of m.players) call("onJoin", p);
        } else if (m.t === "join") { const p = { id: m.id, name: m.name, s: null }; net.players.set(m.id, p); call("onJoin", p); }
        else if (m.t === "leave") { const p = net.players.get(m.id); net.players.delete(m.id); call("onLeave", p || { id: m.id }); }
        else if (m.t === "state") { const p = net.players.get(m.id); if (p) { p.s = m.s; call("onState", p, m.s); } }
        else if (m.t === "set") { net.shared[m.key] = m.value; call("onSet", m.key, m.value, m.from); }
        else if (m.t === "host") { net.host = m.id; call("onHost", m.id === net.me); }
        else call("onMsg", m);
      };
      ws.onclose = () => {
        const was = net.online; net.online = false;
        for (const p of net.players.values()) call("onLeave", p);
        net.players.clear();
        if (was || retry < 8000) setTimeout(open, (retry = Math.min(retry * 2, 8000)));
      };
      ws.onerror = () => {};
    }

    const raw = (m) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
    net.state = (s) => {
      pending = s;
      const now = performance.now();
      if (now - lastState > 66) { lastState = now; raw({ t: "state", s: pending }); }
    };
    net.send = (type, data) => raw({ ...(data || {}), t: type });
    net.set = (key, value) => { net.shared[key] = value; raw({ t: "set", key, value }); };
    open();
    return net;
  }
  window.Net = { connect };
})();
