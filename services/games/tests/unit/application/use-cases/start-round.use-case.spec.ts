import {
  BadRequestException,
  InternalException,
  NotFoundException
} from "@/application/errors";
import { StartRoundUseCase } from "@/application/use-cases/round/start-round.use-case";
import { Round, RoundStatus } from "@/domain";
import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { InMemoryRoundRepository } from "../../../repositories";

describe("StartRoundUseCase", () => {
  let sut: StartRoundUseCase;
  let roundRepository: InMemoryRoundRepository;

  beforeEach(() => {
    roundRepository = new InMemoryRoundRepository();
    sut = new StartRoundUseCase(roundRepository);
  });

  describe("execute", () => {
    it("should start round successfully", async () => {
      const round = Round.create({ startedAt: new Date() });
      roundRepository.save(round);

      const result = await sut.execute();

      expect(result.isRight()).toBe(true);

      if (result.isRight()) {
        expect(result.value.status).toBe(RoundStatus.RUNNING);
        expect(result.value.isRunning).toBe(true);
      }

      // Verify round was saved
      const savedRound = await roundRepository.findCurrent();
      expect(savedRound?.isRunning).toBe(true);
    });

    it("should return error when no active round exists", async () => {
      const result = await sut.execute();

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(NotFoundException);
        expect(result.value.message).toBe("No active round");
      }
    });

    it("should return error when round is already running", async () => {
      const round = Round.create({ startedAt: new Date() });
      round.startRound(); // Already started
      roundRepository.save(round);

      const result = await sut.execute();

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(BadRequestException);
      }
    });

    it("should return error when round is already crashed", async () => {
      const round = Round.create({ startedAt: new Date() });
      round.startRound();
      round.crash();
      roundRepository.save(round);

      // Need a new round in betting to have a "current" round
      // But since crashed rounds are not "current", this should return not found
      roundRepository.clear();

      const crashedRound = Round.create({ startedAt: new Date() });
      crashedRound.startRound();
      crashedRound.crash();
      roundRepository.save(crashedRound);

      const result = await sut.execute();

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(NotFoundException);
      }
    });

    it("should return error when repository save fails", async () => {
      const round = Round.create({ startedAt: new Date() });
      roundRepository.save(round);

      spyOn(roundRepository, "save").mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await sut.execute();

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(InternalException);
        expect(result.value.message).toBe("Error starting round");
      }
    });
  });
});
