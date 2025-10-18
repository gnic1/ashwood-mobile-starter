import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, FlatList, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "http://10.0.2.2:8787";

// --- tiny fetch helper with good errors ---
async function api(path, opts) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // not JSON (avoid blowing up)
  }
  if (!res.ok || json?.ok === false) {
    const msg =
      json?.error?.message ||
      (res.status === 404 ? "Session not found" :
       res.status === 409 ? "Session is closed" :
       `Request failed (HTTP ${res.status})`);
    throw new Error(msg);
  }
  return json?.data ?? json;
}

const CODE_RE = /^[A-HJ-KMNP-Z2-9]{5}$/i; // excludes I, L, O, 0, 1 for clarity

function HomeScreen({ navigation }) {
  const [name, setName] = useState("GM");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  const onCreate = async () => {
    setErr("");
    try {
      const data = await api("/create-session", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() || "GM" }),
      });
      navigation.navigate("Lobby", {
        code: data.code,
        playerId: data.players[0].id,
        isGM: true,
      });
    } catch (e) {
      setErr(String(e.message || e));
    }
  };

  const onJoin = async () => {
    setErr("");
    const cleaned = code.trim().toUpperCase();
    if (!CODE_RE.test(cleaned)) {
      setErr("Enter a valid 5-character code (A–Z, 2–9).");
      return;
    }
    if (!name.trim()) {
      setErr("Please enter your display name.");
      return;
    }
    try {
      const data = await api("/join-session", {
        method: "POST",
        body: JSON.stringify({ code: cleaned, name: name.trim() }),
      });
      navigation.navigate("Lobby", {
        code: data.session.code,
        playerId: data.player.id,
        isGM: false,
      });
    } catch (e) {
      setErr(String(e.message || e));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Ashwood & Co. — Lobby</Text>

      {!!err && (
        <View style={{ backgroundColor: "#fee2e2", borderColor: "#fca5a5", borderWidth: 1, padding: 8, borderRadius: 6 }}>
          <Text style={{ color: "#991b1b" }}>{err}</Text>
        </View>
      )}

      <Text style={{ marginTop: 8 }}>Your Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Enter your display name"
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />

      <View style={{ height: 8 }} />
      <Button title="Create Game (GM)" onPress={onCreate} />

      <View style={{ height: 16 }} />
      <Text>Join by Code</Text>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        placeholder="ABCDE"
        autoCapitalize="characters"
        maxLength={5}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8, letterSpacing: 4 }}
      />
      <View style={{ height: 8 }} />
      <Button title="Join Game" onPress={onJoin} />
    </SafeAreaView>
  );
}

function Badge({ text, bg = "#e5e7eb", color = "#111827" }) {
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginLeft: 6 }}>
      <Text style={{ color, fontSize: 12, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

function Row({ children }) {
  return <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: "#eee" }}>{children}</View>;
}

function LobbyScreen({ route, navigation }) {
  const { code, playerId, isGM } = route.params;
  const [session, setSession] = useState(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
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
    try {
      await api(`/lobby/${code}/ready`, {
        method: "POST",
        body: JSON.stringify({ playerId, ready }),
      });
      load();
    } catch (e) {
      setErr(String(e.message || e));
    }
  };

  const leave = async () => {
    try {
      await api(`/lobby/${code}/leave`, {
        method: "POST",
        body: JSON.stringify({ playerId }),
      });
      navigation.popToTop();
    } catch (e) {
      setErr(String(e.message || e));
    }
  };

  const gmReset = async () => {
    try {
      await api(`/lobby/${code}/reset`, { method: "POST" });
      load();
    } catch (e) {
      setErr(String(e.message || e));
    }
  };
  const gmClose = async () => {
    try {
      await api(`/lobby/${code}/close`, { method: "POST" });
      load();
    } catch (e) {
      setErr(String(e.message || e));
    }
  };
  const gmReopen = async () => {
    try {
      await api(`/lobby/${code}/reopen`, { method: "POST" });
      load();
    } catch (e) {
      setErr(String(e.message || e));
    }
  };

  const copyCode = async () => {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      Alert.alert("Copy Failed", "Could not copy the code to clipboard.");
    }
  };

  const me = session?.players?.find?.((p) => p.id === playerId);

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>Lobby: {code}</Text>
        <TouchableOpacity onPress={copyCode} style={{ paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderRadius: 8 }}>
          <Text>{copied ? "Copied!" : "Copy Code"}</Text>
        </TouchableOpacity>
      </View>

      {!!err && (
        <View style={{ marginTop: 8, backgroundColor: "#fee2e2", borderColor: "#fca5a5", borderWidth: 1, padding: 8, borderRadius: 6 }}>
          <Text style={{ color: "#991b1b" }}>{err}</Text>
        </View>
      )}

      <View style={{ height: 10 }} />
      <Text>Status: {session?.status ?? "…"}</Text>
      <Text>Players: {session?.players?.length ?? 0}</Text>

      <View style={{ height: 10 }} />
      <FlatList
        data={session?.players ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isYou = item.id === playerId;
          const isGm = item.role === "gm";
          return (
            <Row>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontWeight: "700" }}>{item.name}</Text>
                  {isYou && <Badge text="YOU" bg="#dbeafe" color="#1e3a8a" />}
                  {isGm && <Badge text="GM" bg="#fef9c3" color="#854d0e" />}
                </View>
                <Text style={{ fontSize: 16 }}>{item.ready ? "✅ Ready" : "⏳ Not Ready"}</Text>
              </View>
            </Row>
          );
        }}
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
