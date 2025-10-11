import { useState } from "react";
import { SafeAreaView, Text, Pressable, ActivityIndicator, View, ScrollView } from "react-native";
import { testOpenAI } from "../src/lib/openai";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const msg = await testOpenAI();
      setResult(msg);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
          Ashwood & Co (GAME)
        </Text>
        <Text style={{ color: "#bbb", fontSize: 16, marginBottom: 24 }}>
          Tap below to verify OpenAI connectivity (dev-only).
        </Text>

        <Pressable
          onPress={runTest}
          style={{
            backgroundColor: "#1f2937",
            paddingVertical: 14,
            paddingHorizontal: 18,
            borderRadius: 14,
            alignItems: "center",
            opacity: loading ? 0.7 : 1
          }}
          disabled={loading}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            {loading ? "Testing..." : "Test OpenAI"}
          </Text>
        </Pressable>

        <View style={{ height: 16 }} />

        {loading && <ActivityIndicator />}

        {error && (
          <View style={{ marginTop: 12, backgroundColor: "#7f1d1d", padding: 12, borderRadius: 12 }}>
            <Text style={{ color: "#fff" }}>Error: {error}</Text>
          </View>
        )}

        {result && (
          <View style={{ marginTop: 12, backgroundColor: "#064e3b", padding: 12, borderRadius: 12 }}>
            <Text style={{ color: "#fff" }}>OpenAI says: {result}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
