import { create } from "zustand";

export type GamePhase = "IDLE" | "BETTING" | "STARTED" | "CRASHED";

export interface BetEntry {
  betId: string;
  userId: string;
  amount: string;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  payout?: string;
}

export interface RoundHistoryEntry {
  roundId: string;
  crashPoint: number;
}

export interface DataPoint {
  elapsed: number;
  multiplier: number;
}

interface GameStore {
  phase: GamePhase;
  roundId: string | null;
  serverSeedHash: string | null;
  serverSeed: string | null;
  crashPoint: number | null;
  multiplier: number;
  bettingEndsAt: number | null;
  bets: BetEntry[];
  roundHistory: RoundHistoryEntry[];
  dataPoints: DataPoint[];
  myBetId: string | null;
  myBetAmount: number | null;

  onRoundCreated: (payload: { roundId: string; serverSeedHash: string; bettingEndsAt: number }) => void;
  onRoundStarted: (payload: { roundId: string }) => void;
  onRoundTick: (payload: { roundId: string; multiplier: number; elapsedMs: number }) => void;
  onRoundCrashed: (payload: { roundId: string; crashPoint: number; serverSeed: string }) => void;
  onBetPlaced: (payload: { roundId: string; betId: string; userId: string; amount: string }) => void;
  onBetCashedOut: (payload: {
    roundId: string;
    betId: string;
    userId: string;
    multiplier: number;
    payout: string;
  }) => void;
  setMyBet: (betId: string, amount: number) => void;
  clearMyBet: () => void;
  initFromCurrentRound: (round: {
    id: string;
    status: string;
    serverSeedHash: string;
    bets: Array<{
      id: string;
      userId: string;
      amount: number;
      status: string;
      cashoutMultiplier: number | null;
      payout: number | null;
    }>;
  }) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "IDLE",
  roundId: null,
  serverSeedHash: null,
  serverSeed: null,
  crashPoint: null,
  multiplier: 1.0,
  bettingEndsAt: null,
  bets: [],
  roundHistory: [],
  dataPoints: [],
  myBetId: null,
  myBetAmount: null,

  onRoundCreated: ({ roundId, serverSeedHash, bettingEndsAt }) =>
    set({
      phase: "BETTING",
      roundId,
      serverSeedHash,
      serverSeed: null,
      crashPoint: null,
      multiplier: 1.0,
      bettingEndsAt,
      bets: [],
      dataPoints: []
    }),

  onRoundStarted: () =>
    set({
      phase: "STARTED",
      bettingEndsAt: null,
      dataPoints: [{ elapsed: 0, multiplier: 1.0 }]
    }),

  onRoundTick: ({ multiplier, elapsedMs }) =>
    set(s => ({
      multiplier,
      dataPoints: [...s.dataPoints, { elapsed: elapsedMs, multiplier }]
    })),

  onRoundCrashed: ({ roundId, crashPoint, serverSeed }) =>
    set(s => ({
      phase: "CRASHED",
      crashPoint,
      serverSeed,
      roundHistory: [{ roundId, crashPoint }, ...s.roundHistory].slice(0, 20)
    })),

  onBetPlaced: ({ betId, userId, amount }) =>
    set(s => ({
      bets: [...s.bets, { betId, userId, amount, cashedOut: false }]
    })),

  onBetCashedOut: ({ betId, multiplier, payout }) =>
    set(s => ({
      bets: s.bets.map(b => (b.betId === betId ? { ...b, cashedOut: true, cashoutMultiplier: multiplier, payout } : b))
    })),

  setMyBet: (betId, amount) => set({ myBetId: betId, myBetAmount: amount }),

  clearMyBet: () => set({ myBetId: null, myBetAmount: null }),

  initFromCurrentRound: round => {
    const phase: GamePhase =
      round.status === "BETTING" ? "BETTING"
      : round.status === "RUNNING" ? "STARTED"
      : "IDLE";

    const bets: BetEntry[] = round.bets.map(b => ({
      betId: b.id,
      userId: b.userId,
      amount: String(b.amount),
      cashedOut: b.status === "CASHED_OUT",
      cashoutMultiplier: b.cashoutMultiplier ?? undefined,
      payout: b.payout !== null ? String(b.payout) : undefined
    }));

    const myBetId = get().myBetId;
    const myBet = bets.find(b => b.betId === myBetId);

    set({
      phase,
      roundId: round.id,
      serverSeedHash: round.serverSeedHash,
      bets,
      myBetId: myBet?.betId ?? null
    });
  }
}));
