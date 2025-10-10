import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../utils/theme';
import useGameStore from '../store/game';

type Archetype = {
  role: string;
  trait: string;
  linked: string[];
};

const archetypes: Archetype[] = [
  { role: 'Reclusive Heir',         trait: 'Family Historian',     linked: ['Medium', 'Archivist'] },
  { role: 'Disgraced Medium',       trait: 'Whispers from the Veil', linked: ['Doctor', 'Groundskeeper’s Child'] },
  { role: 'War-Torn Doctor',        trait: 'Clinical Insight',     linked: ['Medium', 'Archivist'] },
  { role: 'Curious Archivist',      trait: 'Cryptic Scholar',      linked: ['Heir', 'Doctor'] },
  { role: 'Groundskeeper’s Child',  trait: 'House Sense',          linked: ['Medium', 'Thief'] },
  { role: 'Gentle Thief',           trait: 'Locks & Misdirection', linked: ['Groundskeeper’s Child'] },
];

const MAX_PLAYERS = 6;

export default function CharacterSelect() {
  const nav = useNavigation<any>();
  const addPlayer = useGameStore((s) => s.addPlayer);
  const players = useGameStore((s) => s.players);

  // Seed a single AI companion if none exist
  useEffect(() => {
    const hasAI = players.some((p: any) => p?.id === 'ai');
    if (!hasAI) {
      addPlayer({
        id: 'ai',
        name: 'AI Companion',
        role: 'Stoic Scholar',
        trait: 'Helpful',
        isGhost: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // seed once

  const playerCount = players.length;
  const isFull = useMemo(() => playerCount >= MAX_PLAYERS, [playerCount]);

  const choose = (item: Archetype) => {
    if (isFull) {
      Alert.alert('Room is full', `This room already has ${MAX_PLAYERS} players.`);
      return;
    }
    const id = String(Date.now());
    addPlayer({ id, name: 'You', role: item.role, trait: item.trait });
    nav.navigate('InGamePlayer');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Select Your Character · ({playerCount} of {MAX_PLAYERS} players)
      </Text>

      <FlatList
        data={archetypes}
        keyExtractor={(item) => item.role}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Choose ${item.role}`}
            onPress={() => choose(item)}
            android_ripple={{ color: '#222' }}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <Text style={styles.role}>{item.role}</Text>
            <Text style={styles.row}>
              Trait: <Text style={styles.value}>{item.trait}</Text>
            </Text>
            <Text style={styles.row}>
              Linked: <Text style={styles.value}>{item.linked.join(', ')}</Text>
            </Text>
          </Pressable>
        )}
        ListFooterComponent={<View style={{ height: spacing(6) }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing(3) },
  header: { color: colors.text, fontSize: 18, marginBottom: spacing(2) },
  listContent: { gap: spacing(2) },

  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing(2),
  },
  cardPressed: { opacity: 0.9 },
  role: { color: colors.text, fontSize: 16, marginBottom: spacing(1) },
  row: { color: colors.subtext },
  value: { color: colors.text },
});
