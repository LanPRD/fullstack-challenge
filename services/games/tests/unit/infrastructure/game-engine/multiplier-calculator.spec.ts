import {
  calculateMultiplier,
  calculateTimeToMultiplier
} from "@/infrastructure/game-engine/multiplier-calculator";
import { describe, expect, it } from "bun:test";

describe("MultiplierCalculator", () => {
  describe("calculateMultiplier", () => {
    it("should return 1.0 at time 0", () => {
      const multiplier = calculateMultiplier(0);
      expect(multiplier).toBe(1.0);
    });

    it("should increase over time", () => {
      const multiplier1s = calculateMultiplier(1000);
      const multiplier5s = calculateMultiplier(5000);
      const multiplier10s = calculateMultiplier(10000);

      expect(multiplier1s).toBeGreaterThan(1.0);
      expect(multiplier5s).toBeGreaterThan(multiplier1s);
      expect(multiplier10s).toBeGreaterThan(multiplier5s);
    });

    it("should round to 2 decimal places", () => {
      const multiplier = calculateMultiplier(1234);
      const decimalPlaces = multiplier.toString().split(".")[1]?.length ?? 0;

      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it("should grow exponentially", () => {
      // At 10 seconds, should be around 1.82x (e^0.6)
      const multiplier10s = calculateMultiplier(10000);
      expect(multiplier10s).toBeGreaterThan(1.5);
      expect(multiplier10s).toBeLessThan(2.5);
    });
  });

  describe("calculateTimeToMultiplier", () => {
    it("should return 0 for multiplier 1.0", () => {
      const time = calculateTimeToMultiplier(1.0);
      expect(time).toBeCloseTo(0, 1);
    });

    it("should return correct time for target multiplier", () => {
      // Test round-trip: calculate time, then calculate multiplier at that time
      const targetMultiplier = 2.0;
      const time = calculateTimeToMultiplier(targetMultiplier);
      const calculatedMultiplier = calculateMultiplier(time);

      expect(calculatedMultiplier).toBeCloseTo(targetMultiplier, 1);
    });

    it("should return positive time for multipliers > 1", () => {
      const time = calculateTimeToMultiplier(1.5);
      expect(time).toBeGreaterThan(0);
    });
  });
});
