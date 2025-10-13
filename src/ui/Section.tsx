import React from "react";
import { View, Text } from "react-native";

export function Section({ title, children }: { title?: string; children?: React.ReactNode }) {
  return (
    <View style={{ marginVertical: 10 }}>
      {title ? <Text style={{ color: "#9ca3af", marginBottom: 6 }}>{title}</Text> : null}
      {children}
    </View>
  );
}
