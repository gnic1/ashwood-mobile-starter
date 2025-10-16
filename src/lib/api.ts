const BASE = (process.env.EXPO_PUBLIC_API_BASE || "http://10.0.2.2:8787").replace(/\/+$/, "");

export type SessionLite = {
  code: string;
  title: string;
  description: string;
  gmName: string;
  isEnhanced: boolean;
  background: string;
  logo: string;
  startsAt: string | null;
  settings?: { rokuMaxPlayers?: number };
  gmType?: "human" | "ai";
  state?: "selection_open" | "selection_locked" | "in_game";
  selectionSeconds?: number;
  selectionEndsAt?: number | null;
};

export type Character = {
  id: string;
  name: string;
  role: string;
  blurb: string;
  buffs: string[];
  debuffsHidden?: boolean;
  available: boolean;
  claimedBy: string | null;
};

export async function validateSession(code: string): Promise<SessionLite> {
  const trimmed = (code || "").trim().toUpperCase();
  const res = await fetch(`${BASE}/session/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: trimmed }),
  });
  const data = await res.json();
  if (!res.ok || !data?.ok) throw new Error(data?.error || `Session validate failed (${res.status})`);
  return data.session as SessionLite;
}

export async function fetchSession(code: string): Promise<SessionLite> {
  const trimmed = (code || "").trim().toUpperCase();
  const res = await fetch(`${BASE}/session/${encodeURIComponent(trimmed)}`);
  const data = await res.json();
  if (!res.ok || !data?.ok) throw new Error(data?.error || `Session fetch failed (${res.status})`);
  return data.session as SessionLite;
}

export async function fetchCharacters(code: string): Promise<Character[]> {
  const trimmed = (code || "").trim().toUpperCase();
  const res = await fetch(`${BASE}/session/${encodeURIComponent(trimmed)}/characters`);
  const data = await res.json();
  if (!res.ok || !data?.ok) throw new Error(data?.error || `Character fetch failed (${res.status})`);
  return data.characters as Character[];
}

export async function claimCharacter(code: string, characterId: string, playerName: string): Promise<Character[]> {
  const trimmed = (code || "").trim().toUpperCase();
  const res = await fetch(`${BASE}/session/${encodeURIComponent(trimmed)}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ characterId, playerName }),
  });
  const data = await res.json();
  if (!res.ok || !data?.ok) throw new Error(data?.error || `Claim failed (${res.status})`);
  return data.characters as Character[];
}

export type SessionStatus = {
  code: string;
  state: "selection_open" | "selection_locked" | "in_game";
  selectionEndsAt: number | null;
  players: { name: string; type: "human" | "ai"; strikes: number; characterId: string | null }[];
  claims: Record<string, string>;
};

export async function getSessionStatus(code: string): Promise<SessionStatus> {
  const trimmed = (code || "").trim().toUpperCase();
  const res = await fetch(`${BASE}/session/${encodeURIComponent(trimmed)}/status`);
  const data = await res.json();
  if (!res.ok || !data?.ok) throw new Error(data?.error || `Status fetch failed (${res.status})`);
  return data as SessionStatus;
}

export async function setConfig(code: string, opts: { gmType?: "human"|"ai"; selectionSeconds?: number; inactivitySeconds?: number; aiPlayers?: string[] }) {
  const trimmed = (code || "").trim().toUpperCase();
  const res = await fetch(`${BASE}/session/${encodeURIComponent(trimmed)}/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts || {}),
  });
  const data = await res.json();
  if (!res.ok || !data?.ok) throw new Error(data?.error || `Config failed (${res.status})`);
  return data.config;
}

export async function humanForceStart(code: string, bootIfUnclaimed: boolean) {
  const trimmed = (code || "").trim().toUpperCase();
  const res = await fetch(`${BASE}/session/${encodeURIComponent(trimmed)}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bootIfUnclaimed }),
  });
  const data = await res.json();
  if (!res.ok || !data?.ok) throw new Error(data?.error || `Start failed (${res.status})`);
  return data;
}
