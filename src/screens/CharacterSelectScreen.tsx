import React, { useEffect, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { fetchCharacters, type Character } from "../lib/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import AButton from "../components/AButton";

type RootStackParamList = {
  Join: undefined;
  GMLanding: { code: string };
  CharacterSelect: { code: string };
};

type Props = NativeStackScreenProps<RootStackParamList, "CharacterSelect">;

export default function CharacterSelectScreen({ route /* , navigation */ }: Props) {
  const code = route.params?.code;
  const [loading, setLoading] = useState(true);
  const [chars, setChars] = useState<Character[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchCharacters(code);
        if (mounted) setChars(list);
      } catch {
        // TODO: navigation.replace("Join")
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [code]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0F", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#EDE9E3", marginTop: 12 }}>Fetching characters…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D0F", padding: 16 }}>
      <Text style={{ color: "#EDE9E3", fontSize: 24, marginBottom: 12, textAlign: "center" }}>
        Choose Your Character
      </Text>

      <FlatList
        data={chars}
        keyExtractor={(c) => c.id}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#1A1A1D",
              borderColor: "#2B2A2F",
              borderWidth: 1,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <Text style={{ color: "#EDE9E3", fontSize: 18, fontWeight: "600" }}>{item.name}</Text>
            <Text style={{ color: "#876B34", marginTop: 2 }}>{item.role}</Text>
            <Text style={{ color: "#B8B3AD", marginTop: 8, lineHeight: 20 }}>{item.blurb}</Text>

            <AButton
              title="Select"
              onPress={() => {
                // NEXT: POST claim, then navigate to Lobby/Board
                // navigation.navigate("Lobby", { code, characterId: item.id });
              }}
              style={{ marginTop: 12 }}
            />
          </View>
        )}
      />
    </View>
  );
}
