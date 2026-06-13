import api from "@/lib/api";
import { useGameStore } from "@/stores/gameStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    return r?.data?.message ?? "Erro desconhecido";
  }
  return "Erro de rede";
}

export function BetControls() {
  const { phase, bettingEndsAt, multiplier, myBetId, myBetAmount, setMyBet, clearMyBet } =
    useGameStore();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("10.00");
  const [timeLeft, setTimeLeft] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (phase !== "BETTING" || !bettingEndsAt) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, bettingEndsAt - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));
    }, 100);
    return () => clearInterval(id);
  }, [phase, bettingEndsAt]);

  // Reset my bet when new round starts
  useEffect(() => {
    if (phase === "BETTING") clearMyBet();
  }, [phase, clearMyBet]);

  const placeBet = useMutation({
    mutationFn: async (betAmount: number) => {
      const res = await api.post<{ id: string; amount: number }>("/games/bet", {
        amount: betAmount
      });
      return res.data;
    },
    onSuccess: (data) => {
      setMyBet(data.id, data.amount);
      toast.success(`Aposta de R$${data.amount.toFixed(2)} realizada!`);
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  const cashout = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ payout: number; cashoutMultiplier: number }>(
        "/games/bet/cashout"
      );
      return res.data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      clearMyBet();
      toast.success(
        `Cash out em ${data.cashoutMultiplier.toFixed(2)}× → R$${data.payout.toFixed(2)}!`,
        { duration: 5000 }
      );
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount >= 1 && parsedAmount <= 1000;
  const potentialPayout = myBetAmount != null ? myBetAmount * multiplier : 0;
  const hasPendingBet = !!myBetId;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: "#0f0f1a", border: "1px solid #2a2a4a" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Aposta</h2>
        {phase === "BETTING" && bettingEndsAt && (
          <span
            className="text-xs font-mono font-bold px-2 py-0.5 rounded"
            style={{ color: timeLeft <= 3 ? "#ef4444" : "#facc15", background: "#1a1a2e" }}
          >
            {timeLeft}s
          </span>
        )}
      </div>

      {/* Amount input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
          R$
        </span>
        <input
          type="number"
          min="1"
          max="1000"
          step="0.50"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={phase !== "BETTING" || hasPendingBet}
          className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-white text-right font-mono text-lg focus:outline-none focus:border-green-500 disabled:opacity-50"
        />
      </div>

      {/* Quick amounts */}
      {phase === "BETTING" && !hasPendingBet && (
        <div className="grid grid-cols-4 gap-1.5">
          {[5, 10, 50, 100].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(String(v))}
              className="text-xs py-1.5 rounded text-gray-400 hover:text-white transition-colors"
              style={{ background: "#16162a" }}
            >
              R${v}
            </button>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {phase === "BETTING" && !hasPendingBet && (
        <button
          onClick={() => placeBet.mutate(parsedAmount)}
          disabled={!isValidAmount || placeBet.isPending}
          className="w-full py-3 rounded-lg font-bold text-base uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: isValidAmount ? "#00ff88" : "#1a2a1a",
            color: isValidAmount ? "#000" : "#4a5a4a"
          }}
        >
          {placeBet.isPending ? "Aguardando…" : "Apostar"}
        </button>
      )}

      {phase === "BETTING" && hasPendingBet && (
        <div
          className="w-full py-3 rounded-lg text-center font-semibold text-sm"
          style={{ background: "#1a2a1a", color: "#00ff88", border: "1px solid #00ff8866" }}
        >
          ✓ Aposta de R${myBetAmount?.toFixed(2)} confirmada
        </div>
      )}

      {phase === "STARTED" && hasPendingBet && (
        <div className="flex flex-col gap-2">
          <div
            className="text-center text-sm rounded-lg py-2"
            style={{ background: "#16162a", color: "#94a3b8" }}
          >
            Payout atual:{" "}
            <span className="font-mono font-bold" style={{ color: "#00ff88" }}>
              R${potentialPayout.toFixed(2)}
            </span>
          </div>
          <button
            onClick={() => cashout.mutate()}
            disabled={cashout.isPending}
            className="w-full py-3 rounded-lg font-bold text-base uppercase tracking-wider transition-all disabled:opacity-60"
            style={{ background: "#f59e0b", color: "#000" }}
          >
            {cashout.isPending ? "…" : `Cash Out — R$${potentialPayout.toFixed(2)}`}
          </button>
        </div>
      )}

      {phase === "STARTED" && !hasPendingBet && (
        <div
          className="w-full py-3 rounded-lg text-center text-sm"
          style={{ background: "#1a1a1a", color: "#6b7280" }}
        >
          Sem aposta nesta rodada
        </div>
      )}

      {phase === "CRASHED" && (
        <div
          className="w-full py-3 rounded-lg text-center font-semibold"
          style={{
            background: "#1a0a0a",
            color: hasPendingBet ? "#ef4444" : "#6b7280",
            border: hasPendingBet ? "1px solid #ef444444" : "none"
          }}
        >
          {hasPendingBet ? "Aposta perdida" : "Aguardando próxima rodada…"}
        </div>
      )}
    </div>
  );
}
