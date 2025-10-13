import React, { useEffect, useMemo, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useGame } from "../src/state/gameState";
import { loadStory, Scene, embellishWithAI } from "../src/lib/story";
import { getSessionId, pollDirectives } from "../src/lib/sessions";

export default function Dialogue() {
  const router = useRouter();
  const { state, dispatch } = useGame();
  const [story, setStory] = useState<{ scenesById: Record<string, Scene> } | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = await loadStory();
      const map: Record<string, Scene> = {};
      (s.scenes ?? []).forEach(sc => map[sc.id] = sc);
      setStory({ scenesById: map });
    })();
  }, []);

  const current = useMemo(() => story?.scenesById[state.sceneId ?? ""] ?? null, [story, state.sceneId]);

  const choose = (choice: any) => {
    if (choice.effects?.length) dispatch({ type: "APPLY", effects: choice.effects });
    dispatch({ type: "GOTO", sceneId: choice.nextSceneId });
    setAiText(null);
  };

  const runAI = async () => {
    if (!current) return;
    setLoadingAI(true);
    try {
      const out = await embellishWithAI(current.text);
      setAiText(String(out).trim());
    } catch (e: any) {
      setAiText(`(AI error) ${e?.message ?? e}`);
    } finally {
      setLoadingAI(false);
    }
  };

  // --- Sprint 2: poll directives every 3s ---
  useEffect(() => {
    let timer: any;
    (async function loop() {
      const sid = await getSessionId();
      if (!sid) { timer = setTimeout(loop, 3000); return; }
      try {
        const { directives } = await pollDirectives(sid);
        for (const d of directives) {
          if (d.type === "scene" && d.payload?.sceneId) {
            dispatch({ type: "GOTO", sceneId: d.payload.sceneId });
            setBanner(`GM set scene ? ${d.payload.sceneId}`);
            setAiText(null);
          } else if (d.type === "narration" && d.payload?.text) {
            setBanner(d.payload.text);
          } else if (d.type === "sfx" && d.payload?.id) {
            // Placeholder SFX handler
            console.log("SFX:", d.payload.id);
            setBanner(`SFX: ${d.payload.id}`);
          }
        }
      } catch (e) {
        console.log("Poll error:", e);
      } finally {
        timer = setTimeout(loop, 3000);
      }
    })();
    return () => { if (timer) clearTimeout(timer); };
  }, [dispatch]);

  if (!current) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ color: "#9ca3af", marginTop: 8 }}>Loading...</Text>
      </View>
    );
  }

  const atEnd = (current.choices?.length ?? 0) === 0;

  return (
    <>
      <Stack.Screen options={{ title: current.title }} />
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          {banner && (
            <View style={{ backgroundColor: "#1e3a8a", padding: 10, borderRadius: 10, marginBottom: 8 }}>
              <Text style={{ color: "#fff" }}>{banner}</Text>
            </View>
          )}

          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>{current.title}</Text>
          <Text style={{ color: "#d1d5db", marginTop: 8 }}>{aiText ?? current.text}</Text>

          <Pressable onPress={runAI} disabled={loadingAI} style={{ marginTop: 10, backgroundColor: "#334155", padding: 10, borderRadius: 10, alignItems: "center" }}>
            <Text style={{ color: "#fff" }}>{loadingAI ? "Summoning…" : "Embellish with AI"}</Text>
          </Pressable>

          <View style={{ height: 12 }} />

          {current.choices?.map((c, i) => (
            <Pressable key={i} onPress={() => choose(c)}
              style={{ backgroundColor: "#1f2937", padding: 14, borderRadius: 12, alignItems: "center", marginBottom: 8 }}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>{c.label}</Text>
            </Pressable>
          ))}

          {atEnd && (
            <Pressable onPress={() => router.replace("/new")}
              style={{ marginTop: 12, backgroundColor: "#16a34a", padding: 14, borderRadius: 12, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Restart</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </>
  );
}
