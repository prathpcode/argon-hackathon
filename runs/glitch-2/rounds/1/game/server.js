// Argon game server: zero dependencies (Node 22 built-ins only).
// Serves public/ and relays multiplayer messages over a WebSocket at /ws.
// Rooms come from ?room= (default "main"). The earliest player in a room is its host.
//
// Protocol (JSON text frames), client -> server:
//   {t:"hello", name}            join; server answers {t:"welcome", id, host, players:[{id,name,s}], shared}
//   {t:"state", s}               my latest state (position, anim...); relayed to others as {t:"state", id, s}
//   {t:"msg", ...}               anything else (chat, hit, pickup...); relayed to others as {...msg, from:id}
//   {t:"set", key, value}        shared world state, last write wins; sent to everyone as {t:"set", key, value, from}
// server -> client also: {t:"join", id, name}, {t:"leave", id}, {t:"host", id}
//
// Add authoritative game logic in the marked hooks below if the game needs it.
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 8090;
const PUBLIC = path.join(__dirname, "public");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".woff2": "font/woff2" };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let file = path.normalize(path.join(PUBLIC, decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUBLIC)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end("Not found");
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
});

// ------------------------------------------------------------------ rooms
const rooms = new Map(); // name -> { players: Map<id, player>, shared: {} }
let nextId = 1;

function room(name) {
  if (!rooms.has(name)) rooms.set(name, { players: new Map(), shared: {} });
  return rooms.get(name);
}

function broadcast(r, msg, except) {
  const data = JSON.stringify(msg);
  for (const p of r.players.values()) if (p !== except) p.send(data);
}

function hostOf(r) {
  return r.players.values().next().value?.id ?? null;
}

function onMessage(r, p, msg) {
  if (msg.t === "hello") {
    p.name = String(msg.name || `Player ${p.id}`).slice(0, 24);
    p.send(JSON.stringify({ t: "welcome", id: p.id, host: hostOf(r), shared: r.shared, players: [...r.players.values()].filter((o) => o !== p).map((o) => ({ id: o.id, name: o.name, s: o.s })) }));
    broadcast(r, { t: "join", id: p.id, name: p.name }, p);
  } else if (msg.t === "state") {
    p.s = msg.s;
    broadcast(r, { t: "state", id: p.id, s: msg.s }, p);
  } else if (msg.t === "set" && typeof msg.key === "string") {
    r.shared[msg.key] = msg.value;
    broadcast(r, { t: "set", key: msg.key, value: msg.value, from: p.id });
  } else {
    // GAME HOOK: validate or react to game messages here before relaying.
    broadcast(r, { ...msg, from: p.id }, p);
  }
}

// GAME HOOK: server-side simulation (enemies, timers...) for rooms that need it.
// setInterval(() => { for (const r of rooms.values()) { ... broadcast(r, {...}) } }, 1000 / 20);

// ------------------------------------------------------------------ websocket
server.on("upgrade", (req, socket) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname !== "/ws" || !req.headers["sec-websocket-key"]) return socket.destroy();
  const accept = crypto.createHash("sha1").update(req.headers["sec-websocket-key"] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  socket.setNoDelay(true);

  const r = room((url.searchParams.get("room") || "main").slice(0, 40));
  const p = {
    id: nextId++,
    name: "",
    s: null,
    send(text) {
      if (socket.destroyed) return;
      const body = Buffer.from(text);
      const len = body.length;
      const head = len < 126 ? Buffer.from([0x81, len]) : len < 65536 ? Buffer.from([0x81, 126, len >> 8, len & 255]) : Buffer.concat([Buffer.from([0x81, 127, 0, 0, 0, 0]), Buffer.from([(len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255])]);
      socket.write(Buffer.concat([head, body]));
    },
  };
  r.players.set(p.id, p);

  let buf = Buffer.alloc(0);
  let fragments = [];
  socket.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 2) {
      const fin = buf[0] & 0x80, op = buf[0] & 0x0f, masked = buf[1] & 0x80;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      const total = off + (masked ? 4 : 0) + len;
      if (buf.length < total) return;
      let payload = buf.subarray(off + (masked ? 4 : 0), total);
      if (masked) {
        const mask = buf.subarray(off, off + 4);
        payload = Buffer.from(payload.map((b, i) => b ^ mask[i & 3]));
      }
      buf = buf.subarray(total);
      if (op === 0x8) return socket.end();
      if (op === 0x9) { socket.write(Buffer.concat([Buffer.from([0x8a, payload.length]), payload])); continue; }
      if (op === 0x1 || op === 0x0) {
        fragments.push(payload);
        if (!fin) continue;
        const text = Buffer.concat(fragments).toString();
        fragments = [];
        try { onMessage(r, p, JSON.parse(text)); } catch {}
      }
    }
  });
  const leave = () => {
    const before = hostOf(r);
    if (!r.players.delete(p.id)) return;
    broadcast(r, { t: "leave", id: p.id });
    const host = hostOf(r);
    if (host !== null && host !== before) broadcast(r, { t: "host", id: host });
    if (!r.players.size) rooms.delete([...rooms].find(([, v]) => v === r)?.[0]);
  };
  socket.on("close", leave);
  socket.on("error", leave);
});

server.listen(PORT, () => console.log(`http://localhost:${PORT}`));
