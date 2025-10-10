import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { colors, spacing } from '../utils/theme';

type Scene = {
  id: string;
  title: string;
  summary: string;
};

export default function CreatorToolkit() {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([
    {
      id: 'seed-1',
      title: 'Prologue: The Will',
      summary: 'Solicitor’s office, rain on the window. The Ashwood estate changes hands.',
    },
  ]);

  const canSave = title.trim().length > 0 && summary.trim().length > 0;

  const onAdd = () => {
    if (!canSave) return;
    const id = String(Date.now());
    setScenes((prev) => [{ id, title: title.trim(), summary: summary.trim() }, ...prev]);
    setTitle('');
    setSummary('');
  };

  const onExport = () => {
    // placeholder: later we’ll package to JSON and write to FS or share
    Alert.alert('Export', 'Your creator data will export here (soon).');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing(6), gap: spacing(3) }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.header}>Creator (Starter)</Text>

      {/* Editor */}
      <View style={styles.panel}>
        <Text style={styles.label}>Scene Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., The Parlor at Dusk"
          placeholderTextColor={colors.subtext}
          style={styles.input}
          returnKeyType="next"
        />
        <Text style={[styles.label, { marginTop: spacing(1) }]}>Summary</Text>
        <TextInput
          value={summary}
          onChangeText={setSummary}
          placeholder="One-sentence prompt for the scene..."
          placeholderTextColor={colors.subtext}
          style={[styles.input, styles.multiline]}
          multiline
        />

        <View style={{ flexDirection: 'row', gap: spacing(1), marginTop: spacing(2) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add scene"
            onPress={onAdd}
            disabled={!canSave}
            android_ripple={{ color: '#222' }}
            style={({ pressed }) => [
              styles.primaryBtn,
              !canSave && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryTxt}>Add</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Export creator data"
            onPress={onExport}
            android_ripple={{ color: '#222' }}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryTxt}>Export</Text>
          </Pressable>
        </View>
      </View>

      {/* Scene list */}
      <View style={styles.panel}>
        <Text style={styles.sub}>Scenes</Text>
        <View style={{ gap: spacing(1) }}>
          {scenes.map((s) => (
            <View key={s.id} style={styles.card}>
              <Text style={styles.cardTitle}>{s.title}</Text>
              <Text style={styles.cardTxt}>{s.summary}</Text>
            </View>
          ))}
          {scenes.length === 0 && (
            <Text style={styles.empty}>No scenes yet. Add one above.</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing(3) },
  header: { color: colors.text, fontSize: 18 },

  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing(2),
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
    marginTop: spacing(0.5),
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },

  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.5),
    alignItems: 'center',
  },
  primaryTxt: { color: '#0b0b0d', fontWeight: 'bold' },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryTxt: { color: colors.text },

  card: {
    backgroundColor: '#15151b',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing(1.5),
    gap: spacing(0.5),
  },
  cardTitle: { color: colors.text, fontWeight: '600' },
  cardTxt: { color: colors.text },
  empty: { color: colors.subtext, fontStyle: 'italic' },

  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
});
