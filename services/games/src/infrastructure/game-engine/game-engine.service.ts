import {
  CrashRoundUseCase,
  CreateRoundUseCase,
  StartRoundUseCase
} from "@/application/use-cases/round";
import { Round } from "@/domain";
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { GAME_ENGINE_CONSTANTS } from "./game-engine.constants";
import { calculateMultiplier } from "./multiplier-calculator";

export enum GamePhase {
  IDLE = "IDLE",
  BETTING = "BETTING",
  RUNNING = "RUNNING",
  CRASHED = "CRASHED"
}

export interface GameState {
  phase: GamePhase;
  round: Round | null;
  currentMultiplier: number;
  startedAt: number | null;
}

@Injectable()
export class GameEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(GameEngineService.name);

  private _state: GameState = {
    phase: GamePhase.IDLE,
    round: null,
    currentMultiplier: 1.0,
    startedAt: null
  };

  private _bettingTimeout: Timer | null = null;
  private _tickInterval: Timer | null = null;

  constructor(
    private readonly createRoundUseCase: CreateRoundUseCase,
    private readonly startRoundUseCase: StartRoundUseCase,
    private readonly crashRoundUseCase: CrashRoundUseCase,
    private readonly eventEmitter: EventEmitter2
  ) {}

  get state(): GameState {
    return { ...this._state };
  }

  get currentMultiplier(): number {
    return this._state.currentMultiplier;
  }

  get currentRound(): Round | null {
    return this._state.round;
  }

  async onModuleInit() {
    this._logger.log("Game Engine initialized, starting first round...");
    await this.startNewRound();
  }

  onModuleDestroy() {
    this._logger.log("Game Engine shutting down...");
    this.cleanup();
  }

  async startNewRound(): Promise<void> {
    this._logger.log("Creating new round...");

    const result = await this.createRoundUseCase.execute();

    if (result.isLeft()) {
      this._logger.error(`Failed to create round: ${result.value.message}`);
      return;
    }

    const round = result.value;

    this._state = {
      phase: GamePhase.BETTING,
      round,
      currentMultiplier: 1.0,
      startedAt: null
    };

    this.emit("round:created", {
      roundId: round.id.toString(),
      serverSeedHash: round.provablyFair.serverSeedHash,
      bettingEndsAt:
        Date.now() + GAME_ENGINE_CONSTANTS.BETTING_PHASE_DURATION_MS
    });

    this._logger.log(
      `Round ${round.id.toString()} created. Betting phase started.`
    );

    this._bettingTimeout = setTimeout(
      () => this.startRunningPhase(),
      GAME_ENGINE_CONSTANTS.BETTING_PHASE_DURATION_MS
    );
  }

  private async startRunningPhase(): Promise<void> {
    if (!this._state.round) {
      this._logger.error("No round to start");
      return;
    }

    const result = await this.startRoundUseCase.execute();

    if (result.isLeft()) {
      this._logger.error(`Failed to start round: ${result.value.message}`);
      return;
    }

    const round = result.value;
    this._state.round = round;
    this._state.phase = GamePhase.RUNNING;
    this._state.startedAt = Date.now();

    this.emit("round:started", {
      roundId: round.id.toString()
    });

    this._logger.log(
      `Round ${round.id.toString()} started. Multiplier running.`
    );

    this._tickInterval = setInterval(
      () => this.tick(),
      GAME_ENGINE_CONSTANTS.TICK_INTERVAL_MS
    );
  }

  private tick(): void {
    if (this._state.phase !== GamePhase.RUNNING || !this._state.startedAt) {
      return;
    }

    const elapsedMs = Date.now() - this._state.startedAt;
    const multiplier = calculateMultiplier(elapsedMs);

    this._state.currentMultiplier = multiplier;

    this.emit("round:tick", {
      roundId: this._state.round?.id.toString(),
      multiplier,
      elapsedMs
    });

    const crashPoint = this._state.round?.crashPoint ?? 1;

    if (multiplier >= crashPoint) {
      this.crashRound();
    }
  }

  private async crashRound(): Promise<void> {
    this.cleanup();

    if (!this._state.round) {
      this._logger.error("No round to crash");
      return;
    }

    const result = await this.crashRoundUseCase.execute();

    if (result.isLeft()) {
      this._logger.error(`Failed to crash round: ${result.value.message}`);
      return;
    }

    const round = result.value;
    this._state.round = round;
    this._state.phase = GamePhase.CRASHED;

    this.emit("round:crashed", {
      roundId: round.id.toString(),
      crashPoint: round.crashPoint,
      serverSeed: round.provablyFair.serverSeed
    });

    this._logger.log(
      `Round ${round.id.toString()} crashed at ${round.crashPoint}x`
    );

    setTimeout(() => this.startNewRound(), 3000);
  }

  private emit(event: string, payload: Record<string, unknown>): void {
    this.eventEmitter.emit(event, payload);
  }

  private cleanup(): void {
    if (this._bettingTimeout) {
      clearTimeout(this._bettingTimeout);
      this._bettingTimeout = null;
    }

    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }
  }

  getMultiplierForCashout(): number | null {
    if (this._state.phase !== GamePhase.RUNNING) {
      return null;
    }

    return this._state.currentMultiplier;
  }

  // For testing purposes
  async forceStartRound(): Promise<void> {
    this.cleanup();
    await this.startRunningPhase();
  }

  async forceCrash(): Promise<void> {
    await this.crashRound();
  }
}
