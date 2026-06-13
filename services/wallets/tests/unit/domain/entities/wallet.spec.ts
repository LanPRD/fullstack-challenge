import { UniqueEntityId, Wallet } from "@/domain/entities";
import { Money } from "@/domain/value-objects";
import { describe, expect, it } from "bun:test";

function createMoney(cents: bigint): Money {
  const result = Money.fromCents(cents);
  if (result.isLeft()) throw new Error("Failed to create Money");
  return result.value;
}

describe("Wallet", () => {
  describe("create", () => {
    it("should create a wallet with zero balance by default", () => {
      const userId = new UniqueEntityId();
      const wallet = Wallet.create({ userId, balance: createMoney(0n) });

      expect(wallet.userId.toString()).toBe(userId.toString());
      expect(wallet.balance.toCents()).toBe(0n);
    });

    it("should create a wallet with initial balance", () => {
      const wallet = Wallet.create({
        userId: new UniqueEntityId(),
        balance: createMoney(10_000n)
      });

      expect(wallet.balance.toCents()).toBe(10_000n);
    });

    it("should generate a unique id", () => {
      const w1 = Wallet.create({ userId: new UniqueEntityId(), balance: createMoney(0n) });
      const w2 = Wallet.create({ userId: new UniqueEntityId(), balance: createMoney(0n) });

      expect(w1.id.toString()).not.toBe(w2.id.toString());
    });
  });

  describe("credit", () => {
    it("should add funds to balance", () => {
      const wallet = Wallet.create({
        userId: new UniqueEntityId(),
        balance: createMoney(1_000n)
      });

      wallet.credit(createMoney(500n));

      expect(wallet.balance.toCents()).toBe(1_500n);
    });

    it("should credit from zero balance", () => {
      const wallet = Wallet.create({
        userId: new UniqueEntityId(),
        balance: createMoney(0n)
      });

      wallet.credit(createMoney(5_000n));

      expect(wallet.balance.toCents()).toBe(5_000n);
    });

    it("should accumulate multiple credits", () => {
      const wallet = Wallet.create({
        userId: new UniqueEntityId(),
        balance: createMoney(0n)
      });

      wallet.credit(createMoney(1_000n));
      wallet.credit(createMoney(2_000n));
      wallet.credit(createMoney(3_000n));

      expect(wallet.balance.toCents()).toBe(6_000n);
    });
  });

  describe("debit", () => {
    it("should subtract funds from balance", () => {
      const wallet = Wallet.create({
        userId: new UniqueEntityId(),
        balance: createMoney(10_000n)
      });

      const result = wallet.debit(createMoney(3_000n));

      expect(result.isRight()).toBe(true);
      expect(wallet.balance.toCents()).toBe(7_000n);
    });

    it("should allow debiting exact balance", () => {
      const wallet = Wallet.create({
        userId: new UniqueEntityId(),
        balance: createMoney(5_000n)
      });

      const result = wallet.debit(createMoney(5_000n));

      expect(result.isRight()).toBe(true);
      expect(wallet.balance.toCents()).toBe(0n);
    });

    it("should return error when funds are insufficient", () => {
      const wallet = Wallet.create({
        userId: new UniqueEntityId(),
        balance: createMoney(1_000n)
      });

      const result = wallet.debit(createMoney(2_000n));

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(Error);
    });

    it("should not change balance when debit fails", () => {
      const wallet = Wallet.create({
        userId: new UniqueEntityId(),
        balance: createMoney(1_000n)
      });

      wallet.debit(createMoney(5_000n));

      expect(wallet.balance.toCents()).toBe(1_000n);
    });

    it("should return error when debiting from zero balance", () => {
      const wallet = Wallet.create({
        userId: new UniqueEntityId(),
        balance: createMoney(0n)
      });

      const result = wallet.debit(createMoney(1n));

      expect(result.isLeft()).toBe(true);
    });
  });
});
