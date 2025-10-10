import React from 'react';
import { View, Text, Pressable, StyleSheet, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../utils/theme';
import Candle from '../components/Candle';

export default function AshwoodMain() {
  const nav = useNavigation<any>();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.title}>Ashwood & Co.</Text>
        <View style={styles.candleWrap}>
          <Candle />
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Join a game"
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          android_ripple={{ color: '#222' }}
          onPress={() => nav.navigate('JoinFlow')}
        >
          <Text style={styles.btnTxt}>Join Game</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create game (enhanced) coming soon"
          style={({ pressed }) => [
            styles.btn,
            styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
          android_ripple={{ color: '#222' }}
          disabled
          onPress={() => {}}
        >
          <Text style={[styles.btnTxt, styles.btnTxtDisabled]}>
            Create Game (Enhanced)
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open my profile"
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          android_ripple={{ color: '#222' }}
          onPress={() => nav.navigate('PlayerProfile')}
        >
          <Text style={styles.btnTxt}>My Profile</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open creator toolkit"
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          android_ripple={{ color: '#222' }}
          onPress={() => nav.navigate('CreatorToolkit')}
        >
          <Text style={styles.btnTxt}>Creator (Starter)</Text>
        </Pressable>
      </View>

      {/* Floating News */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="News"
        style={({ pressed }) => [styles.news, pressed && styles.newsPressed]}
        android_ripple={{ color: '#222' }}
        onPress={() => Alert.alert('News', 'Updates coming soon.')}
      >
        <Text style={styles.newsTxt}>News</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing(3) },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(4),
  },
  icon: { width: 40, height: 40, marginRight: 8 },
  candleWrap: { marginLeft: 8 },
  title: { color: colors.text, fontSize: 24, letterSpacing: 1 },
  menu: { marginTop: spacing(6), gap: spacing(2) },

  btn: {
    backgroundColor: colors.panel,
    padding: spacing(2),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  btnPressed: { opacity: 0.8 },
  btnDisabled: { opacity: 0.7 },
  btnTxt: { color: colors.text, fontSize: 16 },
  btnTxtDisabled: { opacity: 0.6 },

  news: {
    position: 'absolute',
    right: spacing(2),
    bottom: spacing(2),
    padding: spacing(1.5),
    borderRadius: 999,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  newsPressed: { opacity: 0.85 },
  newsTxt: { color: colors.text, fontSize: 12 },
});
