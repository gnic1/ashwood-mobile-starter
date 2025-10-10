import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../utils/theme';
import useGameStore from '../store/game';
import { generateNarration } from '../services/ai/openai';

/** Typewriter that restarts when `lines` changes */
function useTypewriter(lines: string[], cps = 28) {
  const [lineIndex, setLineIndex] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [done, setDone] = useState(false);
  const timer = useRef<any>(null);

  const stop = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const currentLine = lines[lineIndex] || '';
  const visible = currentLine.slice(0, cursor);

  useEffect(() => {
    // restart on new input
    stop();
    setLineIndex(0);
    setCursor(0);
    setDone(false);

    // start ticking
    timer.current = setInterval(() => {
      setCursor((c) => {
        if (c < currentLine.length) return c + 1;

        // done with this line
        stop();
        setTimeout(() => {
          setLineIndex((i) => {
            const next = i + 1;
            if (next >= lines.length) {
              setDone(true);
              return i;
            }
            setCursor(0);
            // tick again for next line
            timer.current = setInterval(() => {
              setCursor((cc) => {
                const cur = lines[next] || '';
                if (cc < cur.length) return cc + 1;
                stop();
                return cc;
              });
            }, Math.max(10, Math.floor(1000 / cps)));
            return next;
          });
        }, 350);
        return c;
      });
    }, Math.max(10, Math.floor(1000 / cps)));

    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lines)]);

  const linesVisible = useMemo(() => {
    const prev = lines.slice(0, lineIndex);
    return [...prev, visible];
  }, [lines, lineIndex, visible]);

  const skipAll = () => {
    stop();
    // reveal everything instantly
    setLineIndex(lines.length - 1);
    setCursor(lines[lines.length - 1]?.length || 0);
    setDone(true);
  };

  const restart = () => {
    stop();
    setLineIndex(0);
    setCursor(0);
    setDone(false);
  };

  return { linesVisible, done, skipAll, restart };
}

export default function DialogueChoice() {
  const nav = useNavigation<any>();
  const roomName = useGameStore((s) => s.roomName);
  const round = useGameStore((s) => s.round);

  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<string[]>([
    'The parlor falls silent. Dust motes hang in the lantern’s breath.',
    'Somewhere beyond the wainscoting, a lock tumbles of its own accord.',
    'A draft carries the smell of old ink… and candle smoke.',
  ]);

  const fetchNarration = async () => {
    setLoading(true);
    try {
      const out = await generateNarration({
        roomName,
        round,
        tone: null,
        lastEvents: [],
      });

      // If the key is missing, our service returns a friendly bracketed message — fallback to seed lines
      if (!out || out.length === 0 || /^\[AI disabled/i.test(out[0])) {
        setLines([
          'Narrator offline (dev): using fallback lines.',
          'Set EXPO_PUBLIC_OPENAI_API_KEY in .env to enable live narration.',
          'Rain taps the window while the house listens.',
        ]);
      } else {
        setLines(out);
      }
    } catch (e: any) {
      setLines([
        'Narrator error: using fallback lines.',
        String(e?.message || e).slice(0, 120),
        'The corridor waits all the same.',
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // fetch on mount
    fetchNarration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, round]);

  const { linesVisible, done, skipAll, restart } = useTypewriter(lines, 28);

  const choices = useMemo(
    () => [
      'Follow the draft into the corridor',
      'Inspect the piano’s hidden panel',
      'Call out for anyone still here',
    ],
    []
  );

  const onChoose = (label: string) => {
    Alert.alert('Choice submitted', `You chose: ${label}`);
    nav.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Dialogue & Choices</Text>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing(2) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Narration box */}
        <View style={styles.box}>
          {loading ? (
            <View style={{ paddingVertical: spacing(2) }}>
              <ActivityIndicator />
              <Text style={[styles.narration, { marginTop: spacing(1) }]}>
                Weaving the next lines…
              </Text>
            </View>
          ) : (
            <>
              {linesVisible.map((line, i) => (
                <Text key={String(i)} style={styles.narration}>
                  {line}
                  {i === linesVisible.length - 1 && !done ? '▌' : ''}
                </Text>
              ))}

              <View style={styles.row}>
                {!done ? (
                  <Pressable
                    onPress={skipAll}
                    android_ripple={{ color: '#222' }}
                    style={({ pressed }) => [styles.smallBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.smallBtnTxt}>Skip</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={restart}
                      android_ripple={{ color: '#222' }}
                      style={({ pressed }) => [styles.smallBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.smallBtnTxt}>Replay</Text>
                    </Pressable>
                    <Pressable
                      onPress={fetchNarration}
                      android_ripple={{ color: '#222' }}
                      style={({ pressed }) => [styles.smallBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.smallBtnTxt}>Regenerate</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </>
          )}
        </View>

        {/* Choices box */}
        <View style={styles.box}>
          <Text style={styles.subheader}>Choices</Text>
          <View style={{ gap: spacing(1) }}>
            {choices.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={c}
                onPress={() => onChoose(c)}
                android_ripple={{ color: '#222' }}
                disabled={!done || loading}
                style={({ pressed }) => [
                  styles.choice,
                  (!done || loading) && styles.choiceDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.choiceTxt,
                    (!done || loading) && { opacity: 0.6 },
                  ]}
                >
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>
          {!done && !loading && (
            <Text style={styles.hint}>
              (Choices unlock after narration finishes or you tap "Skip".)
            </Text>
          )}
        </View>
      </ScrollView>

      <Pressable
        onPress={() => nav.goBack()}
        android_ripple={{ color: '#222' }}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Text style={styles.backTxt}>Back to Scene</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing(3) },
  header: { color: colors.text, fontSize: 18, marginBottom: spacing(2) },

  box: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing(2),
  },

  narration: { color: colors.text, lineHeight: 22 },

  subheader: {
    color: colors.text,
    fontSize: 16,
    marginBottom: spacing(1),
  },

  choice: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.5),
    borderRadius: 8,
  },
  choiceDisabled: { opacity: 0.85 },
  choiceTxt: { color: colors.text },

  hint: { color: colors.subtext, marginTop: spacing(1) },

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

  row: { flexDirection: 'row', gap: spacing(1), marginTop: spacing(1) },
  smallBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  smallBtnTxt: { color: colors.text, fontSize: 12 },
});
