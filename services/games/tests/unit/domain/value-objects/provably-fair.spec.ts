import { describe, expect, it } from "bun:test";
import { ProvablyFair } from "@/domain/value-objects";

describe("ProvablyFair", () => {
  describe("generate", () => {
    it("should generate valid serverSeed with 64 hex characters", () => {
      const pf = ProvablyFair.generate();

      expect(pf.serverSeed).toHaveLength(64);
      expect(pf.serverSeed).toMatch(/^[a-f0-9]+$/);
    });

    it("should generate valid serverSeedHash with 64 hex characters", () => {
      const pf = ProvablyFair.generate();

      expect(pf.serverSeedHash).toHaveLength(64);
      expect(pf.serverSeedHash).toMatch(/^[a-f0-9]+$/);
    });

    it("should generate crashPoint >= 1.00", () => {
      const pf = ProvablyFair.generate();

      expect(pf.crashPoint).toBeGreaterThanOrEqual(1.0);
    });

    it("should generate different seeds on each call", () => {
      const pf1 = ProvablyFair.generate();
      const pf2 = ProvablyFair.generate();

      expect(pf1.serverSeed).not.toBe(pf2.serverSeed);
    });
  });

  describe("verify", () => {
    it("should return true for valid seed and hash pair", () => {
      const pf = ProvablyFair.generate();

      const isValid = ProvablyFair.verify(pf.serverSeed, pf.serverSeedHash);

      expect(isValid).toBe(true);
    });

    it("should return false for invalid hash", () => {
      const pf = ProvablyFair.generate();
      const wrongHash = "0".repeat(64);

      const isValid = ProvablyFair.verify(pf.serverSeed, wrongHash);

      expect(isValid).toBe(false);
    });

    it("should return false for tampered seed", () => {
      const pf = ProvablyFair.generate();
      const tamperedSeed = "a".repeat(64);

      const isValid = ProvablyFair.verify(tamperedSeed, pf.serverSeedHash);

      expect(isValid).toBe(false);
    });
  });

  describe("calculateCrashPoint", () => {
    it("should be deterministic (same seed = same result)", () => {
      const seed = "a".repeat(64);

      const result1 = ProvablyFair.calculateCrashPoint(seed);
      const result2 = ProvablyFair.calculateCrashPoint(seed);

      expect(result1).toBe(result2);
    });

    it("should return different results for different seeds", () => {
      const seed1 = "a".repeat(64);
      const seed2 = "b".repeat(64);

      const result1 = ProvablyFair.calculateCrashPoint(seed1);
      const result2 = ProvablyFair.calculateCrashPoint(seed2);

      expect(result1).not.toBe(result2);
    });
  });

  describe("fromExisting", () => {
    it("should reconstruct ProvablyFair with given values", () => {
      const serverSeed = "a".repeat(64);
      const serverSeedHash = "b".repeat(64);
      const crashPoint = 2.5;

      const pf = ProvablyFair.fromExisting(
        serverSeed,
        serverSeedHash,
        crashPoint
      );

      expect(pf.serverSeed).toBe(serverSeed);
      expect(pf.serverSeedHash).toBe(serverSeedHash);
      expect(pf.crashPoint).toBe(crashPoint);
    });
  });
});
