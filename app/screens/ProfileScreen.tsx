import React from "react";
import { View, Text, StyleSheet } from "react-native";
import CandleBackground from "../components/CandleBackground";
import Header from "../components/Header";

export default function ProfileScreen() {
  return (
    <CandleBackground>
      <Header title="Player Profile" />
      <View style={styles.card}>
        <Text style={styles.text}>Name: (coming soon)</Text>
        <Text style={styles.text}>Badges: (coming soon)</Text>
        <Text style={styles.text}>Statistics: (coming soon)</Text>
      </View>
    </CandleBackground>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    padding: 16,
  },
  text: { color: "#e8e2d0", marginBottom: 8 },
});
