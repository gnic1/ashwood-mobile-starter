/* eslint-disable */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Safe fetch: Node 18+ has global.fetch; otherwise lazy-load node-fetch
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
    startsAt: null
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
    startsAt: null
  }
};

// Validate by code
app.post('/session/validate', (req, res) => {
  const { code } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing or invalid `code`.' });
  }
  const key = code.trim().toUpperCase();
  const session = SESSIONS[key];
  if (!session) return res.status(404).json({ ok: false, error: 'Session not found.' });
  const { title, gmName, isEnhanced, background, logo, description, startsAt } = session;
  return res.json({
    ok: true,
    session: { code: key, title, gmName, isEnhanced, background, logo, description, startsAt }
  });
});

// Fetch landing by code
app.get('/session/:code', (req, res) => {
  const key = String(req.params.code || '').trim().toUpperCase();
  const session = SESSIONS[key];
  if (!session) return res.status(404).json({ ok: false, error: 'Session not found.' });
  return res.json({ ok: true, session });
});

// -------- Character list for a session (mock) --------
const CHARACTERS = [
  { id: "c1", name: "Evelyn Blackwood", role: "Historian", blurb: "Keeper of Ashwood’s forgotten records." },
  { id: "c2", name: "Inspector Marlowe", role: "Detective", blurb: "A skeptic drawn by unsolved curiosities." },
  { id: "c3", name: "Sister Agnes", role: "Nun", blurb: "Whispers warn her: the house remembers." },
  { id: "c4", name: "Thomas Whitaker", role: "Barrister", blurb: "Executor of Ambrose’s last will." }
];

app.get('/session/:code/characters', (req, res) => {
  const key = String(req.params.code || '').trim().toUpperCase();
  if (!SESSIONS[key]) return res.status(404).json({ ok: false, error: 'Session not found.' });
  // later: attach availability/claimed-by state
  res.json({ ok: true, code: key, characters: CHARACTERS });
});

// -------- OpenAI passthrough --------
const OPENAI_BASE = process.env.OPENAI_BASE || 'https://api.openai.com';
const OPENAI_KEY  = process.env.OPENAI_API_KEY;

function requireKey(res) {
  if (!OPENAI_KEY) {
    res.status(500).json({ ok: false, error: 'OPENAI_API_KEY missing on proxy server' });
    return false;
  }
  return true;
}

app.post('/v1/chat/completions', async (req, res) => {
  if (!requireKey(res)) return;
  try {
    const r = await fetch(`${OPENAI_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body || {})
    });
    const text = await r.text();
    res.status(r.status).type('application/json').send(text);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/v1/models', async (_req, res) => {
  if (!requireKey(res)) return;
  try {
    const r = await fetch(`${OPENAI_BASE}/v1/models`, {
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}` }
    });
    const text = await r.text();
    res.status(r.status).type('application/json').send(text);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// -------- 404 after all routes --------
app.use((_req, res) => res.status(404).json({ ok: false, error: 'Not found' }));

// -------- Start servers --------
app.listen(PORT_PRIMARY, () =>
  console.log(`Ashwood proxy listening on http://localhost:${PORT_PRIMARY}`)
);
app.listen(PORT_SECONDARY, () =>
  console.log(`Ashwood proxy also listening on http://localhost:${PORT_SECONDARY}`)
);
