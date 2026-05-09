const http = require("http");

// In-memory state
let state = {
  scoreA: 0, scoreB: 0,
  setsA: 0, setsB: 0,
  setHistory: [],
  gameOver: false, winner: null,
};

let libAnnahme = [];
let libGrund   = [];

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

function readBody(req) {
  return new Promise((res, rej) => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try { res(JSON.parse(body)); } catch { rej(new Error("Invalid JSON")); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const headers = corsHeaders();

  if (req.method === "OPTIONS") {
    res.writeHead(204, headers); res.end(); return;
  }

  // ── Scoreboard ──
  if (req.method === "GET" && req.url.startsWith("/state")) {
    res.writeHead(200, headers); res.end(JSON.stringify(state)); return;
  }
  if (req.method === "PUT" && req.url === "/state") {
    try {
      state = await readBody(req);
      res.writeHead(200, headers); res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, headers); res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
    return;
  }

  // ── Aufstellungs-Bibliothek: Annahme ──
  if (req.method === "GET" && req.url.startsWith("/lib/annahme")) {
    res.writeHead(200, headers); res.end(JSON.stringify(libAnnahme)); return;
  }
  if (req.method === "PUT" && req.url === "/lib/annahme") {
    try {
      libAnnahme = await readBody(req);
      res.writeHead(200, headers); res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, headers); res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
    return;
  }

  // ── Aufstellungs-Bibliothek: Grundaufstellung ──
  if (req.method === "GET" && req.url.startsWith("/lib/grund")) {
    res.writeHead(200, headers); res.end(JSON.stringify(libGrund)); return;
  }
  if (req.method === "PUT" && req.url === "/lib/grund") {
    try {
      libGrund = await readBody(req);
      res.writeHead(200, headers); res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, headers); res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
    return;
  }

  // ── Health check ──
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, headers); res.end(JSON.stringify({ status: "ok" })); return;
  }

  res.writeHead(404, headers); res.end(JSON.stringify({ error: "Not found" }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
