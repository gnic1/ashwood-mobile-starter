import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

dotenv.config();

const PORT = Number(process.env.PORT || 5051);
const MODEL_DEFAULT = process.env.MODEL || "gpt-4o-mini";
const MODEL_VISION  = process.env.VISION_MODEL || "gpt-4o"; // vision-capable
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const SHARED_SECRET = process.env.SHARED_SECRET || "";
const MOCK_MODE = String(process.env.MOCK_MODE || "0") === "1";
const MAX_OUTPUT_TOKENS = Number(process.env.MAX_OUTPUT_TOKENS || 256);

const MODEL_ALLOW = new Set(["gpt-4o-mini","gpt-4o","o4-mini"]);

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "4mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false }));
app.use((req, res, next) => { req.setTimeout(60_000); res.setTimeout(60_000); next(); });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Auth (skips health endpoints)
const requireSecret = (req, res, next) => {
  if (!SHARED_SECRET) return next();
  const key = req.header("x-ashwood-key");
  if (key && key === SHARED_SECRET) return next();
  return res.status(401).json({ error: "Unauthorized" });
};

// --- Helpers
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const sanitizeTemp = (t) => Number.isFinite(t) ? clamp(t, 0, 2) : undefined;
const sanitizeTopP = (p) => Number.isFinite(p) ? clamp(p, 0, 1) : undefined;
const resolveModel = (m, fallback=MODEL_DEFAULT) => (m && MODEL_ALLOW.has(m)) ? m : fallback;

// Robustly pull text from Responses API, covering multiple SDK shapes
function extractText(r) {
  try {
    if (!r) return "";
    // SDK helper (newer SDKs)
    if (typeof r.output_text === "function") {
      const t = r.output_text();
      if (t && typeof t === "string") return t.trim();
    }
    if (typeof r.output_text === "string") {
      return r.output_text.trim();
    }
    // Common shapes
    const parts = [];
    const output = Array.isArray(r.output) ? r.output : (Array.isArray(r.choices) ? r.choices : []);
    for (const o of output) {
      const content = Array.isArray(o?.content) ? o.content : [];
      for (const c of content) {
        // responses: {type:'output_text', text:{value:'...'}}
        if (c?.type === "output_text" && c?.text?.value) parts.push(c.text.value);
        // sometimes: {type:'text', text:{value:'...'}}
        else if (c?.type === "text" && c?.text?.value) parts.push(c.text.value);
        // fallback: plain string at c.text
        else if (typeof c?.text === "string") parts.push(c.text);
      }
    }
    return parts.join("\n").trim();
  } catch {
    return "";
  }
}

// ---- Health
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ashwood-openai-proxy", model_default: MODEL_DEFAULT, auth: !!SHARED_SECRET, port: PORT, mock: MOCK_MODE });
});
app.get("/health/openai", async (_req, res) => {
  try {
    const response = await client.responses.create({ model: MODEL_DEFAULT, input: "ping", max_output_tokens: 16 });
    res.json({ ok: !!response?.id, model: MODEL_DEFAULT });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ---- Routes (static list)
app.get("/routes", (_req, res) => {
  res.json({
    port: PORT,
    mock: MOCK_MODE,
    routes: [
      { methods: "GET",  path: "/health" },
      { methods: "GET",  path: "/health/openai" },
      { methods: "GET",  path: "/routes" },
      { methods: "POST", path: "/api/chat" },
      { methods: "POST", path: "/api/chat/stream" },
      { methods: "POST", path: "/api/vision" },
      { methods: "POST", path: "/api/image" }
    ]
  });
});

// ---- Chat (non-streaming)
app.post("/api/chat", requireSecret, async (req, res) => {
  try {
    const prompt = (req.body?.prompt || "").toString().trim();
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const system = (req.body?.system || "").toString().trim();
    const temperature = sanitizeTemp(Number(req.body?.temperature));
    const top_p = sanitizeTopP(Number(req.body?.top_p));
    const model = resolveModel(req.body?.model && req.body.model.toString(), MODEL_DEFAULT);

    const composed = system ? `SYSTEM:\n${system}\n\nUSER:\n${prompt}` : prompt;
    const reqBody = { model, input: composed, max_output_tokens: MAX_OUTPUT_TOKENS };
    if (temperature !== undefined) reqBody.temperature = temperature;
    if (top_p !== undefined) reqBody.top_p = top_p;

    const response = await client.responses.create(reqBody);
    const text = extractText(response);
    res.json({ ok: true, output: text, model });
  } catch (err) {
    res.status(500).json({ error: "Server error", detail: String(err) });
  }
});

// ---- Chat (streaming)
app.post("/api/chat/stream", requireSecret, async (req, res) => {
  try {
    const prompt = (req.body?.prompt || "").toString().trim();
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const system = (req.body?.system || "").toString().trim();
    const temperature = sanitizeTemp(Number(req.body?.temperature));
    const top_p = sanitizeTopP(Number(req.body?.top_p));
    const model = resolveModel(req.body?.model && req.body.model.toString(), MODEL_DEFAULT);
    const composed = system ? `SYSTEM:\n${system}\n\nUSER:\n${prompt}` : prompt;

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no"
    });

    const reqBody = { model, input: composed, stream: true, max_output_tokens: MAX_OUTPUT_TOKENS };
    if (temperature !== undefined) reqBody.temperature = temperature;
    if (top_p !== undefined) reqBody.top_p = top_p;

    const stream = await client.responses.stream(reqBody);
    // Prefer text.delta if available; also catch output_text.delta if SDK emits that
    stream.on("text.delta", (chunk) => { try { res.write(chunk); } catch {} });
    stream.on("output_text.delta", (chunk) => { try { res.write(chunk); } catch {} });
    stream.on("end", () => { try { res.end(); } catch {} });
    stream.on("error", (_e) => { try { res.end(); } catch {} });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: "Server error", detail: String(err) });
    try { res.end(); } catch {}
  }
});

// ---- Vision (uses MODEL_VISION default)
app.post("/api/vision", requireSecret, async (req, res) => {
  try {
    const image_url = (req.body?.image_url || "").toString().trim();
    const prompt = (req.body?.prompt || "Describe this image.").toString();
    if (!image_url) return res.status(400).json({ error: "Missing image_url" });

    const temperature = sanitizeTemp(Number(req.body?.temperature));
    const top_p = sanitizeTopP(Number(req.body?.top_p));
    const model = resolveModel(req.body?.model && req.body.model.toString(), MODEL_VISION);

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
    const text = extractText(response);
    res.json({ ok: true, output: text, model });
  } catch (err) {
    res.status(500).json({ error: "Server error", detail: String(err) });
  }
});

// ---- Image (maps unsupported sizes to supported)
app.post("/api/image", requireSecret, async (req, res) => {
  try {
    const prompt = (req.body?.prompt || "").toString().trim();
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const raw = (req.body?.size || "1024x1024").toString();
    const sizeMap = new Map([["256x256","1024x1024"],["512x512","1024x1024"]]);
    const allowed = new Set(["1024x1024","1024x1536","1536x1024","auto"]);
    const size = allowed.has(raw) ? raw : (sizeMap.get(raw) || "1024x1024");

    const result = await client.images.generate({ model: "gpt-image-1", prompt, size });
    const b64 = result?.data?.[0]?.b64_json || null;
    if (!b64) return res.status(500).json({ error: "Image generation failed" });
    res.json({ ok: true, image_base64: b64, size });
  } catch (err) {
    res.status(500).json({ error: "Server error", detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Ashwood OpenAI proxy running on http://localhost:${PORT} (model_default=${MODEL_DEFAULT}, auth=${!!SHARED_SECRET}, mock=${MOCK_MODE}, max_output_tokens=${MAX_OUTPUT_TOKENS})`);
});
