import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";

import JoinScreen from "./src/screens/JoinScreen";
import GMLandingScreen from "./src/screens/GMLandingScreen";
import CharacterSelectScreen from "./src/screens/CharacterSelectScreen";

export type RootStackParamList = {
  Join: undefined;
  GMLanding: { code: string };
  CharacterSelect: { code: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: "#0D0D0F" },
  headerTintColor: "#EDE9E3",
  headerTitleStyle: { color: "#EDE9E3" },
  contentStyle: { backgroundColor: "#0D0D0F" },
};

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator initialRouteName="Join" screenOptions={screenOptions}>
        <Stack.Screen name="Join" component={JoinScreen} options={{ title: "Ashwood & Co." }} />
        <Stack.Screen name="GMLanding" component={GMLandingScreen} options={{ title: "Game Landing" }} />
        <Stack.Screen name="CharacterSelect" component={CharacterSelectScreen} options={{ title: "Character Select" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
