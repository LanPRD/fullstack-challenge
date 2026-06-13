import { type BetEntry, useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/authStore";

function BetRow({ bet }: { bet: BetEntry }) {
  const myId = useAuthStore(s => s.user?.id);
  const isMe = bet.userId === myId;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors animate-slide-in ${
        bet.cashedOut ? "animate-cashout" : ""
      }`}
      style={{
        background: isMe ? "#16162a" : "#0f0f1a",
        border: isMe ? "1px solid #2a2a4a" : "1px solid transparent"
      }}
    >
      {/* User */}
      <div className="w-24 font-mono text-xs text-gray-400 truncate">
        {isMe ?
          <span style={{ color: "#00ff88" }}>você</span>
        : bet.userId.slice(0, 8) + "…"}
      </div>

      {/* Amount */}
      <div className="flex-1 font-mono text-white">R${parseFloat(bet.amount).toFixed(2)}</div>

      {/* Status */}
      {bet.cashedOut ?
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono" style={{ color: "#00ff88" }}>
            {bet.cashoutMultiplier?.toFixed(2)}×
          </span>
          <span className="text-xs font-bold" style={{ color: "#00ff88" }}>
            +R${bet.payout ? parseFloat(bet.payout).toFixed(2) : "—"}
          </span>
        </div>
      : <div
          className="text-xs px-1.5 py-0.5 rounded font-semibold"
          style={{ background: "#1a2a1a", color: "#86efac" }}
        >
          ativo
        </div>
      }
    </div>
  );
}

export function BetsList() {
  const bets = useGameStore(s => s.bets);
  const phase = useGameStore(s => s.phase);

  if (bets.length === 0) {
    return (
      <div className="rounded-xl p-4" style={{ background: "#0f0f1a", border: "1px solid #2a2a4a" }}>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Apostas da rodada</h2>
        <div className="text-center text-gray-600 text-sm py-4">
          {phase === "BETTING" ? "Sem apostas ainda" : "Nenhuma aposta"}
        </div>
      </div>
    );
  }

  // Cashed-out first, then pending
  const sorted = [...bets].sort((a, b) => {
    if (a.cashedOut === b.cashedOut) return 0;
    return a.cashedOut ? -1 : 1;
  });

  return (
    <div className="rounded-xl p-4" style={{ background: "#0f0f1a", border: "1px solid #2a2a4a" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Apostas da rodada</h2>
        <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "#16162a", color: "#94a3b8" }}>
          {bets.length}
        </span>
      </div>
      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
        {sorted.map(bet => (
          <BetRow key={bet.betId} bet={bet} />
        ))}
      </div>
    </div>
  );
}
