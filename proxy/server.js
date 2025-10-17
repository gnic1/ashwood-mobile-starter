/**
 * Ashwood Proxy (8787) — Fresh Lobby Service
 * Single router. Stable JSON contract. In-memory sessions for dev.
 * Requirements honored:
 *  - Characters unclaimed on first open (no claim logic yet; lobby only)
 *  - GM can reset/close a lobby (clear state and reuse code)
 *  - Avoid stale state/caching; explicit endpoints with clear payloads
 *  - Only one router mount
 */

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { randomUUID } = require("crypto");

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ------------------------------
// In-memory session store (DEV)
// ------------------------------
/**
 * sessions: Map<code, {
 *   code: string,
 *   status: 'open' | 'closed',
 *   createdAt: number,
 *   version: number,
 *   players: Array<{
 *     id: string, name: string, ready: boolean, joinedAt: number, role: 'gm' | 'player'
 *   }>
 * }>
 */
const sessions = new Map();

// Utils
const genCode = () => {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // avoid confusable chars
  let code = "";
  for (let i = 0; i < 5; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
};

const ok = (data) => ({ ok: true, data });
const err = (message, code = "BAD_REQUEST") => ({ ok: false, error: { code, message } });

// Single router mount (requirement)
const router = express.Router();

// Health
router.get("/health", (req, res) => {
  res.json(ok({ service: "ashwood-lobby", time: Date.now() }));
});

// Create a new session (GM)
router.post("/create-session", (req, res) => {
  let code;
  do { code = genCode(); } while (sessions.has(code));

  const gmName = (req.body && req.body.name) || "GM";
  const now = Date.now();

  const session = {
    code,
    status: "open",
    createdAt: now,
    version: 1,
    players: [
      {
        id: randomUUID(),
        name: gmName,
        ready: false,
        joinedAt: now,
        role: "gm",
      },
    ],
  };

  sessions.set(code, session);
  res.json(ok(session));
});

// Join a session (player)
router.post("/join-session", (req, res) => {
  const { code, name } = req.body || {};
  if (!code || !name) return res.status(400).json(err("code and name are required"));

  const session = sessions.get(code.toUpperCase());
  if (!session) return res.status(404).json(err("session not found", "NOT_FOUND"));
  if (session.status !== "open") return res.status(409).json(err("session is closed", "SESSION_CLOSED"));

  const player = {
    id: randomUUID(),
    name,
    ready: false,
    joinedAt: Date.now(),
    role: "player",
  };
  session.players.push(player);
  session.version++;
  res.json(ok({ session, player }));
});

// Get current lobby state
router.get("/lobby/:code", (req, res) => {
  const code = req.params.code.toUpperCase();
  const session = sessions.get(code);
  if (!session) return res.status(404).json(err("session not found", "NOT_FOUND"));
  res.json(ok(session));
});

// Toggle ready
router.post("/lobby/:code/ready", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, ready } = req.body || {};
  if (!playerId || typeof ready !== "boolean") {
    return res.status(400).json(err("playerId and ready:boolean are required"));
  }
  const session = sessions.get(code);
  if (!session) return res.status(404).json(err("session not found", "NOT_FOUND"));

  const p = session.players.find(x => x.id === playerId);
  if (!p) return res.status(404).json(err("player not found", "NOT_FOUND"));

  p.ready = ready;
  session.version++;
  res.json(ok(session));
});

// Leave session
router.post("/lobby/:code/leave", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body || {};
  if (!playerId) return res.status(400).json(err("playerId is required"));
  const session = sessions.get(code);
  if (!session) return res.status(404).json(err("session not found", "NOT_FOUND"));

  const before = session.players.length;
  session.players = session.players.filter(p => p.id !== playerId);
  if (session.players.length !== before) {
    session.version++;
  }
  res.json(ok(session));
});

// GM: close session (no new joins)
router.post("/lobby/:code/close", (req, res) => {
  const code = req.params.code.toUpperCase();
  const session = sessions.get(code);
  if (!session) return res.status(404).json(err("session not found", "NOT_FOUND"));
  session.status = "closed";
  session.version++;
  res.json(ok(session));
});

// GM: reopen session
router.post("/lobby/:code/reopen", (req, res) => {
  const code = req.params.code.toUpperCase();
  const session = sessions.get(code);
  if (!session) return res.status(404).json(err("session not found", "NOT_FOUND"));
  session.status = "open";
  session.version++;
  res.json(ok(session));
});

// GM: reset session (clear players except GM; clear readies)
router.post("/lobby/:code/reset", (req, res) => {
  const code = req.params.code.toUpperCase();
  const session = sessions.get(code);
  if (!session) return res.status(404).json(err("session not found", "NOT_FOUND"));

  // keep the earliest GM (first gm) if exists
  const gm = session.players.find(p => p.role === "gm") || null;
  const now = Date.now();
  session.players = gm ? [{ ...gm, ready: false, joinedAt: now }] : [];
  session.status = "open";
  session.version++;
  res.json(ok(session));
});

// Dev/debug helper
router.get("/debug/sessions", (req, res) => {
  res.json(ok(Array.from(sessions.values())));
});

app.use("/", router);

app.listen(PORT, () => {
  console.log(`Ashwood proxy listening on http://localhost:${PORT}`);
});
