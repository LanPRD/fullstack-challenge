import {
  BadRequestException,
  InternalException,
  NotFoundException
} from "@/application/errors";
import { CashoutUseCase } from "@/application/use-cases/round/cashout.use-case";
import { Money, Round, UniqueEntityId } from "@/domain";
import type { WalletClientService } from "@/infrastructure/messaging";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { InMemoryRoundRepository } from "../../../repositories";

describe("CashoutUseCase", () => {
  let sut: CashoutUseCase;
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
    sut = new CashoutUseCase(roundRepository, eventEmitter, walletClient);
  });

  function createRunningRoundWithBet(userId: UniqueEntityId, amount: bigint) {
    const round = Round.create({ startedAt: new Date() });
    const moneyResult = Money.fromCents(amount);

    if (moneyResult.isRight()) {
      round.placeBet(userId, moneyResult.value);
    }

    round.startRound(); // Transition to RUNNING
    return round;
  }

  describe("execute", () => {
    it("should cashout successfully", async () => {
      const userId = new UniqueEntityId();
      const round = createRunningRoundWithBet(userId, 1000n);
      const betId = round.bets[0].id;
      roundRepository.save(round);

      const result = await sut.execute({
        betId: betId.toString(),
        multiplier: 2.5
      });

      expect(result.isRight()).toBe(true);

      if (result.isRight()) {
        expect(result.value.cashoutMultiplier).toBe(2.5);
        expect(result.value.payout?.toCents()).toBe(2500n);
        expect(result.value.isCashedOut).toBe(true);
      }

      // Verify round was saved
      const savedRound = await roundRepository.findCurrent();
      expect(savedRound?.bets[0].isCashedOut).toBe(true);
    });

    it("should return error when no active round exists", async () => {
      const result = await sut.execute({
        betId: "non-existent-bet",
        multiplier: 2.0
      });

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(NotFoundException);
        expect(result.value.message).toBe("No active round");
      }
    });

    it("should return error when round is not running", async () => {
      const userId = new UniqueEntityId();
      const round = Round.create({ startedAt: new Date() });
      const moneyResult = Money.fromCents(1000n);

      if (moneyResult.isRight()) {
        round.placeBet(userId, moneyResult.value);
      }

      // Round is still in BETTING phase, not started
      const betId = round.bets[0].id;
      roundRepository.save(round);

      const result = await sut.execute({
        betId: betId.toString(),
        multiplier: 2.0
      });

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(BadRequestException);
      }
    });

    it("should return error when bet not found", async () => {
      const userId = new UniqueEntityId();
      const round = createRunningRoundWithBet(userId, 1000n);
      roundRepository.save(round);

      const result = await sut.execute({
        betId: "non-existent-bet-id",
        multiplier: 2.0
      });

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(NotFoundException);
        expect(result.value.message).toBe("Bet not found");
      }
    });

    it("should return error when bet already cashed out", async () => {
      const userId = new UniqueEntityId();
      const round = createRunningRoundWithBet(userId, 1000n);
      const betId = round.bets[0].id;

      // First cashout
      round.cashout(betId, 1.5);
      roundRepository.save(round);

      // Second cashout attempt
      const result = await sut.execute({
        betId: betId.toString(),
        multiplier: 2.0
      });

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(BadRequestException);
      }
    });

    it("should return error when repository save fails", async () => {
      const userId = new UniqueEntityId();
      const round = createRunningRoundWithBet(userId, 1000n);
      const betId = round.bets[0].id;
      roundRepository.save(round);

      spyOn(roundRepository, "save").mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await sut.execute({
        betId: betId.toString(),
        multiplier: 2.0
      });

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(InternalException);
        expect(result.value.message).toBe("Error processing cashout");
      }
    });

    it("should calculate correct payout for different multipliers", async () => {
      const userId = new UniqueEntityId();
      const round = createRunningRoundWithBet(userId, 1000n);
      const betId = round.bets[0].id;
      roundRepository.save(round);

      const result = await sut.execute({
        betId: betId.toString(),
        multiplier: 3.75
      });

      expect(result.isRight()).toBe(true);

      if (result.isRight()) {
        expect(result.value.payout?.toCents()).toBe(3750n);
      }
    });
  });
});
