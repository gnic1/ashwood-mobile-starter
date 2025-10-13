import { useState } from "react";
import { SafeAreaView, Text, Pressable, ActivityIndicator, View, ScrollView } from "react-native";
import { Link } from "expo-router";
import { testOpenAI, testChat } from "../src/lib/openai";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<string>) => {
    if (loading) return;
    setLoading(true); setError(null); setResult(null);
    try { setResult(await fn()); } catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
          Ashwood & Co (GAME)
        </Text>
        <Text style={{ color: "#bbb", marginBottom: 16 }}>Prototype — Sprint 1</Text>

        <Link href="/new" style={{ color: "#22c55e", fontSize: 16, marginBottom: 12 }}>? New Game</Link>
        <Link href="/board" style={{ color: "#60a5fa", fontSize: 16, marginBottom: 24 }}>? Continue</Link>

        <Text style={{ color: "#9ca3af", marginBottom: 8 }}>Dev checks (via proxy)</Text>
        <Pressable onPress={() => run(testOpenAI)} style={{ backgroundColor: "#1f2937", padding: 12, borderRadius: 12, alignItems: "center", marginBottom: 8 }}>
          <Text style={{ color: "#fff" }}>{loading ? "Testing..." : "Test OpenAI (prompt)"}</Text>
        </Pressable>
        <Pressable onPress={() => run(testChat)} style={{ backgroundColor: "#334155", padding: 12, borderRadius: 12, alignItems: "center" }}>
          <Text style={{ color: "#fff" }}>{loading ? "Testing..." : "Test Chat (messages)"}</Text>
        </Pressable>

        <View style={{ height: 12 }} />
        {loading && <ActivityIndicator />}
        {error && <View style={{ marginTop: 12, backgroundColor: "#7f1d1d", padding: 12, borderRadius: 12 }}><Text style={{ color: "#fff" }}>Error: {error}</Text></View>}
        {result && <View style={{ marginTop: 12, backgroundColor: "#064e3b", padding: 12, borderRadius: 12 }}><Text style={{ color: "#fff" }}>{result}</Text></View>}
      </ScrollView>
    </SafeAreaView>
  );
}

function pickText(x:any){
  try {
    return x?.toString ? x.toString() : JSON.stringify(x, null, 2);
  } catch { return JSON.stringify(x, null, 2); }
}

