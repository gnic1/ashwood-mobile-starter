import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Button, FlatList, SafeAreaView, Text, TextInput, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// -------- API helper --------
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "http://10.0.2.2:8787";
async function api(path, opts) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    const msg = json?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json.data ?? json;
}

function HomeScreen({ navigation }) {
  const [name, setName] = useState("GM");
  const [code, setCode] = useState("");

  const onCreate = async () => {
    const data = await api("/create-session", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    navigation.navigate("Lobby", { code: data.code, playerId: data.players[0].id, isGM: true });
  };

  const onJoin = async () => {
    const data = await api("/join-session", {
      method: "POST",
      body: JSON.stringify({ code: code.trim(), name }),
    });
    navigation.navigate("Lobby", { code: data.session.code, playerId: data.player.id, isGM: false });
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Ashwood & Co. — Lobby</Text>

      <Text style={{ marginTop: 12 }}>Your Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Enter your display name"
        style={{ borderWidth: 1, padding: 8, borderRadius: 6 }}
      />

      <View style={{ height: 8 }} />
      <Button title="Create Game (GM)" onPress={onCreate} />

      <View style={{ height: 16 }} />
      <Text>Join by Code</Text>
      <TextInput
        value={code}
        onChangeText={t => setCode(t.toUpperCase())}
        placeholder="ABCDE"
        autoCapitalize="characters"
        maxLength={5}
        style={{ borderWidth: 1, padding: 8, borderRadius: 6, letterSpacing: 4 }}
      />
      <View style={{ height: 8 }} />
      <Button title="Join Game" onPress={onJoin} />
    </SafeAreaView>
  );
}

function LobbyScreen({ route, navigation }) {
  const { code, playerId, isGM } = route.params;
  const [session, setSession] = useState(null);
  const [err, setErr] = useState("");
  const pollRef = useRef(null);

  const load = async () => {
    try {
      const data = await api(`/lobby/${code}`, { method: "GET" });
      setSession(data);
      setErr("");
    } catch (e) {
      setErr(String(e.message || e));
    }
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 2000);
    return () => clearInterval(pollRef.current);
  }, []);

  const setReady = async (ready) => {
    await api(`/lobby/${code}/ready`, {
      method: "POST",
      body: JSON.stringify({ playerId, ready }),
    });
    load();
  };

  const leave = async () => {
    await api(`/lobby/${code}/leave`, {
      method: "POST",
      body: JSON.stringify({ playerId }),
    });
    navigation.popToTop();
  };

  const gmReset = async () => {
    await api(`/lobby/${code}/reset`, { method: "POST" });
    load();
  };

  const gmClose = async () => {
    await api(`/lobby/${code}/close`, { method: "POST" });
    load();
  };

  const gmReopen = async () => {
    await api(`/lobby/${code}/reopen`, { method: "POST" });
    load();
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Lobby: {code}</Text>
      {!!err && <Text style={{ color: "red", marginTop: 6 }}>{err}</Text>}

      <View style={{ height: 10 }} />
      <Text>Status: {session?.status ?? "…"}</Text>
      <Text>Players: {session?.players?.length ?? 0}</Text>

      <View style={{ height: 10 }} />
      <FlatList
        data={session?.players ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: "#ddd" }}>
            <Text style={{ fontWeight: "600" }}>
              {item.name} {item.id === playerId ? "(You)" : ""} {item.role === "gm" ? "— GM" : ""}
            </Text>
            <Text>Ready: {item.ready ? "✅" : "❌"}</Text>
          </View>
        )}
      />

      <View style={{ height: 12 }} />

      <View style={{ flexDirection: "row", gap: 8, justifyContent: "space-between" }}>
        <Button title="I'm Ready" onPress={() => setReady(true)} />
        <Button title="Not Ready" onPress={() => setReady(false)} />
        <Button title="Leave" color="#a00" onPress={leave} />
      </View>

      {isGM && (
        <>
          <View style={{ height: 16 }} />
          <Text style={{ fontWeight: "700" }}>GM Controls</Text>
          <View style={{ flexDirection: "row", gap: 8, justifyContent: "space-between" }}>
            <Button title="Reset Lobby" onPress={gmReset} />
            <Button title="Close Lobby" onPress={gmClose} />
            <Button title="Reopen Lobby" onPress={gmReopen} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Ashwood & Co." }} />
        <Stack.Screen name="Lobby" component={LobbyScreen} options={{ title: "Lobby" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
