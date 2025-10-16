import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Alert } from "react-native";
import { fetchCharacters, claimCharacter, type Character } from "../lib/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import AButton from "../components/AButton";

type RootStackParamList = {
  Join: undefined;
  GMLanding: { code: string };
  CharacterSelect: { code: string };
};

type Props = NativeStackScreenProps<RootStackParamList, "CharacterSelect">;

export default function CharacterSelectScreen({ route }: Props) {
  const code = route.params?.code;
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [chars, setChars] = useState<Character[]>([]);
  const [myCharacterId, setMyCharacterId] = useState<string | null>(null);

  // Simple temp player name; replace with real profile later (Roku will prompt per selection too)
  const playerName = useMemo(() => `Player-${Math.floor(Date.now()/1000)}`, []);

  const refresh = async () => {
    const list = await fetchCharacters(code);
    setChars(list);
    // if we previously claimed, keep it marked locally
    if (myCharacterId) {
      const me = list.find(c => c.claimedBy === playerName);
      setMyCharacterId(me?.id || myCharacterId);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchCharacters(code);
        if (!mounted) return;
        setChars(list);
        const me = list.find(c => c.claimedBy === playerName);
        setMyCharacterId(me?.id || null);
      } catch (e: any) {
        Alert.alert("Error", e?.message || "Could not fetch characters.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [code]);

  const confirmThenClaim = (characterId: string, characterName: string) => {
    Alert.alert(
      "Confirm Selection",
      "The Ambrose Family warns you, your character selection is final. There is no going back.",
      [
        { text: "Go Back", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: () => onClaim(characterId, characterName),
        },
      ]
    );
  };

  const onClaim = async (characterId: string, characterName: string) => {
    try {
      setClaimingId(characterId);
      const list = await claimCharacter(code, characterId, playerName);
      setChars(list);
      const me = list.find(c => c.id === characterId);
      if (me?.claimedBy === playerName) {
        setMyCharacterId(characterId);
        Alert.alert("Claimed", `You are now ${characterName}.`);
      }
    } catch (e: any) {
      Alert.alert("Could not claim", e?.message || "Please try again.");
    } finally {
      setClaimingId(null);
    }
  };

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
        renderItem={({ item }) => {
          const iOwnThis = item.claimedBy === playerName || item.id === myCharacterId;
          const iAlreadyHaveOne = Boolean(myCharacterId) && !iOwnThis;
          const disabled = iAlreadyHaveOne || (!item.available && !iOwnThis);

          return (
            <View
              style={{
                backgroundColor: "#1A1A1D",
                borderColor: iOwnThis ? "#5FAEB0" : "#2B2A2F",
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {/* Played by */}
              {item.claimedBy && (
                <Text style={{ color: "#B8B3AD", marginBottom: 6 }}>
                  Played by {item.claimedBy === playerName ? "You" : item.claimedBy}
                </Text>
              )}

              <Text style={{ color: "#EDE9E3", fontSize: 18, fontWeight: "600" }}>{item.name}</Text>
              <Text style={{ color: "#876B34", marginTop: 2 }}>
                {item.role}{iOwnThis ? " • (You)" : ""}
              </Text>
              <Text style={{ color: "#B8B3AD", marginTop: 8, lineHeight: 20 }}>{item.blurb}</Text>

              {/* Buffs visible on this screen */}
              {item.buffs?.length ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={{ color: "#6F6B66", marginBottom: 6 }}>Attributes (Buffs)</Text>
                  {item.buffs.map((b, idx) => (
                    <Text key={idx} style={{ color: "#EDE9E3", marginBottom: 2 }}>• {b}</Text>
                  ))}
                </View>
              ) : null}

              {/* Debuffs intentionally hidden until next screen */}

              <AButton
                title={
                  iOwnThis
                    ? "Selected"
                    : (!item.available && !iOwnThis ? `Claimed by ${item.claimedBy}` : "Select")
                }
                onPress={() => confirmThenClaim(item.id, item.name)}
                disabled={disabled}
                loading={claimingId === item.id}
                style={{ marginTop: 12 }}
              />
            </View>
          );
        }}
        ListFooterComponent={<View style={{ height: 20 }} />}
      />
    </View>
  );
}
