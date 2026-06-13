import { Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

interface RoundCreatedPayload {
  roundId: string;
  serverSeedHash: string;
  bettingEndsAt: number;
}

interface RoundStartedPayload {
  roundId: string;
}

interface RoundTickPayload {
  roundId: string;
  multiplier: number;
  elapsedMs: number;
}

interface RoundCrashedPayload {
  roundId: string;
  crashPoint: number;
  serverSeed: string;
}

interface BetPlacedPayload {
  roundId: string;
  betId: string;
  userId: string;
  amount: string;
}

interface BetCashedOutPayload {
  roundId: string;
  betId: string;
  userId: string;
  multiplier: number;
  payout: string;
}

interface BetCancelledPayload {
  betId: string;
  userId: string;
  reason: string;
}

@WebSocketGateway({
  cors: {
    origin: "*"
  },
  namespace: "/game"
})
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly _logger = new Logger(GameGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit() {
    this._logger.log("WebSocket Gateway initialized");
  }

  handleConnection(client: Socket) {
    this._logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this._logger.log(`Client disconnected: ${client.id}`);
  }

  @OnEvent("round:created")
  handleRoundCreated(payload: RoundCreatedPayload) {
    this.server.emit("round:created", payload);
  }

  @OnEvent("round:started")
  handleRoundStarted(payload: RoundStartedPayload) {
    this.server.emit("round:started", payload);
  }

  @OnEvent("round:tick")
  handleRoundTick(payload: RoundTickPayload) {
    this.server.emit("round:tick", payload);
  }

  @OnEvent("round:crashed")
  handleRoundCrashed(payload: RoundCrashedPayload) {
    this.server.emit("round:crashed", payload);
  }

  @OnEvent("bet:placed")
  handleBetPlaced(payload: BetPlacedPayload) {
    this.server.emit("bet:placed", payload);
  }

  @OnEvent("bet:cashedout")
  handleBetCashedOut(payload: BetCashedOutPayload) {
    this.server.emit("bet:cashedout", payload);
  }

  @OnEvent("bet:cancelled")
  handleBetCancelled(payload: BetCancelledPayload) {
    this.server.emit("bet:cancelled", payload);
  }
}
