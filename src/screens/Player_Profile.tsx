import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { colors, spacing } from '../utils/theme';

type Badge = { name: string; count: number };

const initialBadges: Badge[] = [
  { name: 'Ashwood Initiate', count: 1 },
  { name: 'Perfect Game', count: 0 },
  { name: 'Beyond the Veil', count: 2 },
];

export default function PlayerProfile() {
  const [displayName, setDisplayName] = useState('You');
  const [badges, setBadges] = useState<Badge[]>(initialBadges);

  const onSaveName = () => {
    const val = displayName.trim();
    if (!val) return;
    Alert.alert('Saved', `Display name set to "${val}".`);
  };

  const addBadge = (name: string) => {
    setBadges((prev) =>
      prev.map((b) => (b.name === name ? { ...b, count: b.count + 1 } : b))
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing(4), gap: spacing(3) }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.header}>Player Profile</Text>

      {/* Identity card */}
      <View style={styles.card}>
        <View style={styles.avatar} />
        <View style={{ flex: 1, gap: spacing(1) }}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your display name"
            placeholderTextColor={colors.subtext}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={onSaveName}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save display name"
          onPress={onSaveName}
          android_ripple={{ color: '#222' }}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
        >
          <Text style={styles.saveTxt}>Save</Text>
        </Pressable>
      </View>

      {/* Badges */}
      <View style={styles.panel}>
        <Text style={styles.sub}>Badges</Text>
        <View style={styles.badges}>
          {badges.map((b) => (
            <View key={b.name} style={styles.badge}>
              {/* Counter (x#) bottom-left */}
              {b.count > 0 && (
                <View style={styles.counter}>
                  <Text style={styles.counterTxt}>x{b.count}</Text>
                </View>
              )}
              <Text style={styles.badgeTxt}>{b.name}</Text>
              {/* Quick-add to demo counter behavior (remove later) */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Increment ${b.name}`}
                onPress={() => addBadge(b.name)}
                android_ripple={{ color: '#222' }}
                style={({ pressed }) => [styles.bump, pressed && styles.pressed]}
              >
                <Text style={styles.bumpTxt}>＋</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>

      {/* Campaign Characters (placeholder) */}
      <View style={styles.panel}>
        <Text style={styles.sub}>Campaign Characters (coming soon)</Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderTxt}>
            You’ll see your unlocked / saved characters here.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const AVATAR_SIZE = 56;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing(3) },
  header: { color: colors.text, fontSize: 18 },

  // Identity
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { color: colors.subtext, fontSize: 12 },
  input: {
    backgroundColor: '#1a1a1f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.25),
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.5),
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  saveTxt: { color: '#0b0b0d', fontWeight: 'bold' },

  // Panel wrapper
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing(2),
  },
  sub: { color: colors.subtext, marginBottom: spacing(1) },

  // Badges
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  badge: {
    position: 'relative',
    backgroundColor: '#15151b',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  badgeTxt: { color: colors.text, fontSize: 12 },

  counter: {
    position: 'absolute',
    left: -6,
    bottom: -6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.bg,
  },
  counterTxt: { color: '#0b0b0d', fontWeight: 'bold', fontSize: 11 },

  bump: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bumpTxt: { color: colors.text, fontWeight: 'bold' },

  // Placeholder
  placeholder: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing(2),
    backgroundColor: '#111116',
  },
  placeholderTxt: { color: colors.subtext },

  // Misc
  pressed: { opacity: 0.85 },
});
