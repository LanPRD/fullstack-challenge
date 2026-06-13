import { Round, UniqueEntityId } from "@/domain/entities";
import { BetStatus, RoundStatus } from "@/domain/enums";
import {
  BetAlreadyCashedOutError,
  BetNotFoundError,
  BettingPhaseEndedError,
  PlayerAlreadyBetError,
  RoundAlreadyCrashedError,
  RoundNotRunningError
} from "@/domain/errors";
import { Money, ProvablyFair } from "@/domain/value-objects";
import { describe, expect, it } from "bun:test";

function createMoney(cents: bigint): Money {
  const result = Money.fromCents(cents);
  if (result.isLeft()) throw new Error("Failed to create Money");
  return result.value;
}

describe("Round", () => {
  describe("create", () => {
    it("should create a round with default values", () => {
      const round = Round.create({ startedAt: new Date() });

      expect(round.status).toBe(RoundStatus.BETTING);
      expect(round.crashedAt).toBeNull();
      expect(round.endedAt).toBeNull();
      expect(round.bets).toHaveLength(0);
      expect(round.provablyFair).toBeDefined();
      expect(round.crashPoint).toBeGreaterThanOrEqual(1);
    });

    it("should create a round with custom provably fair", () => {
      const provablyFair = ProvablyFair.generate();

      const round = Round.create({
        startedAt: new Date(),
        provablyFair
      });

      expect(round.provablyFair).toBe(provablyFair);
      expect(round.crashPoint).toBe(provablyFair.crashPoint);
    });

    it("should create a round with custom id", () => {
      const id = new UniqueEntityId("custom-id");
      const round = Round.create({ startedAt: new Date() }, id);

      expect(round.id.toString()).toBe("custom-id");
    });
  });

  describe("isBetting / isRunning / isCrashed", () => {
    it("should return true for isBetting when status is BETTING", () => {
      const round = Round.create({ startedAt: new Date() });

      expect(round.isBetting).toBe(true);
      expect(round.isRunning).toBe(false);
      expect(round.isCrashed).toBe(false);
    });
  });

  describe("placeBet", () => {
    it("should place a bet during betting phase", () => {
      const round = Round.create({ startedAt: new Date() });
      const userId = new UniqueEntityId();
      const amount = createMoney(1000n);

      const result = round.placeBet(userId, amount);

      expect(result.isRight()).toBe(true);

      if (result.isRight()) {
        expect(result.value.userId.toString()).toBe(userId.toString());
        expect(result.value.amount.toCents()).toBe(1000n);
        expect(result.value.status).toBe(BetStatus.PENDING);
      }

      expect(round.bets).toHaveLength(1);
    });

    it("should reject bet when betting phase has ended", () => {
      const round = Round.create({ startedAt: new Date() });
      round.startRound();

      const userId = new UniqueEntityId();
      const amount = createMoney(1000n);

      const result = round.placeBet(userId, amount);

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(BettingPhaseEndedError);
      }
    });

    it("should reject duplicate bet from same player", () => {
      const round = Round.create({ startedAt: new Date() });
      const userId = new UniqueEntityId();
      const amount = createMoney(1000n);

      round.placeBet(userId, amount);
      const result = round.placeBet(userId, createMoney(500n));

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(PlayerAlreadyBetError);
      }
    });

    it("should allow a player to bet after their previous bet was cancelled", () => {
      const round = Round.create({ startedAt: new Date() });
      const userId = new UniqueEntityId();
      const amount = createMoney(1000n);

      const firstBetResult = round.placeBet(userId, amount);
      expect(firstBetResult.isRight()).toBe(true);

      if (firstBetResult.isRight()) {
        firstBetResult.value.cancel();
      }

      const secondBetResult = round.placeBet(userId, createMoney(500n));
      expect(secondBetResult.isRight()).toBe(true);
      expect(round.bets).toHaveLength(2);
    });

    it("should allow multiple players to bet", () => {
      const round = Round.create({ startedAt: new Date() });
      const user1 = new UniqueEntityId();
      const user2 = new UniqueEntityId();
      const amount = createMoney(1000n);

      const result1 = round.placeBet(user1, amount);
      const result2 = round.placeBet(user2, amount);

      expect(result1.isRight()).toBe(true);
      expect(result2.isRight()).toBe(true);
      expect(round.bets).toHaveLength(2);
    });
  });

  describe("startRound", () => {
    it("should transition from BETTING to RUNNING", () => {
      const round = Round.create({ startedAt: new Date() });

      const result = round.startRound();

      expect(result.isRight()).toBe(true);
      expect(round.status).toBe(RoundStatus.RUNNING);
      expect(round.isRunning).toBe(true);
      expect(round.isBetting).toBe(false);
    });

    it("should fail when not in betting phase", () => {
      const round = Round.create({ startedAt: new Date() });
      round.startRound();

      const result = round.startRound();

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(BettingPhaseEndedError);
      }
    });
  });

  describe("cashout", () => {
    it("should allow cashout during running phase", () => {
      const round = Round.create({ startedAt: new Date() });
      const userId = new UniqueEntityId();
      const amount = createMoney(1000n);

      const betResult = round.placeBet(userId, amount);
      round.startRound();

      if (betResult.isRight()) {
        const result = round.cashout(betResult.value.id, 2.5);

        expect(result.isRight()).toBe(true);

        if (result.isRight()) {
          expect(result.value.cashoutMultiplier).toBe(2.5);
          expect(result.value.payout?.toCents()).toBe(2500n);
          expect(result.value.isCashedOut).toBe(true);
        }
      }
    });

    it("should reject cashout when round is not running", () => {
      const round = Round.create({ startedAt: new Date() });
      const userId = new UniqueEntityId();
      const amount = createMoney(1000n);

      const betResult = round.placeBet(userId, amount);

      if (betResult.isRight()) {
        const result = round.cashout(betResult.value.id, 2.5);

        expect(result.isLeft()).toBe(true);

        if (result.isLeft()) {
          expect(result.value).toBeInstanceOf(RoundNotRunningError);
        }
      }
    });

    it("should reject cashout for non-existent bet", () => {
      const round = Round.create({ startedAt: new Date() });
      round.startRound();

      const fakeBetId = new UniqueEntityId();
      const result = round.cashout(fakeBetId, 2.5);

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(BetNotFoundError);
      }
    });

    it("should reject cashout for already cashed out bet", () => {
      const round = Round.create({ startedAt: new Date() });
      const userId = new UniqueEntityId();
      const amount = createMoney(1000n);

      const betResult = round.placeBet(userId, amount);
      round.startRound();

      if (betResult.isRight()) {
        round.cashout(betResult.value.id, 2.5);
        const result = round.cashout(betResult.value.id, 3.0);

        expect(result.isLeft()).toBe(true);

        if (result.isLeft()) {
          expect(result.value).toBeInstanceOf(BetAlreadyCashedOutError);
        }
      }
    });
  });

  describe("crash", () => {
    it("should crash the round and mark pending bets as lost", () => {
      const round = Round.create({ startedAt: new Date() });
      const user1 = new UniqueEntityId();
      const user2 = new UniqueEntityId();
      const amount = createMoney(1000n);

      round.placeBet(user1, amount);
      const bet2Result = round.placeBet(user2, amount);
      round.startRound();

      if (bet2Result.isRight()) {
        round.cashout(bet2Result.value.id, 1.5);
      }

      const result = round.crash();

      expect(result.isRight()).toBe(true);
      expect(round.status).toBe(RoundStatus.CRASHED);
      expect(round.isCrashed).toBe(true);
      expect(round.crashedAt).not.toBeNull();
      expect(round.endedAt).not.toBeNull();

      const lostBets = round.bets.filter(bet => bet.isLost);
      const cashedOutBets = round.bets.filter(bet => bet.isCashedOut);

      expect(lostBets).toHaveLength(1);
      expect(cashedOutBets).toHaveLength(1);
    });

    it("should reject crash when already crashed", () => {
      const round = Round.create({ startedAt: new Date() });
      round.startRound();
      round.crash();

      const result = round.crash();

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(RoundAlreadyCrashedError);
      }
    });

    it("should mark all pending bets as lost on crash", () => {
      const round = Round.create({ startedAt: new Date() });

      for (let i = 0; i < 5; i++) {
        round.placeBet(new UniqueEntityId(), createMoney(1000n));
      }

      round.startRound();
      round.crash();

      const allLost = round.bets.every(bet => bet.isLost);
      expect(allLost).toBe(true);
    });
  });

  describe("addBet", () => {
    it("should add an existing bet to the round", () => {
      const round = Round.create({ startedAt: new Date() });
      const userId = new UniqueEntityId();
      const amount = createMoney(1000n);

      const betResult = round.placeBet(userId, amount);

      if (betResult.isRight()) {
        expect(round.bets).toContain(betResult.value);
      }
    });
  });

  describe("crashPoint", () => {
    it("should return the provably fair crash point", () => {
      const provablyFair = ProvablyFair.generate();

      const round = Round.create({
        startedAt: new Date(),
        provablyFair
      });

      expect(round.crashPoint).toBe(provablyFair.crashPoint);
    });
  });
});
