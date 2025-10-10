// src/services/ai/openai.ts
// Minimal OpenAI client for React Native (fetch-based).
// Treats localhost and common tunnel hosts as *proxy* targets,
// so we NEVER send an Authorization header to them and we don't
// require a public key on the client. The server (local proxy)
// holds the real OPENAI_API_KEY.

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const OPENAI_BASE_URL =
  process.env.EXPO_PUBLIC_OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
const OPENAI_MODEL =
  process.env.EXPO_PUBLIC_OPENAI_MODEL ?? 'gpt-4o-mini';

function isProxyHost(url: string): boolean {
  try {
    const host = new URL(url).host.toLowerCase();
    if (host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('10.0.2.2')) return true;
    if (
      /\.ngrok\.io$/.test(host) ||
      /\.ngrok-free\.(app|dev)$/.test(host) ||
      /\.trycloudflare\.com$/.test(host) ||
      /\.loca\.lt$/.test(host)
    ) return true;
    return false;
  } catch { return false; }
}

function addNgrokBypass(url: string): string {
  try {
    const u = new URL(url);
    const host = u.host.toLowerCase();
    if (/\.ngrok\.io$/.test(host) || /\.ngrok-free\.(app|dev)$/.test(host)) {
      // Add ?_ngrok_skip_browser_warning=1 if not present
      if (!u.searchParams.has('_ngrok_skip_browser_warning')) {
        u.searchParams.set('_ngrok_skip_browser_warning', '1');
      }
    }
    return u.toString().replace(/\/+$/, '');
  } catch {
    return url;
  }
}

const IS_PROXY = isProxyHost(OPENAI_BASE_URL);

// ===== Types =====
type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };
type ReviewResult = { approved: boolean; reason: string; raw?: string };

// ===== Core chat call =====
async function chat(messages: ChatMsg[]): Promise<string> {
  if (!IS_PROXY && !OPENAI_API_KEY) {
    return '[AI disabled: missing EXPO_PUBLIC_OPENAI_API_KEY]\n' +
           'Either set a public key (dev only) or point EXPO_PUBLIC_OPENAI_BASE_URL to your local/tunnel proxy.';
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (!IS_PROXY) {
    headers['Authorization'] = `Bearer ${OPENAI_API_KEY}`;
  }

  // Bypass ngrok browser warning
  let base = addNgrokBypass(OPENAI_BASE_URL);
  try {
    const host = new URL(base).host.toLowerCase();
    if (/\.ngrok\.io$/.test(host) || /\.ngrok-free\.(app|dev)$/.test(host)) {
      headers['ngrok-skip-browser-warning'] = '1';
    }
  } catch {}

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: OPENAI_MODEL, messages, temperature: 0.8 }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI error (${res.status}): ${text || res.statusText}`);
  }

  const json = await res.json();
  const out = json?.choices?.[0]?.message?.content ?? '';
  return typeof out === 'string' ? out : String(out);
}

// ===== Public helpers =====
export async function generateNarration(input: {
  roomName: string; round: number; tone?: string | null; lastEvents?: string[];
}) {
  const { roomName, round, tone, lastEvents = [] } = input;

  const sys: ChatMsg = {
    role: 'system',
    content:
      'You are Ashwood & Co.’s narrator. Keep it short, vivid, and grounded in Victorian mystery. ' +
      'Return 3 short lines separated by newlines. Avoid modern slang.',
  };

  const user: ChatMsg = {
    role: 'user',
    content:
      `Room: ${roomName}\nRound: ${round}\nTone: ${tone ?? 'neutral'}\n` +
      `Recent: ${lastEvents.join(' | ') || 'none'}\n\n` +
      'Write 3 lines of narration, each on its own line.',
  };

  const text = await chat([sys, user]);
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 3);
}

export async function reviewFreeform(input: { text: string; tone?: string | null }): Promise<ReviewResult> {
  const { text, tone } = input;

  const sys: ChatMsg = {
    role: 'system',
    content:
      'You are a cautious GM assistant. Decide if a player freeform action is ' +
      'safe and reasonable for the current scene. Respond strictly as JSON: ' +
      '{"approved": true|false, "reason": "short reason"}. Keep it brief.',
  };

  const user: ChatMsg = {
    role: 'user',
    content:
      `Tone: ${tone ?? 'neutral'}\nAction: ${text}\n` +
      'Be permissive but reject clearly unsafe or meta-breaking actions.',
  };

  const out = await chat([sys, user]);
  try {
    const parsed = JSON.parse(out);
    return { approved: !!parsed.approved, reason: typeof parsed.reason === 'string' ? parsed.reason : 'OK', raw: out };
  } catch {
    return { approved: true, reason: 'OK', raw: out };
  }
}
