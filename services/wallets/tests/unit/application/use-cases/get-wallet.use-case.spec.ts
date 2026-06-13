import { NotFoundException } from "@/application/errors";
import { GetWalletUseCase } from "@/application/use-cases/wallet";
import { UniqueEntityId } from "@/domain";
import { beforeEach, describe, expect, it } from "bun:test";
import { WalletFactory } from "../../../factories/wallet-factory";
import { InMemoryWalletRepository } from "../../../repositories";

describe("GetWalletUseCase", () => {
  let sut: GetWalletUseCase;
  let walletRepository: InMemoryWalletRepository;

  beforeEach(() => {
    walletRepository = new InMemoryWalletRepository();
    sut = new GetWalletUseCase(walletRepository);
  });

  describe("execute", () => {
    it("should return the wallet for the given userId", async () => {
      const userId = new UniqueEntityId();
      const wallet = WalletFactory.build({ userId });
      await walletRepository.save(wallet);

      const result = await sut.execute({ userId: userId.toString() });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.userId.toString()).toBe(userId.toString());
      }
    });

    it("should return error when wallet is not found", async () => {
      const result = await sut.execute({
        userId: new UniqueEntityId().toString()
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(NotFoundException);
        expect(result.value.message).toBe("Wallet not found");
      }
    });

    it("should return the correct balance", async () => {
      const userId = new UniqueEntityId();
      const wallet = WalletFactory.build({
        userId,
        balance: WalletFactory.createMoney(50_000n)
      });
      await walletRepository.save(wallet);

      const result = await sut.execute({ userId: userId.toString() });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.balance.toCents()).toBe(50_000n);
      }
    });
  });
});
