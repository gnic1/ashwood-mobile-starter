export async function testOpenAI(): Promise<string> {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key) throw new Error("Missing EXPO_PUBLIC_OPENAI_API_KEY in .env");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: "Say: Hello, Ashwood!"
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const output = data.output_text ??
    (Array.isArray(data.output) && data.output[0]?.content?.[0]?.text) ??
    JSON.stringify(data);

  return typeof output === "string" ? output : JSON.stringify(output);
}
