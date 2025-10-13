import React, { useState } from "react";
import { Stack, useRouter } from "expo-router";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useGame } from "../src/state/gameState";
import { loadStory } from "../src/lib/story";

function NewInner() {
  const [loading, setLoading] = useState(false);
  const { dispatch } = useGame();
  const router = useRouter();

  const start = async () => {
    setLoading(true);
    try {
      const story = await loadStory();
      dispatch({ type: "INIT", story });
      router.replace("/board");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 8 }}>
        New Game
      </Text>
      <Text style={{ color: "#bbb", marginBottom: 16 }}>
        Begin the prologue of <Text style={{ fontWeight: "700" }}>Ashwood & Co.</Text>
      </Text>
      <Pressable onPress={start} disabled={loading} style={{ backgroundColor: "#1f2937", padding: 14, borderRadius: 12, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "600" }}>{loading ? "Starting..." : "Start"}</Text>
      </Pressable>
      {loading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
    </ScrollView>
  );
}

export default function New() {
  return (
    <>
      <Stack.Screen options={{ title: "New Game" }} />
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <NewInner />
      </View>
    </>
  );
}
