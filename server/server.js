import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin";

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in server/.env");
  process.exit(1);
}

// Security hardening
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS: allow native (null) + dev ports
const whitelist = new Set([
  "http://localhost:8081",
  "http://localhost:8082",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8082"
]);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || whitelist.has(origin)) return cb(null, true);
    return cb(new Error("CORS: origin not allowed"));
  },
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "256kb" }));

const limiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Model allowlist
const MODEL_ALLOWLIST = new Set(["gpt-4.1-mini", "gpt-4.1", "o4-mini", "o4-mini-high"]);

// Health
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ashwood-proxy", port: PORT });
});

// --- OpenAI Responses passthrough ---
async function callOpenAI(body) {
  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await upstream.text();
  return { status: upstream.status, type: upstream.headers.get("content-type") || "application/json", text };
}

app.post("/api/openai/responses", async (req, res) => {
  try {
    const { model, input, ...rest } = req.body || {};
    if (!model || (!input && !rest.messages && !rest.input)) {
      return res.status(400).json({ error: "Missing 'model' and 'input' (or messages/input) in body." });
    }
    if (!MODEL_ALLOWLIST.has(model)) {
      return res.status(400).json({ error: `Model '${model}' not allowed.` });
    }
    const { status, type, text } = await callOpenAI({ model, input, ...rest });
    res.status(status).type(type).send(text);
  } catch (err) {
    console.error("Proxy /responses error:", err);
    res.status(500).json({ error: "Proxy failed", detail: String(err) });
  }
});

app.post("/api/openai/chat", async (req, res) => {
  try {
    const { model, messages, ...rest } = req.body || {};
    if (!model || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Body must include model and non-empty messages array." });
    }
    if (!MODEL_ALLOWLIST.has(model)) {
      return res.status(400).json({ error: `Model '${model}' not allowed.` });
    }
    const { status, type, text } = await callOpenAI({ model, input: messages, ...rest });
    res.status(status).type(type).send(text);
  } catch (err) {
    console.error("Proxy /chat error:", err);
    res.status(500).json({ error: "Proxy failed", detail: String(err) });
  }
});

// --------------------------
// Sessions + Directives (in-memory)
// --------------------------
/** Session structure:
 * id, code, createdAt, updatedAt, players[], state{ sceneId, flags, score }, directives[]
 * Each directive: { id, type: "scene"|"narration"|"sfx", payload, ts }
 */
const SESSIONS = new Map();

function makeId(n=8){ return Math.random().toString(36).slice(2, 2+n); }
function now(){ return Date.now(); }

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token && token === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: "Unauthorized (missing/invalid admin token)" });
}

app.post("/api/sessions", (req, res) => {
  const id = makeId(8);
  const code = makeId(6).toUpperCase();
  const t = now();
  const session = {
    id, code, createdAt: t, updatedAt: t,
    players: [],
    state: { sceneId: "foyer", flags: {}, score: 0 },
    directives: []
  };
  SESSIONS.set(id, session);
  res.json({ id, code });
});

app.get("/api/sessions/:id", (req, res) => {
  const s = SESSIONS.get(req.params.id);
  if (!s) return res.status(404).json({ error: "not found" });
  res.json({ id: s.id, code: s.code, state: s.state, updatedAt: s.updatedAt, players: s.players });
});

app.post("/api/sessions/:id/state", (req, res) => {
  const s = SESSIONS.get(req.params.id);
  if (!s) return res.status(404).json({ error: "not found" });
  const { state } = req.body || {};
  if (!state || typeof state !== "object") return res.status(400).json({ error: "missing state" });
  s.state = { ...s.state, ...state };
  s.updatedAt = now();
  res.json({ ok: true, updatedAt: s.updatedAt });
});

app.post("/api/sessions/:code/join", (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const session = Array.from(SESSIONS.values()).find(s => s.code === code);
  if (!session) return res.status(404).json({ error: "code not found" });
  const { playerName } = req.body || {};
  if (playerName) session.players.push({ id: makeId(6), name: playerName });
  res.json({ id: session.id, code: session.code, players: session.players });
});

// Directives long-poll/poll (client/player)
app.get("/api/directives/:id", (req, res) => {
  const s = SESSIONS.get(req.params.id);
  if (!s) return res.status(404).json({ error: "not found" });
  const since = Number(req.query.since || 0);
  const out = s.directives.filter(d => d.ts > since);
  res.json({ directives: out, now: now() });
});

// GM endpoints (admin)
function pushDirective(s, type, payload) {
  const d = { id: makeId(8), type, payload, ts: now() };
  s.directives.push(d);
  s.updatedAt = d.ts;
  return d;
}

app.post("/api/gm/:id/scene", requireAdmin, (req, res) => {
  const s = SESSIONS.get(req.params.id);
  if (!s) return res.status(404).json({ error: "not found" });
  const { sceneId } = req.body || {};
  if (!sceneId) return res.status(400).json({ error: "missing sceneId" });
  const d = pushDirective(s, "scene", { sceneId });
  res.json({ ok: true, directive: d });
});

app.post("/api/gm/:id/narration", requireAdmin, (req, res) => {
  const s = SESSIONS.get(req.params.id);
  if (!s) return res.status(404).json({ error: "not found" });
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: "missing text" });
  const d = pushDirective(s, "narration", { text });
  res.json({ ok: true, directive: d });
});

app.post("/api/gm/:id/sfx", requireAdmin, (req, res) => {
  const s = SESSIONS.get(req.params.id);
  if (!s) return res.status(404).json({ error: "not found" });
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "missing id" });
  const d = pushDirective(s, "sfx", { id });
  res.json({ ok: true, directive: d });
});

// --- Simple GM web page (/gm) ---
const GM_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Ashwood GM</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
 body{font-family: system-ui, Arial; margin:16px; max-width:560px}
 input,button{font-size:16px; padding:8px; margin:4px 0}
 fieldset{margin:16px 0}
 .row{display:flex; gap:8px}
 .ok{color:#155724; background:#d4edda; padding:8px; border-radius:8px}
 .err{color:#721c24; background:#f8d7da; padding:8px; border-radius:8px}
</style>
</head>
<body>
<h2>🕯️ Ashwood GM Panel</h2>
<p>Enter <b>Session ID</b> and your <b>Admin Token</b> (from server/.env). Use actions below to control the session.</p>
<div id="msg"></div>
<fieldset>
 <legend>Connection</legend>
 <label>Session ID <input id="sid" placeholder="e.g., 8-char id"/></label><br/>
 <label>Admin Token <input id="tok" placeholder="ADMIN_TOKEN"/></label><br/>
 <div class="row">
   <button id="btnScene">Set Scene</button>
   <input id="sceneId" placeholder="scene id e.g., hall"/>
 </div>
 <div class="row">
   <button id="btnNarr">Send Narration</button>
   <input id="narrText" placeholder="narration text"/>
 </div>
 <div class="row">
   <button id="btnSfx">Trigger SFX</button>
   <input id="sfxId" placeholder="sfx id e.g., thunder"/>
 </div>
</fieldset>
<script>
function show(id, text, cls){ const el=document.getElementById(id); el.className=cls||""; el.textContent=text; }
async function post(path, body){
  const sid = document.getElementById('sid').value.trim();
  const tok = document.getElementById('tok').value.trim();
  try{
    const r = await fetch(path.replace(":id", sid), {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization": "Bearer " + tok },
      body: JSON.stringify(body)
    });
    const t = await r.text();
    if(!r.ok){ show("msg", "Error "+r.status+": "+t, "err"); }
    else { show("msg", "OK: "+t, "ok"); }
  }catch(e){ show("msg", "ERR: "+e, "err"); }
}
document.getElementById('btnScene').onclick = ()=> post('/api/gm/:id/scene', { sceneId: document.getElementById('sceneId').value.trim() });
document.getElementById('btnNarr').onclick = ()=> post('/api/gm/:id/narration', { text: document.getElementById('narrText').value.trim() });
document.getElementById('btnSfx').onclick = ()=> post('/api/gm/:id/sfx', { id: document.getElementById('sfxId').value.trim() });
</script>
</body>
</html>`;
app.get("/gm", (_req, res) => res.type("html").send(GM_HTML));

app.listen(PORT, () => {
  console.log(`Ashwood proxy listening on http://localhost:${PORT}`);
});
/** Debug: list sessions (id, code, updatedAt) */
app.get("/api/debug/sessions", (_req, res) => {
  try {
    const list = Array.from(SESSIONS.values()).map(s => ({
      id: s.id, code: s.code, updatedAt: s.updatedAt, players: (s.players||[]).length
    }));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: "debug list failed", detail: String(e) });
  }
});

/** --- Added: alias routes so the app can call either "/responses" or "/v1/responses",
    and either "/chat" or "/v1/chat/completions" --- */

app.post(["/responses", "/v1/responses"], async (req, res) => {
  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });
    res.status(r.status);
    for (const [k, v] of r.headers) res.setHeader(k, v);
    res.send(await r.text());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: { message: String(e) } });
  }
});

app.post(["/chat", "/v1/chat/completions"], async (req, res) => {
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });
    res.status(r.status);
    for (const [k, v] of r.headers) res.setHeader(k, v);
    res.send(await r.text());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: { message: String(e) } });
  }
});

