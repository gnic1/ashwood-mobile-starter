const BASE =
  (process.env.EXPO_PUBLIC_API_BASE || "http://10.0.2.2:8787").replace(/\/+$/, "");

export type SessionLite = {
  code: string;
  title: string;
  description: string;
  gmName: string;
  isEnhanced: boolean;
  background: string;
  logo: string;
  startsAt: string | null;
};

export type Character = {
  id: string;
  name: string;
  role: string;
  blurb: string;
};

export async function validateSession(code: string): Promise<SessionLite> {
  const trimmed = (code || "").trim().toUpperCase();
  const res = await fetch(`${BASE}/session/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: trimmed }),
  });
  const data = await res.json();
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `Session validate failed (${res.status})`);
  }
  return data.session as SessionLite;
}

export async function fetchSession(code: string): Promise<SessionLite> {
  const trimmed = (code || "").trim().toUpperCase();
  const res = await fetch(`${BASE}/session/${encodeURIComponent(trimmed)}`);
  const data = await res.json();
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `Session fetch failed (${res.status})`);
  }
  return data.session as SessionLite;
}

export async function fetchCharacters(code: string): Promise<Character[]> {
  const trimmed = (code || "").trim().toUpperCase();
  const res = await fetch(`${BASE}/session/${encodeURIComponent(trimmed)}/characters`);
  const data = await res.json();
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `Character fetch failed (${res.status})`);
  }
  return data.characters as Character[];
}
