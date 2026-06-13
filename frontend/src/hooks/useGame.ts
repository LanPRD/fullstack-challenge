import { getSocket } from "@/lib/socket";
import { useGameStore } from "@/stores/gameStore";
import { useEffect } from "react";

export function useGame() {
  const store = useGameStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on("round:created", store.onRoundCreated);
    socket.on("round:started", store.onRoundStarted);
    socket.on("round:tick", store.onRoundTick);
    socket.on("round:crashed", store.onRoundCrashed);
    socket.on("bet:placed", store.onBetPlaced);
    socket.on("bet:cashedout", store.onBetCashedOut);

    return () => {
      socket.off("round:created", store.onRoundCreated);
      socket.off("round:started", store.onRoundStarted);
      socket.off("round:tick", store.onRoundTick);
      socket.off("round:crashed", store.onRoundCrashed);
      socket.off("bet:placed", store.onBetPlaced);
      socket.off("bet:cashedout", store.onBetCashedOut);
    };
  }, [store]);
}
