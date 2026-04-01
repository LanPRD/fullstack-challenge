import { InternalException, NotFoundException } from "@/application/errors";
import { CrashRoundUseCase } from "@/application/use-cases/round/crash-round.use-case";
import { Money, Round, RoundStatus, UniqueEntityId } from "@/domain";
import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { InMemoryRoundRepository } from "../../../repositories";

describe("CrashRoundUseCase", () => {
  let sut: CrashRoundUseCase;
  let roundRepository: InMemoryRoundRepository;

  beforeEach(() => {
    roundRepository = new InMemoryRoundRepository();
    sut = new CrashRoundUseCase(roundRepository);
  });

  function createRunningRound(): Round {
    const round = Round.create({ startedAt: new Date() });
    round.startRound();
    return round;
  }

  function createRunningRoundWithBets(count: number): Round {
    const round = Round.create({ startedAt: new Date() });

    for (let i = 0; i < count; i++) {
      const moneyResult = Money.fromCents(1000n);

      if (moneyResult.isRight()) {
        round.placeBet(new UniqueEntityId(), moneyResult.value);
      }
    }

    round.startRound();
    return round;
  }

  describe("execute", () => {
    it("should crash round successfully", async () => {
      const round = createRunningRound();
      roundRepository.save(round);

      const result = await sut.execute();

      expect(result.isRight()).toBe(true);

      if (result.isRight()) {
        expect(result.value.status).toBe(RoundStatus.CRASHED);
        expect(result.value.isCrashed).toBe(true);
        expect(result.value.crashedAt).not.toBeNull();
        expect(result.value.endedAt).not.toBeNull();
      }

      // Verify round was saved
      const savedRound = await roundRepository.findById(round.id);
      expect(savedRound?.isCrashed).toBe(true);
    });

    it("should mark all pending bets as lost", async () => {
      const round = createRunningRoundWithBets(3);
      roundRepository.save(round);

      const result = await sut.execute();

      expect(result.isRight()).toBe(true);

      if (result.isRight()) {
        const lostBets = result.value.bets.filter(bet => bet.isLost);
        expect(lostBets).toHaveLength(3);
      }
    });

    it("should not affect already cashed out bets", async () => {
      const round = createRunningRoundWithBets(3);

      // Cash out first bet
      const firstBetId = round.bets[0].id;
      round.cashout(firstBetId, 2.0);

      roundRepository.save(round);

      const result = await sut.execute();

      expect(result.isRight()).toBe(true);

      if (result.isRight()) {
        const cashedOutBets = result.value.bets.filter(bet => bet.isCashedOut);
        const lostBets = result.value.bets.filter(bet => bet.isLost);

        expect(cashedOutBets).toHaveLength(1);
        expect(lostBets).toHaveLength(2);
      }
    });

    it("should return error when no active round exists", async () => {
      const result = await sut.execute();

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(NotFoundException);
        expect(result.value.message).toBe("No active round");
      }
    });

    it("should return error when repository save fails", async () => {
      const round = createRunningRound();
      roundRepository.save(round);

      spyOn(roundRepository, "save").mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await sut.execute();

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(InternalException);
        expect(result.value.message).toBe("Error crashing round");
      }
    });

    it("should return crash point from provably fair", async () => {
      const round = createRunningRound();
      const expectedCrashPoint = round.crashPoint;
      roundRepository.save(round);

      const result = await sut.execute();

      expect(result.isRight()).toBe(true);

      if (result.isRight()) {
        expect(result.value.crashPoint).toBe(expectedCrashPoint);
      }
    });
  });
});
