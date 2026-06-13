import {
  BadRequestException,
  InternalException,
  NotFoundException
} from "@/application/errors";
import { PlaceBetUseCase } from "@/application/use-cases/round/place-bet.use-case";
import { BET_LIMITS, Money, Round, UniqueEntityId } from "@/domain";
import type { WalletClientService } from "@/infrastructure/messaging";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { InMemoryRoundRepository } from "../../../repositories";

describe("PlaceBetUseCase", () => {
  let sut: PlaceBetUseCase;
  let roundRepository: InMemoryRoundRepository;
  let eventEmitter: EventEmitter2;
  let walletClient: WalletClientService;

  beforeEach(() => {
    roundRepository = new InMemoryRoundRepository();
    eventEmitter = { emit: mock(() => true) } as unknown as EventEmitter2;
    walletClient = {
      debit: mock(() => Promise.resolve("mock-correlation-id")),
      credit: mock(() => Promise.resolve("mock-correlation-id"))
    } as unknown as WalletClientService;
    sut = new PlaceBetUseCase(roundRepository, eventEmitter, walletClient);
  });

  function createActiveRound(): Round {
    return Round.create({ startedAt: new Date() });
  }

  describe("execute", () => {
    it("should place a bet successfully", async () => {
      const userId = new UniqueEntityId();

      const round = createActiveRound();
      roundRepository.save(round);

      const result = await sut.execute({
        userId: userId.toString(),
        amount: 1000
      });

      expect(result.isRight()).toBe(true);

      if (result.isRight()) {
        expect(result.value.userId.toString()).toBe(userId.toString());
        expect(result.value.amount.toCents()).toBe(1000n);
      }

      const savedRound = await roundRepository.findCurrent();
      expect(savedRound?.bets).toHaveLength(1);
    });

    it("should return error when amount is below minimum", async () => {
      const userId = new UniqueEntityId();

      const round = createActiveRound();
      roundRepository.save(round);

      const result = await sut.execute({
        userId: userId.toString(),
        amount: 50 // below MIN_CENTS (100)
      });

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(BadRequestException);
        expect(result.value.message).toContain(String(BET_LIMITS.MIN_CENTS));
      }
    });

    it("should return error when amount is above maximum", async () => {
      const userId = new UniqueEntityId();

      const round = createActiveRound();
      roundRepository.save(round);

      const result = await sut.execute({
        userId: userId.toString(),
        amount: 200000 // above MAX_CENTS (100000)
      });

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(BadRequestException);
        expect(result.value.message).toContain(String(BET_LIMITS.MAX_CENTS));
      }
    });

    it("should return error when no active round exists", async () => {
      // No round added to repository
      const userId = new UniqueEntityId();

      const result = await sut.execute({
        userId: userId.toString(),
        amount: 1000
      });

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(NotFoundException);
        expect(result.value.message).toBe("No active round");
      }
    });

    it("should return error when player already placed a bet", async () => {
      const round = createActiveRound();
      const userId = new UniqueEntityId();

      // First bet placed directly on round
      const moneyResult = Money.fromCents(500n);

      if (moneyResult.isRight()) {
        round.placeBet(userId, moneyResult.value);
      }

      roundRepository.save(round);

      // Second bet from same user via use case
      const result = await sut.execute({
        userId: userId.toString(),
        amount: 1000
      });

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(BadRequestException);
      }
    });

    it("should return error when round is not in betting phase", async () => {
      const userId = new UniqueEntityId();
      const round = createActiveRound();
      round.startRound(); // Transition to RUNNING
      roundRepository.save(round);

      const result = await sut.execute({
        userId: userId.toString(),
        amount: 1000
      });

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(BadRequestException);
      }
    });

    it("should return error when repository save fails", async () => {
      const round = createActiveRound();
      roundRepository.save(round);

      // Spy on save to make it throw
      spyOn(roundRepository, "save").mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await sut.execute({
        userId: "user-123",
        amount: 1000
      });

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(InternalException);
        expect(result.value.message).toBe("Error placing bet");
      }
    });

    it("should accept minimum bet amount", async () => {
      const round = createActiveRound();
      roundRepository.save(round);

      const result = await sut.execute({
        userId: "user-123",
        amount: Number(BET_LIMITS.MIN_CENTS)
      });

      expect(result.isRight()).toBe(true);
    });

    it("should accept maximum bet amount", async () => {
      const round = createActiveRound();
      roundRepository.save(round);

      const result = await sut.execute({
        userId: "user-123",
        amount: Number(BET_LIMITS.MAX_CENTS)
      });

      expect(result.isRight()).toBe(true);
    });

    it("should allow multiple users to place bets", async () => {
      const round = createActiveRound();
      roundRepository.save(round);

      const result1 = await sut.execute({
        userId: "user-1",
        amount: 1000
      });

      const result2 = await sut.execute({
        userId: "user-2",
        amount: 2000
      });

      expect(result1.isRight()).toBe(true);
      expect(result2.isRight()).toBe(true);

      const savedRound = await roundRepository.findCurrent();
      expect(savedRound?.bets).toHaveLength(2);
    });
  });
});
