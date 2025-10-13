import React, { useState } from "react";
import { Stack, useRouter } from "expo-router";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useGame } from "../src/state/gameState";
import { loadStory } from "../src/lib/story";
import { createSession } from "../src/lib/sessions";

export default function New() {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const { dispatch } = useGame();
  const router = useRouter();

  const start = async () => {
    setLoading(true);
    try {
      const story = await loadStory();
      dispatch({ type: "INIT", story });
      const s = await createSession();
      setCode(s.code);
      router.replace("/board");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "New Game" }} />
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 8 }}>
            New Game
          </Text>
          <Text style={{ color: "#bbb", marginBottom: 16 }}>
            Begin the prologue and create a GM-controllable session.
          </Text>
          <Pressable onPress={start} disabled={loading} style={{ backgroundColor: "#1f2937", padding: 14, borderRadius: 12, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>{loading ? "Starting..." : "Start"}</Text>
          </Pressable>
          {code && <Text style={{ color: "#a7f3d0", marginTop: 12 }}>Join Code: {code}</Text>}
          {loading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
        </ScrollView>
      </View>
    </>
  );
}
