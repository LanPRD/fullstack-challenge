import {
  CrashRoundUseCase,
  CreateRoundUseCase,
  StartRoundUseCase
} from "@/application/use-cases/round";
import { GameEngineService, GamePhase } from "@/infrastructure/game-engine";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { InMemoryRoundRepository } from "../../../repositories";

describe("GameEngineService", () => {
  let sut: GameEngineService;
  let roundRepository: InMemoryRoundRepository;
  let createRoundUseCase: CreateRoundUseCase;
  let startRoundUseCase: StartRoundUseCase;
  let crashRoundUseCase: CrashRoundUseCase;
  let eventEmitter: EventEmitter2;
  let emittedEvents: { event: string; payload: unknown }[];

  afterEach(() => {
    sut.onModuleDestroy();
  });

  beforeEach(() => {
    roundRepository = new InMemoryRoundRepository();
    emittedEvents = [];

    // Create real use cases with the in-memory repository
    createRoundUseCase = new CreateRoundUseCase(roundRepository);
    startRoundUseCase = new StartRoundUseCase(roundRepository);
    crashRoundUseCase = new CrashRoundUseCase(roundRepository);

    eventEmitter = {
      emit: mock((event: string, payload: unknown) => {
        emittedEvents.push({ event, payload });
        return true;
      })
    } as unknown as EventEmitter2;

    sut = new GameEngineService(
      createRoundUseCase,
      startRoundUseCase,
      crashRoundUseCase,
      eventEmitter
    );
  });

  describe("initial state", () => {
    it("should start in IDLE phase", () => {
      expect(sut.state.phase).toBe(GamePhase.IDLE);
      expect(sut.state.round).toBeNull();
      expect(sut.currentMultiplier).toBe(1.0);
    });
  });

  describe("startNewRound", () => {
    it("should create a new round and enter BETTING phase", async () => {
      await sut.startNewRound();

      expect(sut.state.phase).toBe(GamePhase.BETTING);
      expect(sut.state.round).not.toBeNull();
      expect(sut.currentRound?.isBetting).toBe(true);
    });

    it("should save round to repository", async () => {
      await sut.startNewRound();

      const rounds = roundRepository.getRounds();
      expect(rounds).toHaveLength(1);
    });

    it("should emit round:created event", async () => {
      await sut.startNewRound();

      const createdEvent = emittedEvents.find(e => e.event === "round:created");
      expect(createdEvent).toBeDefined();
      expect(createdEvent?.payload).toHaveProperty("roundId");
      expect(createdEvent?.payload).toHaveProperty("serverSeedHash");
      expect(createdEvent?.payload).toHaveProperty("bettingEndsAt");
    });
  });

  describe("forceStartRound", () => {
    it("should transition from BETTING to RUNNING", async () => {
      await sut.startNewRound();
      expect(sut.state.phase).toBe(GamePhase.BETTING);

      await sut.forceStartRound();
      expect(sut.state.phase).toBe(GamePhase.RUNNING);
      expect(sut.currentRound?.isRunning).toBe(true);
    });

    it("should emit round:started event", async () => {
      await sut.startNewRound();
      await sut.forceStartRound();

      const startedEvent = emittedEvents.find(e => e.event === "round:started");
      expect(startedEvent).toBeDefined();
      expect(startedEvent?.payload).toHaveProperty("roundId");
    });
  });

  describe("forceCrash", () => {
    it("should transition from RUNNING to CRASHED", async () => {
      await sut.startNewRound();
      await sut.forceStartRound();
      expect(sut.state.phase).toBe(GamePhase.RUNNING);

      await sut.forceCrash();
      expect(sut.state.phase).toBe(GamePhase.CRASHED);
      expect(sut.currentRound?.isCrashed).toBe(true);
    });

    it("should emit round:crashed event with server seed", async () => {
      await sut.startNewRound();
      await sut.forceStartRound();
      await sut.forceCrash();

      const crashedEvent = emittedEvents.find(e => e.event === "round:crashed");
      expect(crashedEvent).toBeDefined();
      expect(crashedEvent?.payload).toHaveProperty("roundId");
      expect(crashedEvent?.payload).toHaveProperty("crashPoint");
      expect(crashedEvent?.payload).toHaveProperty("serverSeed");
    });
  });

  describe("getMultiplierForCashout", () => {
    it("should return null when not in RUNNING phase", async () => {
      await sut.startNewRound();

      const multiplier = sut.getMultiplierForCashout();
      expect(multiplier).toBeNull();
    });

    it("should return current multiplier when RUNNING", async () => {
      await sut.startNewRound();
      await sut.forceStartRound();

      const multiplier = sut.getMultiplierForCashout();
      expect(multiplier).toBeGreaterThanOrEqual(1.0);
    });
  });

  describe("full game cycle", () => {
    it("should complete a full cycle: IDLE -> BETTING -> RUNNING -> CRASHED", async () => {
      expect(sut.state.phase).toBe(GamePhase.IDLE);

      await sut.startNewRound();
      expect(sut.state.phase).toBe(GamePhase.BETTING);

      await sut.forceStartRound();
      expect(sut.state.phase).toBe(GamePhase.RUNNING);

      await sut.forceCrash();
      expect(sut.state.phase).toBe(GamePhase.CRASHED);

      const eventNames = emittedEvents.map(e => e.event);

      expect(eventNames).toContain("round:created");
      expect(eventNames).toContain("round:started");
      expect(eventNames).toContain("round:crashed");
    });
  });
});
