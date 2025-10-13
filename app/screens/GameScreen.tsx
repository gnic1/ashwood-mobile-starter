import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Keyboard } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import CandleBackground from "../components/CandleBackground";
import Header from "../components/Header";
import ButtonPrimary from "../components/ButtonPrimary";
import { getNarration } from "../../src/services/aiNarrator";

type Props = NativeStackScreenProps<RootStackParamList, "Game">;

export default function GameScreen({ route }: Props) {
  const { sessionCode, characterId } = route.params ?? {};
  const [story, setStory] = useState<string>("(A hush falls as you cross the threshold...)");
  const [choice, setChoice] = useState<string>("");

  const onNarrate = async () => {
    Keyboard.dismiss();
    const text = await getNarration("opening", choice || undefined);
    setStory(text);
    setChoice("");
  };

  return (
    <CandleBackground>
      <Header title={`Ashwood Estate ${sessionCode ? "• " + sessionCode : ""}`} />
      <View style={styles.storyBox}>
        <Text style={styles.storyText}>{story}</Text>
      </View>

      <Text style={styles.label}>What do you do?</Text>
      <TextInput
        value={choice}
        onChangeText={setChoice}
        placeholder="Ex: Open the study door carefully..."
        placeholderTextColor="#6f6a58"
        style={styles.input}
      />
      <ButtonPrimary title="Submit Choice" onPress={onNarrate} style={{ marginTop: 12 }} />
    </CandleBackground>
  );
}

const styles = StyleSheet.create({
  storyBox: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    minHeight: 140,
  },
  storyText: { color: "#e8e2d0", lineHeight: 22, fontSize: 16 },
  label: { color: "#cfc7ae", marginBottom: 8, fontWeight: "600" },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#e8e2d0",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});

