export type Session = {
  code: string;
  createdAt: number;
  players: string[];
  status: "lobby" | "in_progress" | "complete";
};

const _sessions: Record<string, Session> = {};

export function saveSession(s: Session) {
  _sessions[s.code] = s;
  return s;
}

export function getSession(code: string) {
  return _sessions[code];
}

export function upsertPlayer(code: string, playerName: string) {
  const s = _sessions[code];
  if (!s) return;
  if (!s.players.includes(playerName)) s.players.push(playerName);
}
