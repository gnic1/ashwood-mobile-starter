import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../utils/theme';
import useGameStore from '../store/game';
import { reviewFreeform } from '../services/ai/openai';

export default function InGamePlayer() {
  const nav = useNavigation<any>();
  const room = useGameStore((s) => s.roomName);
  const round = useGameStore((s) => s.round);

  // queue helpers
  const enqueueAction = useGameStore((s) => s.enqueueAction);
  const approveAction = useGameStore((s) => s.approveAction);
  const rejectAction = useGameStore((s) => s.rejectAction);

  // player context
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);
  const players = useGameStore((s) => s.players);

  const [showNotes, setShowNotes] = useState(false);
  const [freeform, setFreeform] = useState('');
  const [tone, setTone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tones = ['Cautious', 'Bold', 'Deceptive', 'Spiritual'] as const;
  const choices = [
    'Inspect the piano',
    'Examine the portrait',
    'Call out into the darkness',
  ];

  const onSubmitFreeform = async () => {
    const text = freeform.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    try {
      // 1) AI review (safe, quick) — if no key/proxy, it returns a permissive default
      const verdict = await reviewFreeform({ text, tone });

      // 2) Enqueue for GM/record
      const playerId = currentPlayerId ?? 'local';
      const playerName =
        players.find((p) => p.id === currentPlayerId)?.name || 'You';

      const actionId = enqueueAction({
        playerId,
        playerName,
        summary: text,
        tone,
      });

      // 3) Auto-mark based on AI verdict (GM can still see status in queue)
      if (verdict.approved) {
        approveAction(actionId);
        Alert.alert('Submitted', 'Approved by narrator assistant.');
      } else {
        rejectAction(actionId);
        Alert.alert('Submitted', 'Flagged for GM review.');
      }

      setFreeform('');
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  const onChooseOption = (label: string) => {
    // Optional: enqueue scripted actions as pending (uncomment below if you want GM to see these too)
    // const playerId = currentPlayerId ?? 'local';
    // const playerName = players.find((p) => p.id === currentPlayerId)?.name || 'You';
    // enqueueAction({ playerId, playerName, summary: label, tone });
    nav.navigate('DialogueChoice');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.topTxt}>{room}</Text>
          <Text style={styles.topTxt}>Round {round}</Text>
          <Text style={styles.turn}>It’s Your Turn</Text>
        </View>

        {/* Scene panel */}
        <View style={styles.scene}>
          <Text style={styles.sceneTxt}>
            A chill runs down your spine. The piano in the parlor plays three
            discordant notes.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.boardBtn, pressed && styles.pressed]}
            android_ripple={{ color: '#222' }}
            onPress={() => nav.navigate('MysteryBoard')}
          >
            <Text style={styles.boardTxt}>View Mystery Board</Text>
          </Pressable>
        </View>

        {/* Tone chips */}
        <View style={styles.actions}>
          <Text style={styles.section}>Choose your tone:</Text>
          <View style={styles.row}>
            {tones.map((t) => {
              const selected = tone === t;
              return (
                <Pressable
                  key={t}
                  accessibilityRole="button"
                  accessibilityLabel={`Tone ${t}`}
                  onPress={() => setTone(selected ? null : t)}
                  android_ripple={{ color: '#222' }}
                  style={({ pressed }) => [
                    styles.pill,
                    selected && styles.pillSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[styles.pillTxt, selected && styles.pillTxtSelected]}
                  >
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Scripted options */}
          <Text style={styles.section}>Options:</Text>
          <View style={{ gap: spacing(1) }}>
            {choices.map((label) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => onChooseOption(label)}
                android_ripple={{ color: '#222' }}
                style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
              >
                <Text style={styles.choiceTxt}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Freeform */}
          <Text style={[styles.section, { marginTop: spacing(2) }]}>
            Freeform (GM approval):
          </Text>
          <TextInput
            value={freeform}
            onChangeText={setFreeform}
            placeholder="Describe your action..."
            placeholderTextColor={colors.subtext}
            style={styles.input}
            multiline
            returnKeyType="send"
            onSubmitEditing={onSubmitFreeform}
            editable={!submitting}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit freeform action"
            onPress={onSubmitFreeform}
            disabled={!freeform.trim() || submitting}
            android_ripple={{ color: '#222' }}
            style={({ pressed }) => [
              styles.submit,
              (!freeform.trim() || submitting) && styles.submitDisabled,
              pressed && styles.pressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.submitTxt}>Submit</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* Bottom Tabs */}
      <View style={styles.bottom}>
        <Pressable
          style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          android_ripple={{ color: '#222' }}
          onPress={() => setShowNotes(true)}
        >
          <Text style={styles.tabTxt}>Notes</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          android_ripple={{ color: '#222' }}
          onPress={() => Alert.alert('Clues', 'Clues coming soon.')}
        >
          <Text style={styles.tabTxt}>Clues</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          android_ripple={{ color: '#222' }}
          onPress={() => Alert.alert('Chat', 'Party chat coming soon.')}
        >
          <Text style={styles.tabTxt}>Chat</Text>
        </Pressable>
      </View>

      {/* Notes modal */}
      <Modal visible={showNotes} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.section}>Notes</Text>
            <Text style={styles.notesHint}>
              Your private notes appear here. (Background blurs in real app.)
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.choice,
                pressed && styles.pressed,
                { marginTop: spacing(2) },
              ]}
              android_ripple={{ color: '#222' }}
              onPress={() => setShowNotes(false)}
            >
              <Text style={styles.choiceTxt}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing(3), paddingBottom: spacing(12) },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topTxt: { color: colors.text },
  turn: { color: colors.primary },

  scene: {
    marginTop: spacing(3),
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2),
    gap: spacing(2),
  },
  sceneTxt: { color: colors.text },
  boardBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  boardTxt: { color: colors.primary },

  actions: { marginTop: spacing(3) },
  section: { color: colors.text, fontSize: 16, marginBottom: spacing(1) },
  row: { flexDirection: 'row', gap: spacing(1), flexWrap: 'wrap' },

  pill: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillTxt: { color: colors.text },
  pillTxtSelected: { color: '#0b0b0d', fontWeight: 'bold' },

  choice: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(1.5),
    borderRadius: 8,
  },
  choiceTxt: { color: colors.text },

  input: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    borderRadius: 8,
    padding: spacing(1.25),
    minHeight: 48,
  },

  submit: {
    marginTop: spacing(1.5),
    backgroundColor: colors.primary,
    padding: spacing(1.5),
    borderRadius: 8,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitTxt: { color: '#0b0b0d', fontWeight: 'bold' },

  pressed: { opacity: 0.85 },

  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing(2),
    flexDirection: 'row',
    gap: spacing(1),
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  tab: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tabTxt: { color: colors.text },

  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(3),
  },
  modalCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing(3),
    width: '100%',
  },
  notesHint: { color: colors.subtext, marginTop: spacing(1) },
});
