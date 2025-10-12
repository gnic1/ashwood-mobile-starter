import { saveSession, getSession, upsertPlayer, Session } from "./api";

function randomCode(len = 5) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function createSession(): Session {
  const code = randomCode();
  const session: Session = {
    code,
    createdAt: Date.now(),
    players: [],
    status: "lobby",
  };
  return saveSession(session);
}

export function joinSession(code: string, playerName: string) {
  const s = getSession(code);
  if (!s) {
    return { ok: false as const, error: "NOT_FOUND" };
  }
  upsertPlayer(code, playerName);
  return { ok: true as const, session: s };
}
