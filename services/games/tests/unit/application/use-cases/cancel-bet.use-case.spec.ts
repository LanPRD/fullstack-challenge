import { CancelBetUseCase } from "@/application/use-cases/round/cancel-bet.use-case";
import { BetStatus, UniqueEntityId } from "@/domain";
import type { WalletDebitFailedEvent } from "@/infrastructure/messaging/contracts/events";
import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { BetFactory } from "../../../factories/bet-factory";
import { InMemoryBetRepository } from "../../../repositories";

describe("CancelBetUseCase", () => {
  let sut: CancelBetUseCase;
  let betRepository: InMemoryBetRepository;

  beforeEach(() => {
    betRepository = new InMemoryBetRepository();
    sut = new CancelBetUseCase(betRepository);
  });

  function makeEvent(
    betId: string,
    overrides: Partial<WalletDebitFailedEvent> = {}
  ): WalletDebitFailedEvent {
    return {
      correlationId: "corr-123",
      userId: "user-123",
      amount: 1000,
      roundId: "round-123",
      betId,
      reason: "insufficient_funds",
      ...overrides
    };
  }

  describe("handle", () => {
    it("should cancel a PENDING bet when debit fails", async () => {
      const bet = BetFactory.build();
      await betRepository.save(bet);

      await sut.handle(makeEvent(bet.id.toString()));

      const saved = await betRepository.findById(bet.id);
      expect(saved?.status).toBe(BetStatus.CANCELLED);
      expect(saved?.isCancelled).toBe(true);
    });

    it("should do nothing when bet is not found", async () => {
      const saveSpy = spyOn(betRepository, "save");

      await sut.handle(makeEvent(new UniqueEntityId().toString()));

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it("should not cancel a bet that is already CASHED_OUT", async () => {
      const bet = BetFactory.build();
      bet.applyCashout(2.5);
      await betRepository.save(bet);

      await sut.handle(makeEvent(bet.id.toString()));

      const saved = await betRepository.findById(bet.id);
      expect(saved?.status).toBe(BetStatus.CASHED_OUT);
    });

    it("should not cancel a bet that is already LOST", async () => {
      const bet = BetFactory.build();
      bet.markAsLost();
      await betRepository.save(bet);

      await sut.handle(makeEvent(bet.id.toString()));

      const saved = await betRepository.findById(bet.id);
      expect(saved?.status).toBe(BetStatus.LOST);
    });

    it("should not cancel a bet that is already CANCELLED", async () => {
      const bet = BetFactory.build();
      bet.cancel();
      await betRepository.save(bet);

      const saveSpy = spyOn(betRepository, "save");
      await sut.handle(makeEvent(bet.id.toString()));

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it("should handle wallet_not_found reason", async () => {
      const bet = BetFactory.build();
      await betRepository.save(bet);

      await sut.handle(
        makeEvent(bet.id.toString(), { reason: "wallet_not_found" })
      );

      const saved = await betRepository.findById(bet.id);
      expect(saved?.status).toBe(BetStatus.CANCELLED);
    });

    it("should handle internal_error reason", async () => {
      const bet = BetFactory.build();
      await betRepository.save(bet);

      await sut.handle(
        makeEvent(bet.id.toString(), { reason: "internal_error" })
      );

      const saved = await betRepository.findById(bet.id);
      expect(saved?.status).toBe(BetStatus.CANCELLED);
    });
  });
});
