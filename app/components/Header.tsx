import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Header({ title }: { title: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  title: { color: "#e8e2d0", fontSize: 22, fontWeight: "700" },
  rule: { height: 2, backgroundColor: "#2a2a2a", marginTop: 8, borderRadius: 2 },
});
