import React from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GameProvider } from "../src/state/gameState";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <Stack />
      </GameProvider>
    </SafeAreaProvider>
  );
}
