import { getSocket } from "@/lib/socket";
import { useGameStore } from "@/stores/gameStore";
import { useEffect } from "react";
import toast from "react-hot-toast";

export function useGame() {
  const store = useGameStore();

  useEffect(() => {
    const socket = getSocket();

    const onBetCancelled = (payload: { betId: string; userId: string; reason: string }) => {
      if (payload.betId === store.myBetId) {
        store.clearMyBet();
        toast.error("Aposta cancelada: saldo insuficiente", { duration: 5000 });
      }
    };

    socket.on("round:created", store.onRoundCreated);
    socket.on("round:started", store.onRoundStarted);
    socket.on("round:tick", store.onRoundTick);
    socket.on("round:crashed", store.onRoundCrashed);
    socket.on("bet:placed", store.onBetPlaced);
    socket.on("bet:cashedout", store.onBetCashedOut);
    socket.on("bet:cancelled", onBetCancelled);

    return () => {
      socket.off("round:created", store.onRoundCreated);
      socket.off("round:started", store.onRoundStarted);
      socket.off("round:tick", store.onRoundTick);
      socket.off("round:crashed", store.onRoundCrashed);
      socket.off("bet:placed", store.onBetPlaced);
      socket.off("bet:cashedout", store.onBetCashedOut);
      socket.off("bet:cancelled", onBetCancelled);
    };
  }, [store]);
}
