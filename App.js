import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Button, FlatList, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "http://10.0.2.2:8787";

async function api(path, opts) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  if (!res.ok || json?.ok === false) {
    const msg =
      json?.error?.message ||
      (res.status === 404 ? "Session not found" :
       res.status === 409 ? "Session is not open" :
       res.status === 412 ? "All players must be ready" :
       `Request failed (HTTP ${res.status})`);
    throw new Error(msg);
  }
  return json?.data ?? json;
}

const CODE_RE = /^[A-HJ-KMNP-Z2-9]{5}$/i;

function Banner({ kind="error", text }) {
  if (!text) return null;
  const bg = kind === "error" ? "#fee2e2" : "#dcfce7";
  const bd = kind === "error" ? "#fca5a5" : "#86efac";
  const color = kind === "error" ? "#991b1b" : "#14532d";
  return (
    <View style={{ backgroundColor: bg, borderColor: bd, borderWidth: 1, padding: 8, borderRadius: 6, marginTop: 8 }}>
      <Text style={{ color }}>{text}</Text>
    </View>
  );
}

function HomeScreen({ navigation }) {
  const [name, setName] = useState("GM");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const onHealth = async () => {
    setErr(""); setInfo("");
    try {
      setBusy(true);
      const data = await api("/health", { method: "GET" });
      setInfo(`Connected to ${API_BASE} · ${new Date(data.time).toLocaleTimeString()}`);
    } catch (e) { setErr(String(e.message || e)); }
    finally { setBusy(false); }
  };

  const onCreate = async () => {
    setErr(""); setInfo("");
    try {
      setBusy(true);
      const data = await api("/create-session", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() || "GM" }),
      });
      navigation.navigate("Lobby", {
        code: data.code,
        playerId: data.players[0].id,
        isGM: true,
      });
    } catch (e) { setErr(String(e.message || e)); }
    finally { setBusy(false); }
  };

  const onJoin = async () => {
    setErr(""); setInfo("");
    const cleaned = code.trim().toUpperCase();
    if (!CODE_RE.test(cleaned)) { setErr("Enter a valid 5-character code (A–Z, 2–9)."); return; }
    if (!name.trim()) { setErr("Please enter your display name."); return; }
    try {
      setBusy(true);
      const data = await api("/join-session", {
        method: "POST",
        body: JSON.stringify({ code: cleaned, name: name.trim() }),
      });
      navigation.navigate("Lobby", {
        code: data.session.code,
        playerId: data.player.id,
        isGM: false,
      });
    } catch (e) { setErr(String(e.message || e)); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Ashwood & Co. — Lobby</Text>
      <Text style={{ color: "#6b7280" }}>API: {API_BASE}</Text>
      <Banner kind="error" text={err} />
      <Banner kind="info" text={info} />

      <Text style={{ marginTop: 8 }}>Your Name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Enter your display name" style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />

      <View style={{ height: 8 }} />
      <Button title={busy ? "Working..." : "Create Game (GM)"} onPress={onCreate} disabled={busy} />

      <View style={{ height: 16 }} />
      <Text>Join by Code</Text>
      <TextInput value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="ABCDE" autoCapitalize="characters" maxLength={5}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8, letterSpacing: 4 }} />
      <View style={{ height: 8 }} />
      <Button title={busy ? "Working..." : "Join Game"} onPress={onJoin} disabled={busy} />

      <View style={{ height: 16 }} />
      <TouchableOpacity onPress={onHealth} disabled={busy} style={{ padding: 8, borderWidth: 1, borderRadius: 8, alignSelf: "flex-start" }}>
        <Text>{busy ? "Checking..." : "Check Connection"}</Text>
      </TouchableOpacity>
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

function Row({ children }) { return <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: "#eee" }}>{children}</View>; }

function LobbyScreen({ route, navigation }) {
  const { code, playerId, isGM } = route.params;
  const [session, setSession] = useState(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  const load = async () => {
    try {
      const data = await api(`/lobby/${code}`, { method: "GET" });
      setSession(data); setErr("");
      if (data?.status === "in_progress") {
        navigation.replace("HoldingRoom", { code, playerId, isGM });
      }
    } catch (e) { setErr(String(e.message || e)); }
  };

  useEffect(() => {
    load();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(load, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const withBusy = (fn) => async (...args) => { try { setBusy(true); await fn(...args); } finally { setBusy(false); } };

  const setReady = withBusy(async (ready) => {
    await api(`/lobby/${code}/ready`, { method: "POST", body: JSON.stringify({ playerId, ready }) });
    load();
  });

  const leave = withBusy(async () => {
    await api(`/lobby/${code}/leave`, { method: "POST", body: JSON.stringify({ playerId }) });
    navigation.popToTop();
  });

  const gmReset  = withBusy(async () => { await api(`/lobby/${code}/reset`,  { method: "POST" }); load(); });
  const gmClose  = withBusy(async () => { await api(`/lobby/${code}/close`,  { method: "POST" }); load(); });
  const gmReopen = withBusy(async () => { await api(`/lobby/${code}/reopen`, { method: "POST" }); load(); });

  const startGame = withBusy(async () => {
    await api(`/lobby/${code}/start`, { method: "POST" });
    // load() will pick up the new status via polling, but we navigate immediately for snappier UX:
    navigation.replace("HoldingRoom", { code, playerId, isGM });
  });

  const copyCode = async () => {
    try { await Clipboard.setStringAsync(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { Alert.alert("Copy Failed", "Could not copy the code to clipboard."); }
  };

  const players = session?.players ?? [];
  const allReady = players.length > 0 && players.every(p => p.ready);

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>Lobby: {code}</Text>
        <TouchableOpacity onPress={copyCode} style={{ paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderRadius: 8 }}>
          <Text>{copied ? "Copied!" : "Copy Code"}</Text>
        </TouchableOpacity>
      </View>

      <Banner kind="error" text={err} />

      <View style={{ height: 10 }} />
      <Text>Status: {session?.status ?? "…"}</Text>
      <Text>Players: {players.length}</Text>

      <View style={{ height: 10 }} />
      <FlatList
        data={players}
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

      <View style={{ flexDirection: "row", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
        <Button title="I'm Ready" onPress={() => setReady(true)} disabled={busy} />
        <Button title="Not Ready" onPress={() => setReady(false)} disabled={busy} />
        {busy && <ActivityIndicator />}
        <Button title="Leave" color="#a00" onPress={leave} disabled={busy} />
      </View>

      {isGM && (
        <>
          <View style={{ height: 16 }} />
          <Text style={{ fontWeight: "700" }}>GM Controls</Text>
          <View style={{ flexDirection: "row", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
            <Button title="Reset" onPress={gmReset} disabled={busy} />
            <Button title="Close" onPress={gmClose} disabled={busy} />
            <Button title="Reopen" onPress={gmReopen} disabled={busy} />
          </View>

          <View style={{ height: 10 }} />
          <Button
            title={allReady ? "Start Game" : "Start Game (all players must be ready)"}
            onPress={startGame}
            disabled={!allReady || busy}
          />
        </>
      )}
    </SafeAreaView>
  );
}

function HoldingRoomScreen({ route }) {
  const { code } = route.params;
  return (
    <SafeAreaView style={{ flex: 1, padding: 16, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 26, fontWeight: "800", marginBottom: 8 }}>Holding Room</Text>
      <Text style={{ marginBottom: 12 }}>Session: {code}</Text>
      <Text style={{ color: "#6b7280", textAlign: "center" }}>
        Everyone is in. This is the staging area before the first scene.
        (Next step will wire character handoffs and the first room.)
      </Text>
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
        <Stack.Screen name="HoldingRoom" component={HoldingRoomScreen} options={{ title: "Holding Room" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
