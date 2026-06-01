const http = require("http");
const https = require("https");

const SUPABASE_URL = "https://pgftkscaubdqprdvwvmt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnZnRrc2NhdWJkcXByZHZ3dm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMjcyODAsImV4cCI6MjA5MzkwMzI4MH0.pvUMfEMCxwKjBDc3yJ4pG2wcgdElmcjxWeAzMlMxYzU";

// In-memory scoreboard (no persistence needed)
let scoreState = {
  scoreA: 0, scoreB: 0, setsA: 0, setsB: 0,
  setHistory: [], gameOver: false, winner: null,
};

// In-memory field state (persisted to Supabase)
let fieldState = null;

const LIB_KEYS = ["annahme","grund","annahme_a","annahme_b","grund_a","grund_b"];

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
    req.on("end", () => { try { res(JSON.parse(body)); } catch { rej(new Error("Invalid JSON")); } });
  });
}

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
    };
    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on("error", reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getLib(key) {
  try {
    const result = await supabaseRequest("GET", `/rest/v1/lib?key=eq.${key}&select=data`, undefined);
    if (Array.isArray(result) && result.length > 0) return result[0].data;
    return [];
  } catch (e) { console.error("getLib error:", e); return []; }
}

async function setLib(key, data) {
  try { await supabaseRequest("POST", "/rest/v1/lib", { key, data }); }
  catch (e) { console.error("setLib error:", e); }
}

async function getField() {
  if (fieldState) return fieldState;
  try {
    const result = await supabaseRequest("GET", `/rest/v1/lib?key=eq.__field__&select=data`, undefined);
    if (Array.isArray(result) && result.length > 0) { fieldState = result[0].data; return fieldState; }
    return null;
  } catch (e) { return null; }
}

async function setField(data) {
  fieldState = data;
  try { await supabaseRequest("POST", "/rest/v1/lib", { key: "__field__", data }); }
  catch (e) { console.error("setField error:", e); }
}

const server = http.createServer(async (req, res) => {
  const headers = corsHeaders();
  if (req.method === "OPTIONS") { res.writeHead(204, headers); res.end(); return; }

  // Scoreboard
  if (req.method === "GET" && req.url.startsWith("/state")) {
    res.writeHead(200, headers); res.end(JSON.stringify(scoreState)); return;
  }
  if (req.method === "PUT" && req.url === "/state") {
    try { scoreState = await readBody(req); res.writeHead(200, headers); res.end(JSON.stringify({ ok: true })); }
    catch { res.writeHead(400, headers); res.end(JSON.stringify({ error: "Invalid JSON" })); }
    return;
  }

  // Field sync
  if (req.method === "GET" && req.url.startsWith("/field")) {
    const data = await getField();
    res.writeHead(200, headers); res.end(JSON.stringify(data || {})); return;
  }
  if (req.method === "PUT" && req.url === "/field") {
    try { await setField(await readBody(req)); res.writeHead(200, headers); res.end(JSON.stringify({ ok: true })); }
    catch { res.writeHead(400, headers); res.end(JSON.stringify({ error: "Invalid JSON" })); }
    return;
  }

  // Lib endpoints
  for (const k of LIB_KEYS) {
    if (req.method === "GET" && req.url.startsWith(`/lib/${k}`)) {
      const data = await getLib(k);
      res.writeHead(200, headers); res.end(JSON.stringify(data)); return;
    }
    if (req.method === "PUT" && req.url === `/lib/${k}`) {
      try { await setLib(k, await readBody(req)); res.writeHead(200, headers); res.end(JSON.stringify({ ok: true })); }
      catch { res.writeHead(400, headers); res.end(JSON.stringify({ error: "Invalid JSON" })); }
      return;
    }
  }

  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, headers); res.end(JSON.stringify({ status: "ok" })); return;
  }

  res.writeHead(404, headers); res.end(JSON.stringify({ error: "Not found" }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
