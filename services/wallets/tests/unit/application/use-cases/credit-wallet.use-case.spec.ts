import { CreditWalletUseCase } from "@/application/use-cases/wallet";
import { UniqueEntityId } from "@/domain";
import type { GamesEventService } from "@/infrastructure/messaging/games-event.service";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { WalletFactory } from "../../../factories/wallet-factory";
import { InMemoryWalletRepository } from "../../../repositories";

describe("CreditWalletUseCase", () => {
  let sut: CreditWalletUseCase;
  let walletRepository: InMemoryWalletRepository;
  let gamesEventService: GamesEventService;

  beforeEach(() => {
    walletRepository = new InMemoryWalletRepository();
    gamesEventService = {
      emitDebited: mock(() => Promise.resolve()),
      emitDebitFailed: mock(() => Promise.resolve()),
      emitCredited: mock(() => Promise.resolve()),
      emitCreditFailed: mock(() => Promise.resolve())
    } as unknown as GamesEventService;
    sut = new CreditWalletUseCase(walletRepository, gamesEventService);
  });

  function makeCommand(userId: string, overrides = {}) {
    return {
      correlationId: "corr-456",
      userId,
      amount: 2_500,
      roundId: "round-456",
      betId: "bet-456",
      reason: "cashout" as const,
      ...overrides
    };
  }

  describe("execute", () => {
    it("should credit wallet and emit credited event", async () => {
      const userId = new UniqueEntityId();
      const wallet = WalletFactory.build({ userId, balance: WalletFactory.createMoney(5_000n) });
      await walletRepository.save(wallet);

      await sut.execute(makeCommand(userId.toString()));

      const saved = await walletRepository.findByUserId(userId);
      expect(saved?.balance.toCents()).toBe(7_500n);
      expect(gamesEventService.emitCredited).toHaveBeenCalledTimes(1);
      expect(gamesEventService.emitCreditFailed).not.toHaveBeenCalled();
    });

    it("should emit credit_failed when wallet not found", async () => {
      await sut.execute(makeCommand(new UniqueEntityId().toString()));

      expect(gamesEventService.emitCreditFailed).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "wallet_not_found" })
      );
      expect(gamesEventService.emitCredited).not.toHaveBeenCalled();
    });

    it("should credit from zero balance", async () => {
      const userId = new UniqueEntityId();
      const wallet = WalletFactory.build({ userId, balance: WalletFactory.createMoney(0n) });
      await walletRepository.save(wallet);

      await sut.execute(makeCommand(userId.toString(), { amount: 10_000 }));

      const saved = await walletRepository.findByUserId(userId);
      expect(saved?.balance.toCents()).toBe(10_000n);
    });

    it("should emit credit_failed when repository throws", async () => {
      const userId = new UniqueEntityId();
      const wallet = WalletFactory.build({ userId });
      await walletRepository.save(wallet);

      spyOn(walletRepository, "save").mockRejectedValueOnce(new Error("DB error"));

      await sut.execute(makeCommand(userId.toString()));

      expect(gamesEventService.emitCreditFailed).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "internal_error" })
      );
    });

    it("should handle refund reason", async () => {
      const userId = new UniqueEntityId();
      const wallet = WalletFactory.build({ userId, balance: WalletFactory.createMoney(0n) });
      await walletRepository.save(wallet);

      await sut.execute(makeCommand(userId.toString(), { reason: "refund", amount: 5_000 }));

      const saved = await walletRepository.findByUserId(userId);
      expect(saved?.balance.toCents()).toBe(5_000n);
      expect(gamesEventService.emitCredited).toHaveBeenCalledTimes(1);
    });

    it("should include newBalance in credited event", async () => {
      const userId = new UniqueEntityId();
      const wallet = WalletFactory.build({ userId, balance: WalletFactory.createMoney(1_000n) });
      await walletRepository.save(wallet);

      await sut.execute(makeCommand(userId.toString(), { amount: 4_000 }));

      expect(gamesEventService.emitCredited).toHaveBeenCalledWith(
        expect.objectContaining({ newBalance: 5_000 })
      );
    });
  });
});
