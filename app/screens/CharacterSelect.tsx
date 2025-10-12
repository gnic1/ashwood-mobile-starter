import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import CandleBackground from "../components/CandleBackground";
import Header from "../components/Header";
import ButtonPrimary from "../components/ButtonPrimary";

type Props = NativeStackScreenProps<RootStackParamList, "CharacterSelect">;

const CHARACTERS = [
  { id: "sleuth", name: "The Sleuth" },
  { id: "occultist", name: "The Occultist" },
  { id: "detective", name: "The Detective" },
  { id: "poet", name: "The Poet" },
];

export default function CharacterSelect({ navigation, route }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const sessionCode = route.params?.sessionCode;

  return (
    <CandleBackground>
      <Header title={`Choose Your Role ${sessionCode ? "• " + sessionCode : ""}`} />
      <FlatList
        data={CHARACTERS}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelected(item.id)}
            style={[styles.card, selected === item.id && styles.cardActive]}
          >
            <Text style={styles.cardText}>{item.name}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
      <ButtonPrimary
        title={selected ? "Enter the Estate" : "Select a Character"}
        disabled={!selected}
        onPress={() => navigation.navigate("Game", { sessionCode, characterId: selected! })}
      />
    </CandleBackground>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardActive: {
    borderColor: "#bfa76f",
  },
  cardText: {
    color: "#e8e2d0",
    fontSize: 16,
    fontWeight: "600",
  },
});
