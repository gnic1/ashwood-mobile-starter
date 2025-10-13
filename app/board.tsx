import React, { useEffect, useMemo, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useGame } from "../src/state/gameState";
import { loadStory, Scene } from "../src/lib/story";

export default function Board() {
  const router = useRouter();
  const { state } = useGame();
  const [story, setStory] = useState<{ scenesById: Record<string, Scene> } | null>(null);

  useEffect(() => {
    (async () => {
      const s = await loadStory();
      const map: Record<string, Scene> = {};
      (s.scenes ?? []).forEach(sc => map[sc.id] = sc);
      setStory({ scenesById: map });
    })();
  }, []);

  const current = useMemo(() => story?.scenesById[state.sceneId ?? ""] ?? null, [story, state.sceneId]);

  return (
    <>
      <Stack.Screen options={{ title: "Board" }} />
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>Mystery Board</Text>
          <Text style={{ color: "#9ca3af", marginTop: 6 }}>
            Scene: <Text style={{ color: "#fff" }}>{current?.title ?? "-"}</Text>
          </Text>

          <Pressable onPress={() => router.push("/dialogue")}
            style={{ marginTop: 16, backgroundColor: "#1f2937", padding: 14, borderRadius: 12, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>Continue</Text>
          </Pressable>
        </ScrollView>
      </View>
    </>
  );
}
