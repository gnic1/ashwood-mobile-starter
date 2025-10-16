import React, { useState } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { validateSession } from "../lib/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import AButton from "../components/AButton";

type RootStackParamList = {
  Join: undefined;
  GMLanding: { code: string };
  CharacterSelect: { code: string };
};

type Props = NativeStackScreenProps<RootStackParamList, "Join">;

export default function JoinScreen({ navigation }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const onJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert("Enter Code", "Please enter a game code (e.g., ASH-72QK).");
      return;
    }
    try {
      setLoading(true);
      await validateSession(trimmed);
      navigation.replace("GMLanding", { code: trimmed });
    } catch (err: any) {
      Alert.alert("Not Found", err?.message || "Session not found.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D0F", padding: 20, justifyContent: "center" }}>
      <Text style={{ color: "#EDE9E3", fontSize: 28, marginBottom: 16, textAlign: "center" }}>
        Join a Game
      </Text>

      <Text style={{ color: "#B8B3AD", marginBottom: 8 }}>Enter Code (e.g., ASH-72QK)</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="ASH-72QK"
        placeholderTextColor="#6F6B66"
        style={{
          backgroundColor: "#1A1A1D",
          color: "#EDE9E3",
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#2B2A2F",
          marginBottom: 16,
        }}
      />

      <AButton title="Join" onPress={onJoin} loading={loading} />
    </View>
  );
}
