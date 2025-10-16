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
};

export type Character = {
  id: string;
  name: string;
  role: string;
  blurb: string;
  buffs: string[];
  debuffsHidden?: boolean; // debuffs are hidden on this screen
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

// Roku-friendly: update number of Roku players for a session
export async function setRokuMaxPlayers(code: string, count: number): Promise<number> {
  const trimmed = (code || "").trim().toUpperCase();
  const res = await fetch(`${BASE}/session/${encodeURIComponent(trimmed)}/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rokuMaxPlayers: count }),
  });
  const data = await res.json();
  if (!res.ok || !data?.ok) throw new Error(data?.error || `Settings update failed (${res.status})`);
  return data.settings?.rokuMaxPlayers ?? 0;
}
