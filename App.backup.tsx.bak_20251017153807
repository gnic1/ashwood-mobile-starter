import React, { useState } from "react";
import { SafeAreaView, View, Text, TextInput, Button, ScrollView, Platform } from "react-native";

/**
 * BACKEND BASE URL
 * - Android Emulator: http://10.0.2.2:5050  (this points to your PC's localhost)
 * - Physical device on same Wi-Fi: replace with http://YOUR_PC_LAN_IP:5050
 */
const API_BASE =
  Platform.OS === "android"
    ? "http://10.0.2.2:5050"
    : "http://localhost:5050"; // iOS simulator can use localhost

export default function App() {
  const [prompt, setPrompt] = useState<string>("Say: Ashwood test OK.");
  const [output, setOutput] = useState<string>("");
  const [status, setStatus] = useState<string>("Idle");

  const runTest = async () => {
    try {
      setStatus("Calling backend…");
      setOutput("");
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`HTTP ${res.status} ${res.statusText} :: ${JSON.stringify(err)}`);
      }
      const json = await res.json();
      setOutput(json.output ?? "");
      setStatus("Done");
    } catch (e: any) {
      setStatus("Error");
      setOutput(String(e?.message || e));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b1220" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: "white", fontSize: 24, fontWeight: "700", marginBottom: 8 }}>
          Ashwood & Co — OpenAI Test
        </Text>
        <Text style={{ color: "#9bb5ff", marginBottom: 16 }}>
          Calls the local Express proxy (no API key in the app).
        </Text>

        <View style={{ backgroundColor: "#121a2b", borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <Text style={{ color: "#b8c7ff", marginBottom: 6 }}>Prompt</Text>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Type a prompt…"
            placeholderTextColor="#6b7280"
            style={{
              color: "white",
              backgroundColor: "#0f172a",
              borderRadius: 8,
              padding: 12
            }}
            multiline
          />
          <View style={{ height: 12 }} />
          <Button title="Run OpenAI Test" onPress={runTest} />
        </View>

        <View style={{ backgroundColor: "#121a2b", borderRadius: 12, padding: 12 }}>
          <Text style={{ color: "#b8c7ff", marginBottom: 6 }}>Status</Text>
          <Text style={{ color: "white", marginBottom: 12 }}>{status}</Text>
          <Text style={{ color: "#b8c7ff", marginBottom: 6 }}>Output</Text>
          <Text style={{ color: "white" }}>{output}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
