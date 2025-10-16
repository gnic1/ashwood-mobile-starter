import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { fetchSession, type SessionLite } from "../lib/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import AButton from "../components/AButton";

type RootStackParamList = {
  Join: undefined;
  GMLanding: { code: string };
  CharacterSelect: { code: string };
};

type Props = NativeStackScreenProps<RootStackParamList, "GMLanding">;

export default function GMLandingScreen({ route, navigation }: Props) {
  const code = route.params?.code;
  const [session, setSession] = useState<SessionLite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchSession(code);
        if (mounted) setSession(data);
      } catch {
        if (mounted) navigation.replace("Join");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [code]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0F", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color="#EDE9E3" />
        <Text style={{ color: "#B8B3AD", marginTop: 12 }}>Loading game…</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0F", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ color: "#EDE9E3", marginBottom: 16 }}>Session not found.</Text>
        <AButton title="Back to Join" onPress={() => navigation.replace("Join")} />
      </View>
    );
  }

  const tag = session.isEnhanced ? "ENHANCED" : "BASIC";

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D0F", padding: 20 }}>
      <Text style={{ color: "#EDE9E3", fontSize: 32, textAlign: "center", marginBottom: 6 }}>
        {session.logo} {session.title}
      </Text>
      <Text style={{ color: "#876B34", textAlign: "center", marginBottom: 12 }}>{tag}</Text>

      <View
        style={{
          height: 160,
          backgroundColor: "#151518",
          borderWidth: 1,
          borderColor: "#2B2A2F",
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "#B8B3AD" }}>Background: {session.background}</Text>
      </View>

      <Text style={{ color: "#B8B3AD", marginBottom: 16, lineHeight: 22 }}>{session.description}</Text>

      <Text style={{ color: "#6F6B66", marginBottom: 4 }}>Game Code</Text>
      <View
        style={{
          backgroundColor: "#1A1A1D",
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#2B2A2F",
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "#EDE9E3", fontSize: 16 }}>{session.code}</Text>
      </View>

      <Text style={{ color: "#6F6B66", marginBottom: 4 }}>Game Master</Text>
      <View
        style={{
          backgroundColor: "#1A1A1D",
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#2B2A2F",
          marginBottom: 24,
        }}
      >
        <Text style={{ color: "#EDE9E3" }}>{session.gmName}</Text>
      </View>

      <AButton
        title="Enter Lobby"
        onPress={() => navigation.navigate("CharacterSelect", { code: session.code })}
      />

      <Text
        onPress={() => navigation.replace("Join")}
        style={{ color: "#B8B3AD", textAlign: "center", marginTop: 14 }}
      >
        Use a different code
      </Text>
    </View>
  );
}
