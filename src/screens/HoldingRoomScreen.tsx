import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Animated } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getSessionStatus, fetchCharacters, type Character } from "../lib/api";
import AButton from "../components/AButton";

type RootStackParamList = {
  Join: undefined;
  GMLanding: { code: string };
  CharacterSelect: { code: string };
  HoldingRoom: { code: string; playerName: string };
};

type Props = NativeStackScreenProps<RootStackParamList, "HoldingRoom">;

export default function HoldingRoomScreen({ route, navigation }: Props) {
  const code = route.params?.code;
  const playerName = route.params?.playerName;

  const [chars, setChars] = useState<Character[]>([]);
  const [status, setStatus] = useState<{ state: string; selectionEndsAt: number | null } | null>(null);

  // Fire + rain + lightning simple ambience
  const fire = useRef(new Animated.Value(0.6)).current;
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    Animated.loop(
      Animated.sequence([
        Animated.timing(fire, { toValue: 0.9, duration: 800, useNativeDriver: false }),
        Animated.timing(fire, { toValue: 0.5, duration: 900, useNativeDriver: false }),
      ])
    ).start();

    const thunderLoop = () => {
      if (!alive) return;
      const delay = 4000 + Math.random() * 6000;
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(flash, { toValue: 0.9, duration: 80, useNativeDriver: false }),
          Animated.timing(flash, { toValue: 0, duration: 250, useNativeDriver: false }),
        ]).start(() => thunderLoop());
      }, delay);
    };
    thunderLoop();

    return () => { alive = false; };
  }, []);

  // Poll status every 3s
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await getSessionStatus(code);
        if (!alive) return;
        setStatus({ state: s.state, selectionEndsAt: s.selectionEndsAt });
        const c = await fetchCharacters(code);
        if (!alive) return;
        setChars(c);
        // TODO: when backend transitions to in_game, navigate next
        if (s.state === "in_game") {
          // navigation.replace("NextScreen", { code, playerName })
        }
      } catch {}
    };
    tick();
    const h = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(h); };
  }, [code]);

  const me = useMemo(() => {
    const mine = chars.find(ch => ch.claimedBy === playerName);
    return mine || null;
  }, [chars, playerName]);

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D0F" }}>
      {/* lightning overlay */}
      <Animated.View pointerEvents="none" style={{ position: "absolute", top:0, left:0, right:0, bottom:0, backgroundColor: "#9ec7ff", opacity: flash }} />

      {/* den layout */}
      <View style={{ flex: 1, flexDirection: "row", padding: 16 }}>
        {/* left: character poses (stacked cards) */}
        <View style={{ flex: 2, paddingRight: 8 }}>
          <Text style={{ color: "#EDE9E3", fontSize: 20, marginBottom: 8 }}>Guests Assembled</Text>
          {chars.map(ch => (
            <View key={ch.id} style={{ backgroundColor: "#1A1A1D", borderColor: "#2B2A2F", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 }}>
              <Text style={{ color: "#EDE9E3", fontWeight: "600" }}>{ch.name}</Text>
              <Text style={{ color: "#876B34" }}>{ch.role}</Text>
              {ch.claimedBy && (
                <Text style={{ color: "#B8B3AD", marginTop: 4 }}>
                  Played by {ch.claimedBy === playerName ? "You" : ch.claimedBy}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* right: fireplace + window */}
        <View style={{ flex: 3, paddingLeft: 8 }}>
          {/* window with rain */}
          <View style={{ height: 160, backgroundColor: "#11141a", borderColor: "#2B2A2F", borderWidth: 1, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
            {/* simple rain lines */}
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.2 }}>
              {[...Array(30)].map((_, i) => (
                <View key={i} style={{ position: "absolute", width: 1, height: 30 + (i%5)*6, backgroundColor: "#9ec7ff", left: (i*10)%300, top: (i*7)%160, transform: [{ rotate: "15deg"}] }} />
              ))}
            </View>
            <Text style={{ color: "#B8B3AD", padding: 8 }}>Rain patters against the window…</Text>
          </View>

          {/* fireplace */}
          <Animated.View style={{ height: 140, backgroundColor: "#6b2d12", borderColor: "#2B2A2F", borderWidth: 1, borderRadius: 12, padding: 12, opacity: fire }}>
            <Text style={{ color: "#EDE9E3" }}>A roaring fireplace warms the den.</Text>
          </Animated.View>

          {/* your selection */}
          <View style={{ marginTop: 12, backgroundColor: "#1A1A1D", borderColor: "#2B2A2F", borderWidth: 1, borderRadius: 12, padding: 12 }}>
            <Text style={{ color: "#EDE9E3", fontSize: 18, marginBottom: 6 }}>You Are</Text>
            {me ? (
              <>
                <Text style={{ color: "#EDE9E3", fontWeight: "600" }}>{me.name}</Text>
                <Text style={{ color: "#876B34" }}>{me.role}</Text>
                {/* buffs visible, debuffs hidden until next screen */}
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: "#6F6B66", marginBottom: 6 }}>Attributes (Buffs)</Text>
                  {me.buffs?.map((b, i) => (
                    <Text key={i} style={{ color: "#EDE9E3" }}>• {b}</Text>
                  ))}
                </View>
              </>
            ) : (
              <Text style={{ color: "#B8B3AD" }}>Waiting for your selection…</Text>
            )}
          </View>

          <AButton
            title="Ready"
            onPress={() => {/* NOP for now; next phase advances GM state to in_game */}}
            style={{ marginTop: 12 }}
          />
        </View>
      </View>
    </View>
  );
}
