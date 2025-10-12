import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in server/.env");
  process.exit(1);
}

// Security hardening
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS: allow null (native app), localhost dev ports, and explicit list
const whitelist = new Set([
  "http://localhost:8081",
  "http://localhost:8082",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8082"
]);
app.use(cors({
  origin: (origin, cb) => {
    // Expo native fetch often has no origin (null) — allow it
    if (!origin || whitelist.has(origin)) return cb(null, true);
    return cb(new Error("CORS: origin not allowed"));
  },
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Parse JSON and limit size
app.use(express.json({ limit: "256kb" }));

// Simple rate limit
const limiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Allow-list models (adjust as needed)
const MODEL_ALLOWLIST = new Set([
  "gpt-4.1-mini",
  "gpt-4.1",
  "o4-mini",
  "o4-mini-high"
]);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ashwood-proxy", port: PORT });
});

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

// Basic text prompt (already working)
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

// New: Chat-style endpoint that forwards messages[] directly
app.post("/api/openai/chat", async (req, res) => {
  try {
    const { model, messages, ...rest } = req.body || {};
    if (!model || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Body must include model and non-empty messages array." });
    }
    if (!MODEL_ALLOWLIST.has(model)) {
      return res.status(400).json({ error: `Model '${model}' not allowed.` });
    }
    // Responses API can take 'input' as messages array
    const { status, type, text } = await callOpenAI({ model, input: messages, ...rest });
    res.status(status).type(type).send(text);
  } catch (err) {
    console.error("Proxy /chat error:", err);
    res.status(500).json({ error: "Proxy failed", detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Ashwood proxy listening on http://localhost:${PORT}`);
});
