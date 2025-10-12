import { useState } from "react";
import { Text, Pressable, ActivityIndicator, View, ScrollView } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { testOpenAI, testChat } from "../src/lib/openai";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taps, setTaps] = useState(0);

  const run = async (fn: () => Promise<string>) => {
    if (loading) return;
    setTaps((t) => t + 1);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const msg = await fn();
      setResult(msg);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const Button = ({ title, onPress, dim }: { title: string; onPress: () => void; dim?: boolean }) => (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: dim ? "#334155" : "#1f2937",
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 14,
        alignItems: "center",
        marginBottom: 10,
        opacity: loading ? 0.7 : 1
      }}
      disabled={loading}
    >
      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
        {loading ? "Working..." : title}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
            Ashwood & Co (GAME)
          </Text>
          <Text style={{ color: "#bbb", fontSize: 16, marginBottom: 8 }}>
            Dev checks via secure proxy. Taps: {taps}
          </Text>

          <Button title="Test OpenAI (prompt)" onPress={() => run(testOpenAI)} />
          <Button title="Test Chat (messages)" onPress={() => run(testChat)} dim />

          <View style={{ height: 16 }} />

          {loading && <ActivityIndicator />}

          {error && (
            <View style={{ marginTop: 12, backgroundColor: "#7f1d1d", padding: 12, borderRadius: 12 }}>
              <Text style={{ color: "#fff" }}>Error: {error}</Text>
            </View>
          )}

          {result && (
            <View style={{ marginTop: 12, backgroundColor: "#064e3b", padding: 12, borderRadius: 12 }}>
              <Text style={{ color: "#fff" }}>{result}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
