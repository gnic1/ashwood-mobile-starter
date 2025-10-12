import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "react-native";
import HomeScreen from "./app/screens/HomeScreen";
import JoinScreen from "./app/screens/JoinScreen";
import CharacterSelect from "./app/screens/CharacterSelect";
import GameScreen from "./app/screens/GameScreen";
import ProfileScreen from "./app/screens/ProfileScreen";

// Gothic-ish dark theme with gold accents
const AshwoodTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#121212",
    card: "#1a1a1a",
    text: "#e8e2d0",
    primary: "#bfa76f",
    border: "#2a2a2a",
    notification: "#bfa76f",
  },
};

export type RootStackParamList = {
  Home: undefined;
  Join: undefined;
  CharacterSelect: { sessionCode?: string } | undefined;
  Game: { sessionCode?: string; characterId?: string } | undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const scheme = useColorScheme();

  return (
    <NavigationContainer theme={AshwoodTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: "#1a1a1a" },
          headerTintColor: "#e8e2d0",
          contentStyle: { backgroundColor: "#121212" },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Ashwood & Co." }} />
        <Stack.Screen name="Join" component={JoinScreen} options={{ title: "Join / Create" }} />
        <Stack.Screen name="CharacterSelect" component={CharacterSelect} options={{ title: "Character Select" }} />
        <Stack.Screen name="Game" component={GameScreen} options={{ title: "The Estate" }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
