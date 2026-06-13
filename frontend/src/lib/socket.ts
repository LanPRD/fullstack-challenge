import { type Socket, io } from "socket.io-client";

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:4001";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${WS_URL}/game`, {
      transports: ["websocket"],
      autoConnect: true
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
