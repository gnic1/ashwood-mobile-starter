import { create } from 'zustand';

/** --- Types --- */
export type Player = {
  id: string;
  name: string;
  role?: string;
  trait?: string;
  isGhost?: boolean;
};

export type Tone = 'Cautious' | 'Bold' | 'Deceptive' | 'Spiritual';

export type PlayerAction = {
  id: string;
  playerId: string;
  playerName?: string;
  summary: string;
  tone?: Tone | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
};

type GameState = {
  /** Core session state */
  ready: boolean;
  gameCode: string | null;
  players: Player[];
  currentPlayerId: string | null;
  roomName: string;
  round: number;

  /** Action queue (for GM / AI pipeline) */
  actionsQueue: PlayerAction[];

  /** Core setters */
  setReady: (ready: boolean) => void;
  setGameCode: (code: string) => void;
  addPlayer: (p: Player) => void;
  addOrUpdatePlayer: (p: Player) => void;
  removePlayer: (id: string) => void;
  setCurrentPlayer: (id: string | null) => void;
  setRoom: (name: string) => void;
  nextRound: () => void;
  reset: () => void;

  /** Queue operations */
  enqueueAction: (input: Omit<PlayerAction, 'id' | 'status' | 'createdAt'>) => string;
  approveAction: (id: string) => void;
  rejectAction: (id: string) => void;
  clearResolved: () => void;
};

const initialState = {
  ready: true,
  gameCode: null,
  players: [],
  currentPlayerId: null,
  roomName: 'Entry Hall',
  round: 1,
  actionsQueue: [] as PlayerAction[],
};

const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  /** --- Core setters --- */
  setReady: (ready) => set({ ready }),
  setGameCode: (code) => set({ gameCode: code }),

  addPlayer: (p) =>
    set((state) => {
      // avoid dup by id
      if (state.players.some((x) => x.id === p.id)) return state;
      return { players: [...state.players, p] };
    }),

  addOrUpdatePlayer: (p) =>
    set((state) => {
      const idx = state.players.findIndex((x) => x.id === p.id);
      if (idx === -1) return { players: [...state.players, p] };
      const next = state.players.slice();
      next[idx] = { ...next[idx], ...p };
      return { players: next };
    }),

  removePlayer: (id) =>
    set((state) => ({ players: state.players.filter((x) => x.id !== id) })),

  setCurrentPlayer: (id) => set({ currentPlayerId: id }),
  setRoom: (name) => set({ roomName: name }),
  nextRound: () => set((state) => ({ round: state.round + 1 })),

  reset: () => set({ ...initialState }),

  /** --- Queue operations --- */
  enqueueAction: (input) => {
    const id = String(Date.now());
    const action: PlayerAction = {
      id,
      status: 'pending',
      createdAt: Date.now(),
      ...input,
    };
    set((state) => ({ actionsQueue: [action, ...state.actionsQueue] }));
    return id;
  },

  approveAction: (id) =>
    set((state) => ({
      actionsQueue: state.actionsQueue.map((a) =>
        a.id === id ? { ...a, status: 'approved' } : a
      ),
    })),

  rejectAction: (id) =>
    set((state) => ({
      actionsQueue: state.actionsQueue.map((a) =>
        a.id === id ? { ...a, status: 'rejected' } : a
      ),
    })),

  clearResolved: () =>
    set((state) => ({
      actionsQueue: state.actionsQueue.filter((a) => a.status === 'pending'),
    })),
}));

export default useGameStore;
