import { InternalException } from "@/application/errors";
import { CreateRoundUseCase } from "@/application/use-cases/round/create-round.use-case";
import { RoundStatus } from "@/domain";
import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { InMemoryRoundRepository } from "../../../repositories";

describe("CreateRoundUseCase", () => {
  let sut: CreateRoundUseCase;
  let roundRepository: InMemoryRoundRepository;

  beforeEach(() => {
    roundRepository = new InMemoryRoundRepository();
    sut = new CreateRoundUseCase(roundRepository);
  });

  describe("execute", () => {
    it("should create a new round successfully", async () => {
      const result = await sut.execute();

      expect(result.isRight()).toBe(true);

      if (result.isRight()) {
        expect(result.value.status).toBe(RoundStatus.BETTING);
        expect(result.value.isBetting).toBe(true);
        expect(result.value.provablyFair).toBeDefined();
        expect(result.value.crashPoint).toBeGreaterThanOrEqual(1);
      }
    });

    it("should save round to repository", async () => {
      const result = await sut.execute();

      expect(result.isRight()).toBe(true);

      const rounds = roundRepository.getRounds();
      expect(rounds).toHaveLength(1);
    });

    it("should generate unique provably fair data", async () => {
      const result1 = await sut.execute();
      const result2 = await sut.execute();

      expect(result1.isRight()).toBe(true);
      expect(result2.isRight()).toBe(true);

      if (result1.isRight() && result2.isRight()) {
        expect(result1.value.provablyFair.serverSeed).not.toBe(
          result2.value.provablyFair.serverSeed
        );
      }
    });

    it("should return error when repository save fails", async () => {
      spyOn(roundRepository, "save").mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await sut.execute();

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(InternalException);
        expect(result.value.message).toBe("Error creating round");
      }
    });
  });
});
