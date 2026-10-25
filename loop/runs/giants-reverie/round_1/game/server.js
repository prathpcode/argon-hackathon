/**
 * Giants' Reverie — Zero-Dependency Node 22 Server (HTTP + RFC 6455 WebSocket)
 * Uses only built-in Node modules: http, crypto, fs, path.
 */
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT || "8090", 10);
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

// --- Shared Multiplayer State ---
const clients = new Map(); // socket -> player state
const recentMines = new Map(); // `${street}:${rockId}` -> { playerId, time }
let towerProgress = 11.4;
const streetStyles = {
  beau_home: "lost_woods"
};

// --- HTTP Static File Server ---
const server = http.createServer((req, res) => {
  const safeUrl = (req.url || "/").split("?")[0];
  const relPath = safeUrl === "/" ? "/index.html" : safeUrl;
  const filePath = path.normalize(path.join(PUBLIC_DIR, relPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
});

// --- Raw RFC 6455 WebSocket Implementation ---
const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function encodeWsFrame(str) {
  const payload = Buffer.from(str, "utf8");
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text frame
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function decodeWsFrames(buffer) {
  const messages = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const byte0 = buffer[offset];
    const byte1 = buffer[offset + 1];
    const opcode = byte0 & 0x0f;
    const isMasked = (byte1 & 0x80) !== 0;
    let payloadLen = byte1 & 0x7f;
    let headerLen = 2;

    if (opcode === 0x08) {
      return { messages, rest: Buffer.alloc(0), closed: true };
    }

    if (payloadLen === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLen = buffer.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buffer.length) break;
      payloadLen = Number(buffer.readBigUInt64BE(offset + 2));
      headerLen = 10;
    }

    const maskLen = isMasked ? 4 : 0;
    const totalFrameLen = headerLen + maskLen + payloadLen;
    if (offset + totalFrameLen > buffer.length) break;

    const payload = Buffer.alloc(payloadLen);
    if (isMasked) {
      const maskOffset = offset + headerLen;
      const dataOffset = maskOffset + 4;
      for (let i = 0; i < payloadLen; i++) {
        payload[i] = buffer[dataOffset + i] ^ buffer[maskOffset + (i & 3)];
      }
    } else {
      buffer.copy(payload, 0, offset + headerLen, offset + headerLen + payloadLen);
    }

    if (opcode === 0x01) {
      messages.push(payload.toString("utf8"));
    }
    offset += totalFrameLen;
  }

  return { messages, rest: buffer.subarray(offset), closed: false };
}

function sendJson(socket, obj) {
  if (socket.destroyed || !socket.writable) return;
  try {
    socket.write(encodeWsFrame(JSON.stringify(obj)));
  } catch (e) {}
}

function broadcastAll(obj, excludeSocket = null) {
  const frame = encodeWsFrame(JSON.stringify(obj));
  for (const [sock] of clients.entries()) {
    if (sock !== excludeSocket && !sock.destroyed && sock.writable) {
      try { sock.write(frame); } catch (e) {}
    }
  }
}

function broadcastStreet(streetId, obj, excludeSocket = null) {
  const frame = encodeWsFrame(JSON.stringify(obj));
  for (const [sock, p] of clients.entries()) {
    if (sock !== excludeSocket && p.street === streetId && !sock.destroyed && sock.writable) {
      try { sock.write(frame); } catch (e) {}
    }
  }
}

function getPlayersOnStreet(streetId) {
  const arr = [];
  for (const p of clients.values()) {
    if (p.street === streetId) arr.push(p);
  }
  return arr;
}

server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }
  const accept = crypto.createHash("sha1").update(key + WS_GUID).digest("base64");
  const headers = [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "\r\n"
  ];
  socket.write(headers.join("\r\n"));

  let rxBuffer = Buffer.alloc(0);
  clients.set(socket, {
    id: "anon_" + Math.random().toString(36).slice(2, 8),
    name: "Glitchen",
    street: "beau_home",
    x: 620,
    y: 460,
    dir: 1,
    scale: 1.0,
    appearance: {}
  });

  socket.on("data", (chunk) => {
    rxBuffer = Buffer.concat([rxBuffer, chunk]);
    const decoded = decodeWsFrames(rxBuffer);
    rxBuffer = decoded.rest;

    for (const raw of decoded.messages) {
      try {
        const msg = JSON.parse(raw);
        handleClientMessage(socket, msg);
      } catch (e) {}
    }

    if (decoded.closed) {
      cleanupSocket(socket);
      socket.end();
    }
  });

  socket.on("close", () => cleanupSocket(socket));
  socket.on("error", () => cleanupSocket(socket));
});

function handleClientMessage(socket, msg) {
  const p = clients.get(socket);
  if (!p) return;

  if (msg.type === "join") {
    p.id = msg.id || p.id;
    p.name = msg.name || p.name;
    p.street = msg.street || "beau_home";
    p.x = msg.x || 620;
    p.y = msg.y || 460;
    p.dir = msg.dir || 1;
    p.scale = msg.scale || 1.0;
    p.appearance = msg.appearance || {};

    sendJson(socket, { type: "street_players", players: getPlayersOnStreet(p.street) });
    sendJson(socket, { type: "tower_progress", progress: towerProgress });
    if (streetStyles[p.street]) {
      sendJson(socket, { type: "street_style", street: p.street, style: streetStyles[p.street] });
    }
    broadcastStreet(p.street, { type: "street_players", players: getPlayersOnStreet(p.street) }, socket);
    broadcastStreet(p.street, { type: "chat", sender: null, text: `${p.name} is here!`, kind: "sys" }, socket);
  } else if (msg.type === "move") {
    p.x = msg.x;
    p.y = msg.y;
    p.dir = msg.dir;
    p.scale = msg.scale || 1.0;
    if (msg.appearance) p.appearance = msg.appearance;
    broadcastStreet(p.street, {
      type: "player_moved",
      id: p.id,
      name: p.name,
      street: p.street,
      x: p.x,
      y: p.y,
      dir: p.dir,
      scale: p.scale,
      appearance: p.appearance
    }, socket);
  } else if (msg.type === "change_street") {
    const oldStreet = p.street;
    p.street = msg.street;
    p.x = msg.x || 300;
    p.y = msg.y || 460;
    broadcastStreet(oldStreet, { type: "player_left", id: p.id }, socket);
    sendJson(socket, { type: "street_players", players: getPlayersOnStreet(p.street) });
    broadcastStreet(p.street, { type: "street_players", players: getPlayersOnStreet(p.street) }, socket);
  } else if (msg.type === "chat") {
    broadcastStreet(p.street, {
      type: "chat",
      sender: p.name,
      senderId: p.id,
      text: String(msg.text || "").slice(0, 140),
      kind: "normal"
    }, socket);
  } else if (msg.type === "emote") {
    broadcastStreet(p.street, {
      type: "emote",
      kind: msg.kind,
      sender: p.name,
      x: p.x,
      y: p.y
    }, socket);
  } else if (msg.type === "mine") {
    const key = `${p.street}:${msg.rockId}`;
    const prev = recentMines.get(key);
    const now = Date.now();
    if (prev && prev.playerId !== p.id && now - prev.time < 6000) {
      sendJson(socket, { type: "co_mine_bonus" });
    }
    recentMines.set(key, { playerId: p.id, time: now });
  } else if (msg.type === "tower_progress") {
    towerProgress = Math.min(100, Number(msg.progress) || towerProgress);
    broadcastAll({ type: "tower_progress", progress: towerProgress });
  } else if (msg.type === "street_style") {
    streetStyles[msg.street] = msg.style;
    broadcastAll({ type: "street_style", street: msg.street, style: msg.style }, socket);
  } else if (msg.type === "giant_visage") {
    broadcastAll({ type: "giant_visage", giant: msg.giant }, socket);
  }
}

function cleanupSocket(socket) {
  const p = clients.get(socket);
  if (p) {
    clients.delete(socket);
    broadcastStreet(p.street, { type: "player_left", id: p.id });
  }
}

server.listen(PORT, () => {
  console.log(`Giants' Reverie server listening on http://localhost:${PORT}`);
});
