import { Platform } from "react-native";

export type Effect =
  | { type: "flag"; key: string; value: boolean }
  | { type: "score"; delta: number };

export type Choice = { label: string; nextSceneId: string; effects: Effect[] };
export type Scene = { id: string; title: string; mood?: string; text: string; choices: Choice[] };
export type Story = { id: string; title: string; startSceneId: string; scenes: Scene[] };

const defaultBase =
  Platform.OS === "android" ? "http://10.0.2.2:8787" : "http://localhost:8787";
const base = process.env.EXPO_PUBLIC_OPENAI_BASE_URL || defaultBase;

export async function loadStory(): Promise<Story> {
  // RN supports requiring JSON statically:
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const data = require("../../assets/stories/founding.json");
  return data as Story;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

export async function embellishWithAI(sceneText: string): Promise<string> {
  console.log("[embellish] base =", base);

  // Preflight to detect connectivity/cors quickly
  try {
    const ping = await fetchWithTimeout(`${base}/health`, { method: "GET" }, 5000);
    if (!ping.ok) {
      const body = await ping.text();
      throw new Error(`/health status ${ping.status}: ${body}`);
    }
  } catch (e: any) {
    throw new Error(`Proxy health failed at ${base}/health → ${e?.message ?? e}`);
  }

  const payload = {
    model: "gpt-4.1-mini",
    input: `Rewrite this scene description in 1-2 immersive sentences, keep details intact, no spoilers:\n\n${sceneText}`
  };

  const res = await fetchWithTimeout(`${base}/api/openai/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }, 15000);

  if (!res.ok) {
    const t = await res.text();
    console.log("[embellish] error:", res.status, t);
    throw new Error(`AI error ${res.status}: ${t}`);
  }

  const data = await res.json();
  const out = data.output_text ??
    (Array.isArray(data.output) && data.output[0]?.content?.[0]?.text) ??
    JSON.stringify(data);
  return typeof out === "string" ? out : JSON.stringify(out);
}
