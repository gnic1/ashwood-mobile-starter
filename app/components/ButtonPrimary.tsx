import React from "react";
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent, ViewStyle } from "react-native";

type Props = {
  title: string;
  onPress?: (e: GestureResponderEvent) => void;
  style?: ViewStyle;
  disabled?: boolean;
};

export default function ButtonPrimary({ title, onPress, style, disabled }: Props) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, disabled ? styles.disabled : null, style]}
      activeOpacity={0.8}
    >
      <Text style={styles.label}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: "#bfa76f",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#121212",
    fontWeight: "600",
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
});
