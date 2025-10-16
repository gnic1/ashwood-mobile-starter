import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from "react-native";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
};

export default function AButton({ title, onPress, loading, disabled, style, textStyle, accessibilityLabel }: Props) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          backgroundColor: disabled || loading ? "#3A393F" : "#876B34",
          padding: 14,
          borderRadius: 10,
          alignItems: "center",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text style={[{ color: "#EDE9E3", fontSize: 16, fontWeight: "600" }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
