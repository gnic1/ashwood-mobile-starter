import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const PORT = Number(process.env.PORT || 5051);
const MODEL_DEFAULT = process.env.MODEL || "gpt-4o-mini";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const SHARED_SECRET = process.env.SHARED_SECRET || "";
const MOCK_MODE = process.env.MOCK_MODE === "1";
const MAX_OUTPUT_TOKENS = Math.max(16, Number(process.env.MAX_OUTPUT_TOKENS || 256));
const MODEL_ALLOW = new Set(["gpt-4o-mini","gpt-4o","o4-mini"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Data folders
const DATA_DIR   = path.join(__dirname, "data");
const IMAGES_DIR = path.join(__dirname, "images");
const DB_EVENTS  = path.join(DATA_DIR, "events.json");
const DB_IMAGES  = path.join(DATA_DIR, "images.json");
for (const p of [DATA_DIR, IMAGES_DIR]) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
for (const f of [DB_EVENTS, DB_IMAGES]) { if (!fs.existsSync(f)) fs.writeFileSync(f, JSON.stringify([]), "utf8"); }

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "6mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, max: 40, standardHeaders: true, legacyHeaders: false }));
app.use((req, res, next) => { req.setTimeout(90_000); res.setTimeout(90_000); next(); });

// Serve saved images
app.use("/images", express.static(IMAGES_DIR));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---- helpers ----
const requireSecret = (req, res, next) => {
  if (!SHARED_SECRET) return next();
  const key = req.header("x-ashwood-key");
  if (key && key === SHARED_SECRET) return next();
  return res.status(401).json({ error: "Unauthorized" });
};
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const sanitizeTemp = (t) => Number.isFinite(t) ? clamp(t, 0, 2) : undefined;
const sanitizeTopP = (p) => Number.isFinite(p) ? clamp(p, 0, 1) : undefined;
const resolveModel = (m) => (m && MODEL_ALLOW.has(m)) ? m : MODEL_DEFAULT;
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, "utf8") || "[]"); } catch { return []; } };
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
const appendJson = (file, row) => { const arr = readJson(file); arr.push(row); writeJson(file, arr); };

// ---- Health ----
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ashwood-openai-proxy", model_default: MODEL_DEFAULT, auth: !!SHARED_SECRET, port: PORT, mock: MOCK_MODE, max_output_tokens: MAX_OUTPUT_TOKENS });
});
app.get("/health/openai", async (_req, res) => {
  if (MOCK_MODE) return res.json({ ok: true, model: "mock" });
  try {
    const response = await client.responses.create({ model: MODEL_DEFAULT, input: "ping", max_output_tokens: 16 });
    res.json({ ok: !!response?.id, model: MODEL_DEFAULT });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ---- Routes (static list; robust across Express versions) ----
app.get("/routes", requireSecret, (_req, res) => {
  const routes = [
    { methods: "GET",  path: "/health" },
    { methods: "GET",  path: "/health/openai" },
    { methods: "GET",  path: "/routes" },
    { methods: "POST", path: "/api/event" },
    { methods: "GET",  path: "/api/events" },
    { methods: "POST", path: "/api/chat" },
    { methods: "POST", path: "/api/chat/stream" },
    { methods: "POST", path: "/api/vision" },
    { methods: "POST", path: "/api/image" },
    { methods: "GET",  path: "/api/images" },
    { methods: "POST", path: "/api/tag-image" },
    { methods: "GET",  path: "/images/:file" }
  ];
  res.json({ port: PORT, mock: MOCK_MODE, routes });
});

// ---- Event log ----
app.post("/api/event", requireSecret, (req, res) => {
  const type = String(req.body?.type || "").trim();
  const payload = req.body?.payload ?? {};
  if (!type) return res.status(400).json({ error: "Missing 'type'" });
  const row = { id: `evt_${Date.now()}`, type, payload, at: new Date().toISOString() };
  appendJson(DB_EVENTS, row);
  res.json({ ok: true, event: row });
});
app.get("/api/events", requireSecret, (req, res) => {
  const all = readJson(DB_EVENTS);
  const t = (req.query?.type || "").toString();
  const out = t ? all.filter(e => e.type === t) : all;
  res.json({ ok: true, count: out.length, events: out.slice(-200) });
});

// ---- Chat (non-streaming) ----
app.post("/api/chat", requireSecret, async (req, res) => {
  try {
    const prompt = (req.body?.prompt || "").toString().trim();
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });
    const system = (req.body?.system || "").toString().trim();
    const temperature = sanitizeTemp(Number(req.body?.temperature));
    const top_p = sanitizeTopP(Number(req.body?.top_p));
    const model = resolveModel(req.body?.model && req.body.model.toString());
    const composed = system ? `SYSTEM:\n${system}\n\nUSER:\n${prompt}` : prompt;

    const reqBody = { model, input: composed, max_output_tokens: MAX_OUTPUT_TOKENS };
    if (temperature !== undefined) reqBody.temperature = temperature;
    if (top_p !== undefined) reqBody.top_p = top_p;

    const response = await client.responses.create(reqBody);
    const text = (typeof response.output_text === "function" ? response.output_text()
                 : response.output?.[0]?.content?.[0]?.text?.value) || "";
    appendJson(DB_EVENTS, { id: `evt_${Date.now()}`, type: "chat", payload: { prompt, output: text }, at: new Date().toISOString() });
    res.json({ ok: true, output: text, model });
  } catch (err) {
    console.error("OpenAI proxy error:", err);
    res.status(500).json({ error: "Server error", detail: String(err) });
  }
});

// ---- Chat (streaming) ----
app.post("/api/chat/stream", requireSecret, async (req, res) => {
  try {
    const prompt = (req.body?.prompt || "").toString().trim();
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });
    const system = (req.body?.system || "").toString().trim();
    const temperature = sanitizeTemp(Number(req.body?.temperature));
    const top_p = sanitizeTopP(Number(req.body?.top_p));
    const model = resolveModel(req.body?.model && req.body.model.toString());
    const composed = system ? `SYSTEM:\n${system}\n\nUSER:\n${prompt}` : prompt;

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no"
    });

    const chunks = [];
    const stream = await client.responses.stream({ model, input: composed, stream: true, max_output_tokens: MAX_OUTPUT_TOKENS });
    stream.on("text.delta", (chunk) => { chunks.push(chunk); try { res.write(chunk); } catch {} });
    stream.on("end", () => { 
      try { res.end(); } catch {}
      const output = chunks.join("");
      appendJson(DB_EVENTS, { id: `evt_${Date.now()}`, type: "stream", payload: { prompt, output }, at: new Date().toISOString() });
    });
    stream.on("error", (e) => { console.error("OpenAI stream error:", e); try { res.end(); } catch {} });
  } catch (err) {
    console.error("Proxy stream error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Server error", detail: String(err) });
    try { res.end(); } catch {}
  }
});

// ---- Vision ----
app.post("/api/vision", requireSecret, async (req, res) => {
  try {
    const image_url = (req.body?.image_url || "").toString().trim();
    const prompt = (req.body?.prompt || "Describe this image.").toString();
    if (!image_url) return res.status(400).json({ error: "Missing image_url" });

    const temperature = sanitizeTemp(Number(req.body?.temperature));
    const top_p = sanitizeTopP(Number(req.body?.top_p));
    const model = resolveModel(req.body?.model && req.body.model.toString());

    const reqBody = {
      model,
      input: [
        { role: "user", content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url }
        ]}
      ],
      max_output_tokens: MAX_OUTPUT_TOKENS
    };
    if (temperature !== undefined) reqBody.temperature = temperature;
    if (top_p !== undefined) reqBody.top_p = top_p;

    const response = await client.responses.create(reqBody);
    const text = (typeof response.output_text === "function" ? response.output_text()
                 : response.output?.[0]?.content?.[0]?.text?.value) || "";
    appendJson(DB_EVENTS, { id: `evt_${Date.now()}`, type: "vision", payload: { image_url, prompt, output: text }, at: new Date().toISOString() });
    res.json({ ok: true, output: text, model });
  } catch (err) {
    console.error("OpenAI vision error:", err);
    res.status(500).json({ error: "Server error", detail: String(err) });
  }
});

// ---- Image gen (+ save to disk + tags) ----
const normalizeSize = (size) => {
  const supported = new Set(["1024x1024","1024x1536","1536x1024","auto"]);
  return supported.has(String(size)) ? String(size) : "1024x1024";
};
app.post("/api/image", requireSecret, async (req, res) => {
  try {
    const prompt = (req.body?.prompt || "").toString().trim();
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });
    const size = normalizeSize(req.body?.size || "1024x1024");
    const tags = Array.isArray(req.body?.tags) ? req.body.tags.map(t => String(t)) : [];

    const result = await client.images.generate({ model: "gpt-image-1", prompt, size });
    const b64 = result?.data?.[0]?.b64_json || null;
    if (!b64) return res.status(500).json({ error: "Image generation failed" });

    const id = `img_${Date.now()}`;
    const filename = `${id}.png`;
    const abs = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(abs, Buffer.from(b64, "base64"));

    const rec = { id, prompt, size, file: `/images/${filename}`, tags, at: new Date().toISOString() };
    const imgs = readJson(DB_IMAGES); imgs.push(rec); writeJson(DB_IMAGES, imgs);
    appendJson(DB_EVENTS, { id: `evt_${Date.now()}`, type: "image", payload: { prompt, size, file: rec.file, tags }, at: new Date().toISOString() });

    res.json({ ok: true, image_base64: b64, size, image_url: rec.file, id });
  } catch (err) {
    console.error("OpenAI image-gen error:", err);
    res.status(500).json({ error: "Server error", detail: String(err) });
  }
});

// ---- Images list + tagging ----
app.get("/api/images", requireSecret, (_req, res) => {
  const imgs = readJson(DB_IMAGES);
  res.json({ ok: true, count: imgs.length, images: imgs.slice(-200) });
});
app.post("/api/tag-image", requireSecret, (req, res) => {
  const id   = String(req.body?.id || "");
  const tags = Array.isArray(req.body?.tags) ? req.body.tags.map(t => String(t)) : [];
  if (!id) return res.status(400).json({ error: "Missing id" });
  const imgs = readJson(DB_IMAGES);
  const idx = imgs.findIndex(x => x.id === id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  imgs[idx].tags = tags;
  writeJson(DB_IMAGES, imgs);
  res.json({ ok: true, image: imgs[idx] });
});

app.listen(PORT, () => {
  console.log(`Ashwood OpenAI proxy running on http://localhost:${PORT} (model_default=${MODEL_DEFAULT}, auth=${!!SHARED_SECRET}, mock=${MOCK_MODE}, max_output_tokens=${MAX_OUTPUT_TOKENS})`);
});
