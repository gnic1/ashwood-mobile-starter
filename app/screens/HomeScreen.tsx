import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import ButtonPrimary from "../components/ButtonPrimary";
import CandleBackground from "../components/CandleBackground";
import Header from "../components/Header";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  return (
    <CandleBackground>
      <Header title="Welcome to Ashwood & Co." />
      <View style={styles.block}>
        <Text style={styles.lead}>
          A cooperative mystery in a haunted estate. Create a session or join one to begin.
        </Text>
      </View>
      <View style={styles.row}>
        <ButtonPrimary title="Join / Create" onPress={() => navigation.navigate("Join")} style={{ marginRight: 12 }} />
        <ButtonPrimary title="Profile" onPress={() => navigation.navigate("Profile")} />
      </View>
    </CandleBackground>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 24 },
  lead: { color: "#cfc7ae", fontSize: 16, lineHeight: 22 },
  row: { flexDirection: "row" },
});
