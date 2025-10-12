import React from "react";
import { View, StyleSheet } from "react-native";

export default function CandleBackground({ children }: { children: React.ReactNode }) {
  return <View style={styles.bg}>{children}</View>;
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    padding: 20,
    backgroundColor: "#121212",
  },
});
