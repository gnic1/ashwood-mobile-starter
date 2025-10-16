/* eslint-disable */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const fetch = (typeof global.fetch === 'function')
  ? global.fetch
  : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

console.log('=== ASHWOOD PROXY v2 — starting with session routes & OpenAI passthrough ===');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT_PRIMARY = process.env.PORT || 8787;
const PORT_SECONDARY = 5051;

// -------- Health & Version --------
app.get('/', (_req, res) => {
  res.json({ ok: true, message: 'Ashwood proxy listening', ports: [PORT_PRIMARY, PORT_SECONDARY] });
});
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/_version', (_req, res) => {
  res.json({ ok: true, version: 'proxy-v2', pid: process.pid, node: process.version, ts: new Date().toISOString() });
});

// -------- Session (Join Flow) --------
const SESSIONS = {
  "ASH-72QK": {
    code: "ASH-72QK",
    title: "The Founding of Ashwood & Co.",
    description:
      "Victorian England, 1888. You are summoned to Ashwood Hall for the reading of Ambrose Ashwood’s will. The storm is not the only thing that’s gathering...",
    gmName: "Ambrose_Ashwood",
    isEnhanced: true,
    background: "victorian-manor",
    logo: "🕯️",
    startsAt: null,
    settings: { rokuMaxPlayers: 0 } // configurable
  },
  "HALL-1901": {
    code: "HALL-1901",
    title: "Ashwood Hall: The House Breathes",
    description:
      "Candles flare to life as the doors creak open. Portrait eyes follow. Something in the cellar doesn’t want to stay sealed.",
    gmName: "GM_Crow",
    isEnhanced: false,
    background: "stormy-hall",
    logo: "🏰",
    startsAt: null,
    settings: { rokuMaxPlayers: 0 }
  }
};

// Base cast (now with attributes)
const CHARACTERS_BASE = [
  {
    id: "c1",
    name: "Evelyn Blackwood",
    role: "Historian",
    blurb: "Keeper of Ashwood’s forgotten records.",
    buffs: ["Lore Mastery (+1 Clues)", "Calm Under Pressure"],
    debuffs: ["Fragile Nerves (-1 in Darkness)"]
  },
  {
    id: "c2",
    name: "Inspector Marlowe",
    role: "Detective",
    blurb: "A skeptic drawn by unsolved curiosities.",
    buffs: ["Interrogator (+1 Persuasion)", "Keen Eye"],
    debuffs: ["Stubborn (Disadvantage on Supernatural Advice)"]
  },
  {
    id: "c3",
    name: "Sister Agnes",
    role: "Nun",
    blurb: "Whispers warn her: the house remembers.",
    buffs: ["Sanctified Aura (Ward off Fear)", "Empathy"],
    debuffs: ["Vow of Silence (Limited Dialogue Choices)"]
  },
  {
    id: "c4",
    name: "Thomas Whitaker",
    role: "Barrister",
    blurb: "Executor of Ambrose’s last will.",
    buffs: ["Legalese (+1 Contracts)", "Connections in High Places"],
    debuffs: ["Public Figure (Easily Recognized)"]
  }
];

// Per-session claim state:
// CLAIMS: { [sessionCode]: { [characterId]: playerName } }
// PLAYER_CLAIMS: { [sessionCode]: { [playerName]: characterId } }
const CLAIMS = Object.create(null);
const PLAYER_CLAIMS = Object.create(null);

// Utility
function ensureSession(code) {
  const key = String(code || '').trim().toUpperCase();
  const session = SESSIONS[key];
  if (!session) return { key, session: null };
  if (!CLAIMS[key]) CLAIMS[key] = {};
  if (!PLAYER_CLAIMS[key]) PLAYER_CLAIMS[key] = {};
  return { key, session };
}

// Validate by code
app.post('/session/validate', (req, res) => {
  const { code } = req.body || {};
  if (!code || typeof code !== 'string') return res.status(400).json({ ok: false, error: 'Missing or invalid `code`.' });
  const { key, session } = ensureSession(code);
  if (!session) return res.status(404).json({ ok: false, error: 'Session not found.' });
  const { title, gmName, isEnhanced, background, logo, description, startsAt, settings } = session;
  return res.json({ ok: true, session: { code: key, title, gmName, isEnhanced, background, logo, description, startsAt, settings } });
});

// Fetch landing by code
app.get('/session/:code', (req, res) => {
  const { key, session } = ensureSession(req.params.code);
  if (!session) return res.status(404).json({ ok: false, error: 'Session not found.' });
  return res.json({ ok: true, session });
});

// Characters with availability (buffs shown; debuffs hidden here)
app.get('/session/:code/characters', (req, res) => {
  const { key, session } = ensureSession(req.params.code);
  if (!session) return res.status(404).json({ ok: false, error: 'Session not found.' });
  const claimed = CLAIMS[key];
  const characters = CHARACTERS_BASE.map(c => {
    const claimedBy = claimed[c.id] || null;
    const { debuffs, ...safe } = c;
    return { ...safe, debuffsHidden: true, claimedBy, available: !claimedBy };
  });
  res.json({ ok: true, code: key, characters });
});

// Full character details (for next screen: includes debuffs)
app.get('/session/:code/character/:id', (req, res) => {
  const { key, session } = ensureSession(req.params.code);
  if (!session) return res.status(404).json({ ok: false, error: 'Session not found.' });
  const c = CHARACTERS_BASE.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ ok: false, error: 'Character not found.' });
  const claimedBy = (CLAIMS[key] || {})[c.id] || null;
  res.json({ ok: true, character: { ...c, claimedBy } });
});

// Claim a character (enforce 1 per player)
app.post('/session/:code/claim', (req, res) => {
  const { key, session } = ensureSession(req.params.code);
  if (!session) return res.status(404).json({ ok: false, error: 'Session not found.' });

  const { characterId, playerName } = req.body || {};
  if (!characterId || !playerName) return res.status(400).json({ ok: false, error: 'Missing `characterId` or `playerName`.' });

  const exists = CHARACTERS_BASE.find(c => c.id === characterId);
  if (!exists) return res.status(404).json({ ok: false, error: 'Character not found.' });

  const takenBy = CLAIMS[key][characterId] || null;
  const alreadyHas = PLAYER_CLAIMS[key][playerName] || null;

  if (alreadyHas && alreadyHas !== characterId) {
    return res.status(409).json({ ok: false, error: 'Player already selected a character.' });
  }
  if (takenBy && takenBy !== playerName) {
    return res.status(409).json({ ok: false, error: 'Character already claimed.', claimedBy: takenBy });
  }

  // Record claim (idempotent for same player/char)
  CLAIMS[key][characterId] = playerName;
  PLAYER_CLAIMS[key][playerName] = characterId;

  // Respond with updated list (still hide debuffs)
  const characters = CHARACTERS_BASE.map(c => {
    const claimedBy2 = CLAIMS[key][c.id] || null;
    const { debuffs, ...safe } = c;
    return { ...safe, debuffsHidden: true, claimedBy: claimedBy2, available: !claimedBy2 };
  });

  res.json({ ok: true, code: key, claimed: { characterId, playerName }, characters });
});

// DEV ONLY: unclaim
app.delete('/session/:code/claim/:characterId', (req, res) => {
  const { key, session } = ensureSession(req.params.code);
  if (!session) return res.status(404).json({ ok: false, error: 'Session not found.' });
  const { characterId } = req.params;
  const player = CLAIMS[key][characterId];
  delete CLAIMS[key][characterId];
  if (player && PLAYER_CLAIMS[key][player] === characterId) delete PLAYER_CLAIMS[key][player];

  const characters = CHARACTERS_BASE.map(c => {
    const claimedBy = CLAIMS[key][c.id] || null;
    const { debuffs, ...safe } = c;
    return { ...safe, debuffsHidden: true, claimedBy, available: !claimedBy };
  });

  res.json({ ok: true, code: key, characters });
});

// Roku-friendly session settings (e.g., set number of Roku players)
app.post('/session/:code/settings', (req, res) => {
  const { key, session } = ensureSession(req.params.code);
  if (!session) return res.status(404).json({ ok: false, error: 'Session not found.' });
  const { rokuMaxPlayers } = req.body || {};
  if (typeof rokuMaxPlayers === 'number' && rokuMaxPlayers >= 0) {
    session.settings.rokuMaxPlayers = Math.floor(rokuMaxPlayers);
  }
  res.json({ ok: true, settings: session.settings });
});

// -------- OpenAI passthrough --------
const OPENAI_BASE = process.env.OPENAI_BASE || 'https://api.openai.com';
const OPENAI_KEY  = process.env.OPENAI_API_KEY;
function requireKey(res) { if (!OPENAI_KEY) { res.status(500).json({ ok: false, error: 'OPENAI_API_KEY missing on proxy server' }); return false; } return true; }

app.post('/v1/chat/completions', async (req, res) => {
  if (!requireKey(res)) return;
  try {
    const r = await fetch(`${OPENAI_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });
    const text = await r.text();
    res.status(r.status).type('application/json').send(text);
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

app.get('/v1/models', async (_req, res) => {
  if (!requireKey(res)) return;
  try {
    const r = await fetch(`${OPENAI_BASE}/v1/models`, { headers: { 'Authorization': `Bearer ${OPENAI_KEY}` }});
    const text = await r.text();
    res.status(r.status).type('application/json').send(text);
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

// -------- 404 after all routes --------
app.use((_req, res) => res.status(404).json({ ok: false, error: 'Not found' }));

// -------- Start servers --------
app.listen(PORT_PRIMARY, () => console.log(`Ashwood proxy listening on http://localhost:${PORT_PRIMARY}`));
app.listen(PORT_SECONDARY, () => console.log(`Ashwood proxy also listening on http://localhost:${PORT_SECONDARY}`));
