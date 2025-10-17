/**
 * Ashwood & Co. Lobby/Holding-Room Engine
 * Mounts REST endpoints on the existing Express `app` under a base path (default: /v1).
 */
const express = require("express");

function weightedAiDelayMs() {
  const min = 3000, max = 15000, mode = 6500;
  const u = Math.random();
  const c = (mode - min) / (max - min);
  if (u < c) return Math.floor(min + Math.sqrt(u * (max - min) * (mode - min)));
  return Math.floor(max - Math.sqrt((1 - u) * (max - min) * (max - mode)));
}

const SESSIONS = new Map();
const nowTs = () => Date.now();

function makeSession(sessionId, { seats = 4, gm = { type: "human", id: "gm-1", name: "GM" } } = {}) {
  const players = Array.from({ length: seats }, (_, i) => ({
    seat: i,
    type: "human",
    id: null,
    name: null,
    character: null,
    connected: true,
    selectedAt: null,
  }));
  return {
    sessionId,
    gm,
    createdAt: nowTs(),
    status: "lobby",            // lobby | starting | in-progress | closed
    selectionEndsAt: null,
    selectionWindowMs: 20000,
    players,
    availableCharacters: [
      "ravenkeeper","antique_keymaster","haunted_caretaker",
      "occult_scholar","moonlit_detective","clockwork_tinkerer"
    ],
    timeouts: new Set(),
  };
}

function getSession(sessionId) {
  if (!SESSIONS.has(sessionId)) SESSIONS.set(sessionId, makeSession(sessionId));
  return SESSIONS.get(sessionId);
}

function startSelectionCountdown(state) {
  if (state.selectionEndsAt) return;
  state.selectionEndsAt = nowTs() + state.selectionWindowMs;
  const t = setTimeout(() => {
    autoAssignMissing(state);
    transitionToStarting(state);
  }, state.selectionWindowMs);
  state.timeouts.add(t);
}

function autoAssignMissing(state) {
  const pool = [...state.availableCharacters];
  state.players.forEach(p => {
    if (p.character) {
      const idx = pool.indexOf(p.character);
      if (idx >= 0) pool.splice(idx, 1);
    }
  });
  state.players.forEach(p => {
    if (!p.character) {
      const choice = pool.length ? pool.splice(Math.floor(Math.random() * pool.length), 1)[0] : null;
      p.character = choice || `auto_${Math.random().toString(36).slice(2,6)}`;
      p.selectedAt = nowTs();
    }
  });
}

function transitionToStarting(state) {
  state.status = "starting";
  const t = setTimeout(() => {
    state.status = "in-progress";
  }, 2000);
  state.timeouts.add(t);
}

function scheduleAiChoices(state) {
  const pool = [...state.availableCharacters];
  state.players.forEach(p => {
    if (p.character) {
      const idx = pool.indexOf(p.character);
      if (idx >= 0) pool.splice(idx, 1);
    }
  });
  state.players.forEach(p => {
    if (p.type === "ai" && !p.character) {
      const delay = weightedAiDelayMs();
      const t = setTimeout(() => {
        if (state.status !== "lobby" || p.character) return;
        const choice = pool.length ? pool.splice(Math.floor(Math.random() * pool.length), 1)[0] : null;
        p.character = choice || `ai_${Math.random().toString(36).slice(2,6)}`;
        p.selectedAt = nowTs();
        if (state.players.every(x => x.character)) transitionToStarting(state);
      }, delay);
      state.timeouts.add(t);
    }
  });
}

function clearTimeouts(state) {
  for (const t of state.timeouts) clearTimeout(t);
  state.timeouts.clear();
}

function register(app, basePath = "/v1") {
  const router = express.Router();

  // Simple health ping so we can confirm the router is mounted
  router.get("/lobby-ping", (_req, res) => res.json({ ok: true, service: "lobby", basePath }));

  router.post("/session/:id/init", (req, res) => {
    const { id } = req.params;
    const { seats = 4, gmType = "human", gmName = "GM", aiSeats = [] } = req.body || {};
    SESSIONS.set(id, makeSession(id, { seats, gm: { type: gmType, id: "gm-1", name: gmName } }));
    const state = getSession(id);
    aiSeats.forEach(seat => {
      if (state.players[seat]) {
        state.players[seat].type = "ai";
        state.players[seat].id = `ai-${seat+1}`;
        state.players[seat].name = `AI Player ${seat+1}`;
      }
    });
    res.json({ ok: true, state });
  });

  router.post("/session/:id/join", (req, res) => {
    const { id } = req.params;
    const { seat, userId, name } = req.body || {};
    const state = getSession(id);
    const p = state.players[seat];
    if (!p) return res.status(400).json({ error: "invalid seat" });
    if (p.type !== "human") return res.status(400).json({ error: "seat reserved for AI" });
    p.id = userId || `user-${seat+1}`;
    p.name = name || `Player ${seat+1}`;
    p.connected = true;
    res.json({ ok: true, state });
  });

  router.post("/session/:id/begin-selection", (req, res) => {
    const { id } = req.params;
    const state = getSession(id);
    startSelectionCountdown(state);
    scheduleAiChoices(state);
    res.json({ ok: true, endsAt: state.selectionEndsAt, state });
  });

  router.post("/session/:id/character-select", (req, res) => {
    const { id } = req.params;
    const { seat, character } = req.body || {};
    const state = getSession(id);
    const p = state.players[seat];
    if (!p) return res.status(400).json({ error: "invalid seat" });
    if (state.status !== "lobby") return res.status(400).json({ error: "not in lobby" });
    if (!state.selectionEndsAt) startSelectionCountdown(state);
    if (state.players.some(x => x.character === character)) {
      return res.status(409).json({ error: "character already taken" });
    }
    p.character = character;
    p.selectedAt = nowTs();
    if (state.players.every(x => x.character)) transitionToStarting(state);
    res.json({ ok: true, state });
  });

  router.post("/session/:id/force-start", (req, res) => {
    const { id } = req.params;
    const state = getSession(id);
    if (state.status !== "lobby") return res.status(400).json({ error: "not in lobby" });
    autoAssignMissing(state);
    transitionToStarting(state);
    res.json({ ok: true, state });
  });

  router.post("/session/:id/boot-inactive", (req, res) => {
    const { id } = req.params;
    const state = getSession(id);
    if (state.status !== "lobby") return res.status(400).json({ error: "not in lobby" });
    state.players.forEach(p => {
      if (p.type === "human" && !p.character) {
        p.type = "ai";
        p.id = `ai-repl-${p.seat+1}`;
        p.name = `AI Player ${p.seat+1}`;
        p.connected = true;
        p.character = null;
        p.selectedAt = null;
      }
    });
    scheduleAiChoices(state);
    res.json({ ok: true, state });
  });

  router.post("/session/:id/disconnect", (req, res) => {
    const { id } = req.params;
    const { seat } = req.body || {};
    const state = getSession(id);
    const p = state.players[seat];
    if (!p) return res.status(400).json({ error: "invalid seat" });
    p.connected = false;
    if (state.status === "lobby" && p.type === "human") {
      p.type = "ai";
      p.id = `ai-repl-${p.seat+1}`;
      p.name = `AI Player ${p.seat+1}`;
      p.character = null;
      p.selectedAt = null;
      scheduleAiChoices(state);
    }
    res.json({ ok: true, state });
  });

  router.get("/session/:id/lobby-state", (req, res) => {
    const { id } = req.params;
    const state = getSession(id);
    res.json({
      sessionId: state.sessionId,
      status: state.status,
      selectionEndsAt: state.selectionEndsAt,
      players: state.players,
      availableCharacters: state.availableCharacters,
    });
  });

  router.post("/session/:id/close", (req, res) => {
    const { id } = req.params;
    const state = SESSIONS.get(id);
    if (state) {
      clearTimeouts(state);
      SESSIONS.delete(id);
    }
    res.json({ ok: true });
  });

  app.use(basePath, router);
  console.log(`[Ashwood] Lobby endpoints mounted at ${basePath}`);
}

module.exports = { register };
