import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing } from '../utils/theme';

type QueueItem = {
  id: string;
  player: string;
  summary: string;
  tone?: string | null;
};

export default function GMControl() {
  const { width } = useWindowDimensions();
  const isWide = width >= 720; // simple responsive switch

  // Seed a few placeholder requests; in Phase C we’ll feed this from AI/players.
  const seeded = useMemo<QueueItem[]>(
    () => [
      { id: 'q1', player: 'You',          summary: 'Inspect the piano',                 tone: 'Cautious'  },
      { id: 'q2', player: 'AI Companion', summary: 'Call out into the darkness',        tone: 'Spiritual' },
      { id: 'q3', player: 'Heir',         summary: 'Examine the portrait',              tone: 'Bold'      },
    ],
    []
  );

  const [queue, setQueue] = useState<QueueItem[]>(seeded);

  const onApprove = (item: QueueItem) => {
    setQueue((q) => q.filter((x) => x.id !== item.id));
    Alert.alert('Approved', `Action accepted:\n${item.player}: ${item.summary}`);
  };

  const onReject = (item: QueueItem) => {
    setQueue((q) => q.filter((x) => x.id !== item.id));
    Alert.alert('Rejected', `Action rejected:\n${item.player}: ${item.summary}`);
  };

  const onGhostEvent = () => {
    Alert.alert('Ghost Event', 'A sudden chill sweeps the room… a door slams upstairs.');
  };

  const onRevealClue = () => {
    Alert.alert('Clue Revealed', 'A faded ledger page hints at a debt unpaid.');
  };

  const onLockRoom = () => {
    Alert.alert('Room Locked', 'The Cellar Door is now sealed—no entry.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>GM Control</Text>

      <View style={[styles.row, { flexDirection: isWide ? 'row' : 'column' }]}>
        {/* Live Board (placeholder) */}
        <View style={[styles.panel, isWide ? {} : { marginBottom: spacing(2) }]}>
          <Text style={styles.sub}>Live Board (preview)</Text>
          <View style={styles.board}>
            <Text style={styles.boardTxt}>Board state preview coming soon…</Text>
          </View>
        </View>

        {/* Controls + Queue */}
        <View style={styles.panel}>
          <Text style={styles.sub}>Controls</Text>

          <View style={styles.controlsRow}>
            <Pressable
              onPress={onGhostEvent}
              android_ripple={{ color: '#222' }}
              style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
            >
              <Text style={styles.btnTxt}>Trigger Ghost Event</Text>
            </Pressable>

            <Pressable
              onPress={onRevealClue}
              android_ripple={{ color: '#222' }}
              style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
            >
              <Text style={styles.btnTxt}>Reveal Clue</Text>
            </Pressable>

            <Pressable
              onPress={onLockRoom}
              android_ripple={{ color: '#222' }}
              style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
            >
              <Text style={styles.btnTxt}>Lock Room</Text>
            </Pressable>
          </View>

          <Text style={[styles.sub, { marginTop: spacing(2) }]}>
            Pending Player Actions
          </Text>

          <FlatList
            data={queue}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.empty}>No pending actions.</Text>}
            contentContainerStyle={{ gap: spacing(1) }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {item.player} · {item.tone || '—'}
                </Text>
                <Text style={styles.cardTxt}>{item.summary}</Text>

                <View style={styles.cardBtns}>
                  <Pressable
                    onPress={() => onApprove(item)}
                    android_ripple={{ color: '#222' }}
                    style={({ pressed }) => [
                      styles.smallBtn,
                      styles.approve,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.smallBtnTxtDark}>Approve</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => onReject(item)}
                    android_ripple={{ color: '#222' }}
                    style={({ pressed }) => [
                      styles.smallBtn,
                      styles.reject,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.smallBtnTxt}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing(3) },
  header: { color: colors.text, fontSize: 18, marginBottom: spacing(2) },

  row: { gap: spacing(2) },

  panel: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing(2),
    gap: spacing(1),
  },

  sub: { color: colors.subtext, marginBottom: spacing(1) },

  // Board preview
  board: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    backgroundColor: '#111116',
  },
  boardTxt: { color: colors.subtext },

  // Controls
  controlsRow: { gap: spacing(1) },

  btn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.5),
    alignItems: 'center',
  },
  btnTxt: { color: '#0b0b0d', fontWeight: 'bold' },
  pressed: { opacity: 0.85 },

  // Queue
  empty: { color: colors.subtext, fontStyle: 'italic' },

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

  cardBtns: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(1),
  },
  smallBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  approve: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reject: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  smallBtnTxtDark: { color: '#0b0b0d', fontWeight: 'bold' },
  smallBtnTxt: { color: colors.text },
});
