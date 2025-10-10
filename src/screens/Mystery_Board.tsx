import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../utils/theme';

type Tile = { id: string; name: string };

const RAW_TILES = [
  'Entry Hall',
  'Library',
  'Parlor',
  'Dining Room',
  'Cellar Door',
  'Servants’ Quarters',
];

export default function MysteryBoard() {
  const nav = useNavigation<any>();
  const tiles: Tile[] = useMemo(
    () => RAW_TILES.map((name) => ({ id: name, name })),
    []
  );
  const [selected, setSelected] = useState<string | null>(null);

  const onToggle = (tile: Tile) => {
    setSelected((prev) => (prev === tile.id ? null : tile.id));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mystery Board</Text>

      <FlatList
        data={tiles}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing(10) }}
        columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: spacing(1) }}
        renderItem={({ item }) => {
          const isSelected = selected === item.id;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Tile ${item.name}`}
              onPress={() => onToggle(item)}
              android_ripple={{ color: '#222' }}
              style={({ pressed }) => [
                styles.tile,
                isSelected && styles.tileSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.tileTxt}>{item.name}</Text>
            </Pressable>
          );
        }}
        ListFooterComponent={
          selected ? (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>{selected}</Text>
              <Text style={styles.detailRow}>Pins: 0 · Clues: 0 (placeholder)</Text>
              <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(1) }}>
                <Pressable
                  style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                  android_ripple={{ color: '#222' }}
                  onPress={() => {}}
                >
                  <Text style={styles.actionTxt}>Add Pin</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                  android_ripple={{ color: '#222' }}
                  onPress={() => {}}
                >
                  <Text style={styles.actionTxt}>Add Clue</Text>
                </Pressable>
              </View>
            </View>
          ) : <View />
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Return to scene"
        onPress={() => nav.goBack()}
        android_ripple={{ color: '#222' }}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Text style={styles.backTxt}>Return to Scene</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing(3) },
  header: { color: colors.text, fontSize: 18, marginBottom: spacing(2) },

  tile: {
    width: '48%',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing(2),
  },
  tileSelected: {
    borderColor: colors.primary,
  },
  tileTxt: { color: colors.text },

  detailCard: {
    marginTop: spacing(2),
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing(2),
  },
  detailTitle: { color: colors.text, fontSize: 16, marginBottom: spacing(0.5) },
  detailRow: { color: colors.subtext },

  action: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionTxt: { color: colors.text },

  back: {
    position: 'absolute',
    bottom: spacing(2),
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.bg,
  },
  backTxt: { color: colors.primary },
  pressed: { opacity: 0.85 },
});
