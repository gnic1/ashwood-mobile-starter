import { Platform } from "react-native";

const defaultBase =
  Platform.OS === "android"
    ? "http://10.0.2.2:8787"    // Android emulator -> host machine
    : "http://localhost:8787";

const base = process.env.EXPO_PUBLIC_OPENAI_BASE_URL || defaultBase;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

export async function testOpenAI(): Promise<string> {
  console.log("[testOpenAI] base:", base);
  if (!base) throw new Error("Missing OPENAI base URL");
  const res = await fetchWithTimeout(`${base}/api/openai/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: "Say: Hello, Ashwood — via PROXY!"
    })
  });
  if (!res.ok) {
    const text = await res.text();
    console.log("[testOpenAI] error:", res.status, text);
    throw new Error(`Proxy/OpenAI error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const output = data.output_text ??
    (Array.isArray(data.output) && data.output[0]?.content?.[0]?.text) ??
    JSON.stringify(data);
  console.log("[testOpenAI] ok");
  return typeof output === "string" ? output : JSON.stringify(output);
}

export async function testChat(): Promise<string> {
  console.log("[testChat] base:", base);
  if (!base) throw new Error("Missing OPENAI base URL");
  const res = await fetchWithTimeout(`${base}/api/openai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a friendly assistant." },
        { role: "user", content: "Reply exactly with: Hello from chat — proxied!" }
      ]
    })
  });
  if (!res.ok) {
    const text = await res.text();
    console.log("[testChat] error:", res.status, text);
    throw new Error(`Proxy/OpenAI chat error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const output = data.output_text ??
    (Array.isArray(data.output) && data.output[0]?.content?.[0]?.text) ??
    JSON.stringify(data);
  console.log("[testChat] ok");
  return typeof output === "string" ? output : JSON.stringify(output);
}
