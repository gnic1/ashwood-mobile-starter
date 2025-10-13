import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { Effect, Story } from "../lib/story";

type State = {
  sceneId: string | null;
  flags: Record<string, boolean>;
  score: number;
  storyId: string | null;
};
type Action =
  | { type: "INIT"; story: Story }
  | { type: "GOTO"; sceneId: string }
  | { type: "APPLY"; effects: Effect[] }
  | { type: "RESET" };

const KEY = "ashwood.game.state.v1";

const initial: State = { sceneId: null, flags: {}, score: 0, storyId: null };

function reduce(state: State, action: Action): State {
  switch (action.type) {
    case "INIT":
      return { ...initial, sceneId: action.story.startSceneId, storyId: action.story.id };
    case "GOTO":
      return { ...state, sceneId: action.sceneId };
    case "APPLY": {
      let next = { ...state };
      for (const e of action.effects) {
        if (e.type === "flag") next.flags = { ...next.flags, [e.key]: e.value };
        if (e.type === "score") next.score = next.score + (e.delta ?? 0);
      }
      return next;
    }
    case "RESET":
      return initial;
    default:
      return state;
  }
}

const Ctx = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reduce, initial);

  useEffect(() => { AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {}); }, [state]);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            // Basic hydration; skip if corrupted
            dispatch({ type: "GOTO", sceneId: parsed.sceneId ?? null });
          }
        } catch {}
      }
    })();
  }, []);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
