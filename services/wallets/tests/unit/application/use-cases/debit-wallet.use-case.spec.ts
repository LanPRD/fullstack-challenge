import { DebitWalletUseCase } from "@/application/use-cases/wallet";
import { UniqueEntityId } from "@/domain";
import type { GamesEventService } from "@/infrastructure/messaging/games-event.service";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { WalletFactory } from "../../../factories/wallet-factory";
import { InMemoryWalletRepository } from "../../../repositories";

describe("DebitWalletUseCase", () => {
  let sut: DebitWalletUseCase;
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
    sut = new DebitWalletUseCase(walletRepository, gamesEventService);
  });

  function makeCommand(userId: string, overrides = {}) {
    return {
      correlationId: "corr-123",
      userId,
      amount: 1_000,
      roundId: "round-123",
      betId: "bet-123",
      ...overrides
    };
  }

  describe("execute", () => {
    it("should debit wallet and emit debited event", async () => {
      const userId = new UniqueEntityId();
      const wallet = WalletFactory.build({
        userId,
        balance: WalletFactory.createMoney(10_000n)
      });
      await walletRepository.save(wallet);

      await sut.execute(makeCommand(userId.toString()));

      const saved = await walletRepository.findByUserId(userId);
      expect(saved?.balance.toCents()).toBe(9_000n);
      expect(gamesEventService.emitDebited).toHaveBeenCalledTimes(1);
      expect(gamesEventService.emitDebitFailed).not.toHaveBeenCalled();
    });

    it("should emit debit_failed when wallet not found", async () => {
      await sut.execute(makeCommand(new UniqueEntityId().toString()));

      expect(gamesEventService.emitDebitFailed).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "wallet_not_found" })
      );
      expect(gamesEventService.emitDebited).not.toHaveBeenCalled();
    });

    it("should emit debit_failed when insufficient funds", async () => {
      const userId = new UniqueEntityId();
      const wallet = WalletFactory.build({
        userId,
        balance: WalletFactory.createMoney(500n)
      });
      await walletRepository.save(wallet);

      await sut.execute(makeCommand(userId.toString(), { amount: 1_000 }));

      expect(gamesEventService.emitDebitFailed).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "insufficient_funds" })
      );
      expect(wallet.balance.toCents()).toBe(500n);
    });

    it("should emit debit_failed when repository throws", async () => {
      const userId = new UniqueEntityId();
      const wallet = WalletFactory.build({
        userId,
        balance: WalletFactory.createMoney(10_000n)
      });
      await walletRepository.save(wallet);

      spyOn(walletRepository, "save").mockRejectedValueOnce(
        new Error("DB error")
      );

      await sut.execute(makeCommand(userId.toString()));

      expect(gamesEventService.emitDebitFailed).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "internal_error" })
      );
    });

    it("should pass correct correlationId and betId in events", async () => {
      const userId = new UniqueEntityId();
      const wallet = WalletFactory.build({
        userId,
        balance: WalletFactory.createMoney(10_000n)
      });
      await walletRepository.save(wallet);

      const command = makeCommand(userId.toString(), {
        correlationId: "my-corr",
        betId: "my-bet"
      });
      await sut.execute(command);

      expect(gamesEventService.emitDebited).toHaveBeenCalledWith(
        expect.objectContaining({ correlationId: "my-corr", betId: "my-bet" })
      );
    });
  });
});
