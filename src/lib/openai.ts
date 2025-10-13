import { API_BASE, OPENAI_BASE, OPENAI_API_KEY } from "../services/env";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function candidatePaths(base: string) {
  return [
    `${base}/chat/messages`,
    `${base}/chat`,
    `${base}/v1/chat/completions`,
    `${base}/v1/responses`,
  ];
}

async function tryPostJSON<T>(paths: string[], body: any): Promise<T> {
  let lastErr: unknown = null;
  for (const url of paths) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(OPENAI_API_KEY ? { authorization: `Bearer ${OPENAI_API_KEY}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (res.ok) return (await res.json()) as T;
      const text = await res.text();
      lastErr = new Error(`HTTP ${res.status} on ${url}: ${text}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("All endpoints failed");
}

function normalizeText(resp: any): string {
  try {
    return (
      resp?.choices?.[0]?.message?.content ??
      resp?.choices?.[0]?.text ??
      resp?.output_text ??
      (typeof resp === "string" ? resp : JSON.stringify(resp, null, 2))
    );
  } catch {
    return JSON.stringify(resp, null, 2);
  }
}

/** Plain prompt test (tries both Responses API and Chat Completions) */
export async function testPrompt(prompt: string): Promise<string> {
  const base = OPENAI_BASE || API_BASE;
  const urls = candidatePaths(base);
  const bodies = [
    { input: prompt, model: "gpt-4o-mini" },
    { model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] },
    { prompt },
  ];
  let lastErr: unknown = null;
  for (const b of bodies) {
    try {
      const r = await tryPostJSON<any>(urls, b);
      return normalizeText(r);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Prompt failed at all candidates");
}

/** Chat test; injects a safe default if none provided */
export async function testChat(messages?: ChatMessage[]): Promise<string> {
  const base = OPENAI_BASE || API_BASE;
  const urls = candidatePaths(base);

  const safe =
    Array.isArray(messages) && messages.length > 0
      ? messages
      : [{ role: "user", content: "Hello from Ashwood dev check" }];

  const bodies = [
    { model: "gpt-4o-mini", messages: safe },
    { messages: safe },
  ];

  let lastErr: unknown = null;
  for (const b of bodies) {
    try {
      const r = await tryPostJSON<any>(urls, b);
      return normalizeText(r);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Messages failed at all candidates");
}
