import { Bet, UniqueEntityId } from "@/domain/entities";
import { BetStatus } from "@/domain/enums";
import { Money } from "@/domain/value-objects";
import { describe, expect, it } from "bun:test";

function createMoney(cents: bigint): Money {
  const result = Money.fromCents(cents);
  if (result.isLeft()) throw new Error("Failed to create Money");
  return result.value;
}

describe("Bet", () => {
  describe("create", () => {
    it("should create a bet with default values", () => {
      const userId = new UniqueEntityId();
      const roundId = new UniqueEntityId();
      const amount = createMoney(1000n);

      const bet = Bet.create({ userId, roundId, amount });

      expect(bet.userId.toString()).toBe(userId.toString());
      expect(bet.roundId.toString()).toBe(roundId.toString());
      expect(bet.amount.toCents()).toBe(1000n);
      expect(bet.status).toBe(BetStatus.PENDING);
      expect(bet.cashoutMultiplier).toBeNull();
      expect(bet.payout).toBeNull();
    });

    it("should create a bet with custom id", () => {
      const id = new UniqueEntityId("custom-bet-id");
      const userId = new UniqueEntityId();
      const roundId = new UniqueEntityId();
      const amount = createMoney(1000n);

      const bet = Bet.create({ userId, roundId, amount }, id);

      expect(bet.id.toString()).toBe("custom-bet-id");
    });
  });

  describe("isPending / isCashedOut / isLost", () => {
    it("should return true for isPending when status is PENDING", () => {
      const bet = Bet.create({
        userId: new UniqueEntityId(),
        roundId: new UniqueEntityId(),
        amount: createMoney(1000n)
      });

      expect(bet.isPending).toBe(true);
      expect(bet.isCashedOut).toBe(false);
      expect(bet.isLost).toBe(false);
    });
  });

  describe("applyCashout", () => {
    it("should apply cashout with correct multiplier and payout", () => {
      const bet = Bet.create({
        userId: new UniqueEntityId(),
        roundId: new UniqueEntityId(),
        amount: createMoney(1000n)
      });

      bet.applyCashout(2.5);

      expect(bet.status).toBe(BetStatus.CASHED_OUT);
      expect(bet.isCashedOut).toBe(true);
      expect(bet.cashoutMultiplier).toBe(2.5);
      expect(bet.payout?.toCents()).toBe(2500n);
    });

    it("should handle multiplier of 1.0", () => {
      const bet = Bet.create({
        userId: new UniqueEntityId(),
        roundId: new UniqueEntityId(),
        amount: createMoney(1000n)
      });

      bet.applyCashout(1.0);

      expect(bet.payout?.toCents()).toBe(1000n);
    });

    it("should handle large multipliers", () => {
      const bet = Bet.create({
        userId: new UniqueEntityId(),
        roundId: new UniqueEntityId(),
        amount: createMoney(1000n)
      });

      bet.applyCashout(100.0);

      expect(bet.payout?.toCents()).toBe(100000n);
    });
  });

  describe("markAsLost", () => {
    it("should mark the bet as lost", () => {
      const bet = Bet.create({
        userId: new UniqueEntityId(),
        roundId: new UniqueEntityId(),
        amount: createMoney(1000n)
      });

      bet.markAsLost();

      expect(bet.status).toBe(BetStatus.LOST);
      expect(bet.isLost).toBe(true);
      expect(bet.isPending).toBe(false);
      expect(bet.cashoutMultiplier).toBeNull();
      expect(bet.payout).toBeNull();
    });
  });

  describe("cancel", () => {
    it("should cancel a pending bet", () => {
      const bet = Bet.create({
        userId: new UniqueEntityId(),
        roundId: new UniqueEntityId(),
        amount: createMoney(1000n)
      });

      bet.cancel();

      expect(bet.status).toBe(BetStatus.CANCELLED);
      expect(bet.isCancelled).toBe(true);
      expect(bet.isPending).toBe(false);
    });

    it("should not alter cashoutMultiplier or payout when cancelled", () => {
      const bet = Bet.create({
        userId: new UniqueEntityId(),
        roundId: new UniqueEntityId(),
        amount: createMoney(1000n)
      });

      bet.cancel();

      expect(bet.cashoutMultiplier).toBeNull();
      expect(bet.payout).toBeNull();
    });
  });

  describe("amount setter", () => {
    it("should update amount", () => {
      const bet = Bet.create({
        userId: new UniqueEntityId(),
        roundId: new UniqueEntityId(),
        amount: createMoney(1000n)
      });

      bet.amount = createMoney(2000n);

      expect(bet.amount.toCents()).toBe(2000n);
    });
  });
});
