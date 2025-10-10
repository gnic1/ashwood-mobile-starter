import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing } from '../utils/theme';
import useGameStore from '../store/game';

export default function JoinFlow() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const setGameCode = useGameStore((s) => s.setGameCode);

  const [code, setCode] = useState<string>('ASH-72QK');

  // Accept deep link param: ashwood://join/ABC123
  useEffect(() => {
    const incoming = route?.params?.code;
    if (incoming && typeof incoming === 'string') {
      setCode(incoming.toUpperCase());
    }
  }, [route?.params?.code]);

  const onChangeCode = (txt: string) => {
    // Uppercase, allow A–Z, 0–9, and "-"
    const clean = txt.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setCode(clean);
  };

  const onJoin = () => {
    if (!code?.trim()) return;
    setGameCode(code.trim());
    nav.navigate('CharacterSelect');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.modal}>
        <Text style={styles.header}>Join a Game</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Game Code"
          placeholderTextColor={colors.subtext}
          value={code}
          onChangeText={onChangeCode}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={onJoin}
          accessibilityLabel="Enter game code"
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Join game"
          style={({ pressed }) => [
            styles.btn,
            !code?.trim() && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
          android_ripple={{ color: '#222' }}
          disabled={!code?.trim()}
          onPress={onJoin}
        >
          <Text style={styles.btnTxt}>Join</Text>
        </Pressable>

        <Text style={styles.helpTxt}>or Scan QR (placeholder)</Text>
      </View>

      {/* GM Landing Preview */}
      <ImageBackground
        source={require('../../assets/splash.png')}
        style={styles.landing}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <View style={styles.card}>
          <Text style={styles.title}>The Founding of Ashwood & Co.</Text>
          <Text style={styles.desc}>
            Victorian England, 1888. A will, a pact, and a house that breathes.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enter lobby"
            style={({ pressed }) => [styles.enter, pressed && styles.btnPressed]}
            android_ripple={{ color: '#222' }}
            onPress={onJoin}
          >
            <Text style={styles.enterTxt}>Enter Lobby</Text>
          </Pressable>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing(3) },

  modal: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing(3),
  },

  header: { color: colors.text, fontSize: 20, marginBottom: spacing(2) },

  input: {
    backgroundColor: '#1a1a1f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing(1.5),
  },

  btn: {
    marginTop: spacing(2),
    backgroundColor: colors.primary,
    padding: spacing(1.5),
    borderRadius: 8,
    alignItems: 'center',
  },
  btnTxt: { color: '#0b0b0d', fontWeight: 'bold' },
  btnDisabled: { opacity: 0.6 },
  btnPressed: { opacity: 0.85 },

  helpTxt: {
    color: colors.subtext,
    textAlign: 'center',
    marginTop: spacing(2),
  },

  landing: {
    flex: 1,
    marginTop: spacing(3),
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },

  card: { backgroundColor: 'rgba(18,18,22,0.9)', padding: spacing(3) },
  title: { color: colors.text, fontSize: 18, marginBottom: spacing(1) },
  desc: { color: colors.subtext, marginBottom: spacing(2) },

  enter: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing(1.25),
    alignItems: 'center',
  },
  enterTxt: { color: '#0b0b0d', fontWeight: 'bold' },
});
