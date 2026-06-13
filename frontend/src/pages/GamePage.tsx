import { BetControls } from "@/components/BetControls";
import { BetsList } from "@/components/BetsList";
import { CrashGraph } from "@/components/CrashGraph";
import { PlayerInfo } from "@/components/PlayerInfo";
import { RoundHistory } from "@/components/RoundHistory";
import { useGame } from "@/hooks/useGame";
import api from "@/lib/api";
import { useGameStore } from "@/stores/gameStore";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function GamePage() {
  useGame();

  const { phase, multiplier, dataPoints, serverSeedHash, crashPoint, initFromCurrentRound } = useGameStore();

  // Bootstrap: fetch current round on mount
  const { data: currentRound } = useQuery({
    queryKey: ["current-round"],
    queryFn: async () => {
      try {
        const res = await api.get("/games/rounds/current");
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: Infinity,
    retry: false
  });

  useEffect(() => {
    if (currentRound) {
      initFromCurrentRound(currentRound);
    }
  }, [currentRound, initFromCurrentRound]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#07070f" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "#2a2a4a", background: "#0a0a14" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🚀</span>
          <span className="font-black text-lg tracking-tight" style={{ color: "#00ff88" }}>
            CRASH
          </span>
        </div>
        <PlayerInfo />
      </header>

      {/* Main layout */}
      <main className="flex-1 p-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Left column: graph + bets */}
        <div className="flex flex-col gap-4">
          <CrashGraph
            phase={phase}
            multiplier={multiplier}
            dataPoints={dataPoints}
            serverSeedHash={serverSeedHash}
            crashPoint={crashPoint}
          />
          <BetsList />
        </div>

        {/* Right column: controls + history */}
        <div className="flex flex-col gap-4">
          <BetControls />
          <RoundHistory />
        </div>
      </main>
    </div>
  );
}
