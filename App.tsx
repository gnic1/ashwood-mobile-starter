import React, { useCallback, useMemo, useState } from "react";
import { Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View, Image } from "react-native";

const API_BASE = Platform.OS === "android" ? "http://10.0.2.2:5051" : "http://localhost:5051";

// If you kept SHARED_SECRET in the app earlier, it was injected into headers already.
// If not present, this still works because auth is disabled on the server right now.
const commonHeaders: Record<string,string> = {
  "Content-Type": "application/json",
  // "x-ashwood-key": "<injected-by-previous-step-if-present>"
};

type Status = "Idle" | "Running..." | "Streaming..." | "Done" | "Error";

export default function App() {
  const [prompt, setPrompt] = useState<string>("Say hello from Ashwood.");
  const [imageUrl, setImageUrl] = useState<string>("https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.jpg");

  const [status, setStatus] = useState<Status>("Idle");
  const [output, setOutput] = useState<string>("");
  const [imgBase64, setImgBase64] = useState<string | null>(null);

  // ---------- Helpers ----------
  const reset = useCallback(() => {
    setStatus("Idle");
    setOutput("");
    setImgBase64(null);
  }, []);

  // Client-side "fake streaming": call /api/chat once, then reveal text in chunks to look streamed.
  const runStreamingFallback = useCallback(async () => {
    try {
      setStatus("Streaming...");
      setOutput("");
      setImgBase64(null);

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(err || "Request failed");
      }
      const json = await res.json();
      const full = (json?.output ?? "").toString();

      const parts = full.length > 0 ? (full.match(/.{1,30}/g) ?? [full]) : [];
      for (let i = 0; i < parts.length; i++) {
        setOutput(prev => (prev ?? "") + parts[i]);
        // small delay to mimic token streaming
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 40));
      }
      setStatus("Done");
    } catch (e) {
      setStatus("Error");
      setOutput("Error");
    }
  }, [prompt]);

  const runNonStreaming = useCallback(async () => {
    try {
      setStatus("Running...");
      setOutput("");
      setImgBase64(null);
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(err || "Request failed");
      }
      const json = await res.json();
      setOutput((json?.output ?? "").toString());
      setStatus("Done");
    } catch (e) {
      setStatus("Error");
      setOutput("Error");
    }
  }, [prompt]);

  const runVision = useCallback(async () => {
    try {
      setStatus("Running...");
      setOutput("");
      setImgBase64(null);
      const res = await fetch(`${API_BASE}/api/vision`, {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify({ image_url: imageUrl, prompt: "Describe in one short sentence." }),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(err || "Request failed");
      }
      const json = await res.json();
      setOutput((json?.output ?? "").toString());
      setStatus("Done");
    } catch (e) {
      setStatus("Error");
      setOutput("Error");
    }
  }, [imageUrl]);

  const runImageGen = useCallback(async () => {
    try {
      setStatus("Running...");
      setOutput("");
      setImgBase64(null);
      const res = await fetch(`${API_BASE}/api/image`, {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify({ prompt: "A minimal, cozy haunted house icon, vector style, centered", size: "1024x1024" }),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || "Request failed");
      const json = JSON.parse(txt);
      if (json?.image_base64) setImgBase64(json.image_base64);
      setStatus("Done");
    } catch (e) {
      setStatus("Error");
      setOutput("Error");
    }
  }, []);

  // ---------- UI ----------
  const Button = useCallback(({ label, onPress }: { label: string; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={{
      padding: 14, backgroundColor: "#111827", borderRadius: 12, marginRight: 8, marginBottom: 8
    }}>
      <Text style={{ color: "white", fontWeight: "600" }}>{label}</Text>
    </TouchableOpacity>
  ), []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b1020" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: "white", fontSize: 24, fontWeight: "700", marginBottom: 12 }}>
          Ashwood & Co — OpenAI Test
        </Text>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: "#cbd5e1", marginBottom: 6 }}>Prompt</Text>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Type your prompt"
            placeholderTextColor="#64748b"
            style={{
              backgroundColor: "#111827",
              color: "white",
              padding: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#1f2937"
            }}
          />
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
          <Button label="Run (STREAMING)" onPress={runStreamingFallback} />
          <Button label="Run (Non-Streaming)" onPress={runNonStreaming} />
          <Button label="Run Vision" onPress={runVision} />
          <Button label="Generate Image" onPress={runImageGen} />
          <Button label="Reset" onPress={reset} />
        </View>

        <Text style={{ color: "#cbd5e1", marginBottom: 6 }}>Status: <Text style={{ fontWeight: "700" }}>{status}</Text></Text>
        {!!output && (
          <View style={{ backgroundColor: "#111827", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#1f2937", marginBottom: 12 }}>
            <Text style={{ color: "white" }}>{output}</Text>
          </View>
        )}

        {!!imgBase64 && (
          <View style={{ alignItems: "center" }}>
            <Image
              source={{ uri: `data:image/png;base64,${imgBase64}` }}
              style={{ width: 256, height: 256, borderRadius: 12 }}
            />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
