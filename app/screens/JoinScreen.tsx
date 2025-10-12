import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import ButtonPrimary from "../components/ButtonPrimary";
import CandleBackground from "../components/CandleBackground";
import Header from "../components/Header";
import { createSession, joinSession } from "../services/gameSession";

type Props = NativeStackScreenProps<RootStackParamList, "Join">;

export default function JoinScreen({ navigation }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const onCreate = () => {
    const s = createSession();
    Alert.alert("Session Created", `Share this code: ${s.code}`);
    navigation.navigate("CharacterSelect", { sessionCode: s.code });
  };

  const onJoin = () => {
    if (!code || !name) {
      Alert.alert("Missing info", "Enter session code and your name.");
      return;
    }
    const res = joinSession(code.toUpperCase(), name.trim());
    if (!res.ok) {
      Alert.alert("Not found", "No session with that code. Try creating one?");
      return;
    }
    navigation.navigate("CharacterSelect", { sessionCode: code.toUpperCase() });
  };

  return (
    <CandleBackground>
      <Header title="Join or Create a Session" />
      <View style={styles.block}>
        <Text style={styles.label}>Your Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="R. Blake"
          placeholderTextColor="#6f6a58"
          style={styles.input}
        />
      </View>
      <View style={styles.block}>
        <Text style={styles.label}>Session Code</Text>
        <TextInput
          autoCapitalize="characters"
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^A-Za-z0-9]/g, "").toUpperCase())}
          placeholder="ABCDE"
          placeholderTextColor="#6f6a58"
          style={styles.input}
          maxLength={6}
        />
      </View>
      <View style={styles.row}>
        <ButtonPrimary title="Create New" onPress={onCreate} style={{ marginRight: 12 }} />
        <ButtonPrimary title="Join" onPress={onJoin} />
      </View>
    </CandleBackground>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 18 },
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
  row: { flexDirection: "row", marginTop: 12 },
});
