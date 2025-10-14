const express = require("express");
const cors = require("cors");
const http = require("http");
require("dotenv").config(); // loads proxy/.env if present

const app = express();

// Ports (keep both so the app code using 5051 continues to work)
const PORT_MAIN = parseInt(process.env.PORT, 10) || 8787;
const PORT_ALT  = parseInt(process.env.ALT_PORT, 10) || 5051;

// OpenAI configuration
const OPENAI_BASE = process.env.OPENAI_BASE || "https://api.openai.com/v1";
const OPENAI_KEY  = process.env.OPENAI_API_KEY;

// --- middleware ---
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// request logger
app.use((req, _res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

// --- health ---
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ashwood-proxy",
    ports: [PORT_MAIN, PORT_ALT],
    openaiBase: OPENAI_BASE,
    hasKey: !!OPENAI_KEY,
    ts: new Date().toISOString()
  });
});

// --- helpers ---
async function openaiFetch(path, body) {
  if (!OPENAI_KEY) {
    return {
      ok: false,
      status: 500,
      json: async () => ({ error: "OPENAI_API_KEY is not set on the proxy server" })
    };
  }
  const url = OPENAI_BASE.replace(/\/+$/,"") + path;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + OPENAI_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body || {})
  });
  return res;
}

// --- /api/chat -> OpenAI Chat Completions ---
app.post("/api/chat", async (req, res) => {
  try {
    const model = req.body?.model || "gpt-4o-mini";
    const messages = req.body?.messages || [{ role: "user", content: "Hello from Ashwood proxy!" }];
    const r = await openaiFetch("/chat/completions", { model, messages });
    const data = await r.json();
    res.status(r.ok ? 200 : 502).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// --- /api/image -> OpenAI Image generation ---
app.post("/api/image", async (req, res) => {
  try {
    const prompt = req.body?.prompt || "A friendly raven holding an antique key in front of a spooky mansion";
    const size = req.body?.size || "1024x1024";
    const r = await openaiFetch("/images/generations", { prompt, size });
    const data = await r.json();
    res.status(r.ok ? 200 : 502).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// --- /api/vision -> Chat with an image URL (simple vision example) ---
app.post("/api/vision", async (req, res) => {
  try {
    const model = req.body?.model || "gpt-4o-mini";
    const imageUrl = req.body?.image_url || req.body?.imageUrl || "";
    const prompt = req.body?.prompt || "Describe this image.";
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          imageUrl ? { type: "image_url", image_url: { url: imageUrl } } : { type: "text", text: "(no image_url provided)" }
        ]
      }
    ];
    const r = await openaiFetch("/chat/completions", { model, messages });
    const data = await r.json();
    res.status(r.ok ? 200 : 502).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// --- echo for quick debugging ---
app.post("/echo", (req, res) => {
  res.json({ ok: true, received: req.body || null });
});

// --- CORS preflight for any route ---
app.options("*", cors());

// --- catch-all: never 404 during development ---
app.all("*", (req, res) => {
  res.json({
    ok: true,
    note: "catch-all stub",
    path: req.originalUrl,
    method: req.method,
    body: req.body || null,
    ts: new Date().toISOString()
  });
});

// --- launch on BOTH ports ---
http.createServer(app).listen(PORT_MAIN, () => {
  console.log("Ashwood proxy listening on http://localhost:" + PORT_MAIN);
});
http.createServer(app).listen(PORT_ALT, () => {
  console.log("Ashwood proxy also listening on http://localhost:" + PORT_ALT);
});
