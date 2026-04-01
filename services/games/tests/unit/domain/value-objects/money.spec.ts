import { describe, expect, it } from "bun:test";
import { Money } from "@/domain/value-objects";

describe("Money", () => {
  describe("fromCents", () => {
    it("should create Money with valid positive cents", () => {
      const result = Money.fromCents(1000n);

      expect(result.isRight()).toBe(true);

      if (result.isRight()) {
        expect(result.value.toCents()).toBe(1000n);
      }
    });

    it("should create Money with zero cents", () => {
      const result = Money.fromCents(0n);

      expect(result.isRight()).toBe(true);

      if (result.isRight()) {
        expect(result.value.toCents()).toBe(0n);
      }
    });

    it("should return Left for negative cents", () => {
      const result = Money.fromCents(-100n);

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value.message).toBe("Money cannot be negative");
      }
    });
  });

  describe("toCents", () => {
    it("should return cents as bigint", () => {
      const result = Money.fromCents(1500n);

      if (result.isRight()) {
        expect(result.value.toCents()).toBe(1500n);
      }
    });
  });

  describe("toNumber", () => {
    it("should convert cents to number", () => {
      const result = Money.fromCents(1500n);

      if (result.isRight()) {
        expect(result.value.toNumber()).toBe(1500);
      }
    });
  });

  describe("add", () => {
    it("should add two Money values correctly", () => {
      const money1Result = Money.fromCents(1000n);
      const money2Result = Money.fromCents(500n);

      if (money1Result.isRight() && money2Result.isRight()) {
        const sum = money1Result.value.add(money2Result.value);

        expect(sum.toCents()).toBe(1500n);
      }
    });
  });

  describe("subtract", () => {
    it("should subtract Money when sufficient funds", () => {
      const money1Result = Money.fromCents(1000n);
      const money2Result = Money.fromCents(300n);

      if (money1Result.isRight() && money2Result.isRight()) {
        const result = money1Result.value.subtract(money2Result.value);

        expect(result.isRight()).toBe(true);

        if (result.isRight()) {
          expect(result.value.toCents()).toBe(700n);
        }
      }
    });

    it("should return Left when insufficient funds", () => {
      const money1Result = Money.fromCents(100n);
      const money2Result = Money.fromCents(500n);

      if (money1Result.isRight() && money2Result.isRight()) {
        const result = money1Result.value.subtract(money2Result.value);

        expect(result.isLeft()).toBe(true);

        if (result.isLeft()) {
          expect(result.value.message).toBe("Insufficient funds");
        }
      }
    });

    it("should return zero when subtracting equal amounts", () => {
      const money1Result = Money.fromCents(500n);
      const money2Result = Money.fromCents(500n);

      if (money1Result.isRight() && money2Result.isRight()) {
        const result = money1Result.value.subtract(money2Result.value);

        expect(result.isRight()).toBe(true);

        if (result.isRight()) {
          expect(result.value.toCents()).toBe(0n);
        }
      }
    });
  });

  describe("multiply", () => {
    it("should multiply Money by multiplier correctly", () => {
      const moneyResult = Money.fromCents(1000n); // R$ 10,00

      if (moneyResult.isRight()) {
        const result = moneyResult.value.multiply(1.5);

        expect(result.toCents()).toBe(1500n); // R$ 15,00
      }
    });

    it("should floor the result", () => {
      const moneyResult = Money.fromCents(1000n);

      if (moneyResult.isRight()) {
        const result = moneyResult.value.multiply(1.555);

        expect(result.toCents()).toBe(1555n);
      }
    });

    it("should handle multiplier less than 1", () => {
      const moneyResult = Money.fromCents(1000n);

      if (moneyResult.isRight()) {
        const result = moneyResult.value.multiply(0.5);

        expect(result.toCents()).toBe(500n);
      }
    });
  });

  describe("equals", () => {
    it("should return true for equal Money values", () => {
      const money1Result = Money.fromCents(1000n);
      const money2Result = Money.fromCents(1000n);

      if (money1Result.isRight() && money2Result.isRight()) {
        expect(money1Result.value.equals(money2Result.value)).toBe(true);
      }
    });

    it("should return false for different Money values", () => {
      const money1Result = Money.fromCents(1000n);
      const money2Result = Money.fromCents(2000n);

      if (money1Result.isRight() && money2Result.isRight()) {
        expect(money1Result.value.equals(money2Result.value)).toBe(false);
      }
    });
  });
});
