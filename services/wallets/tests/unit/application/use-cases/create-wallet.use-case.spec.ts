import { ConflictException, InternalException } from "@/application/errors";
import { CreateWalletUseCase } from "@/application/use-cases/wallet";
import { UniqueEntityId } from "@/domain";
import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { WalletFactory } from "../../../factories/wallet-factory";
import { InMemoryWalletRepository } from "../../../repositories";

describe("CreateWalletUseCase", () => {
  let sut: CreateWalletUseCase;
  let walletRepository: InMemoryWalletRepository;

  beforeEach(() => {
    walletRepository = new InMemoryWalletRepository();
    sut = new CreateWalletUseCase(walletRepository);
  });

  describe("execute", () => {
    it("should create a wallet with zero balance", async () => {
      const userId = new UniqueEntityId().toString();

      const result = await sut.execute({ userId });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.userId.toString()).toBe(userId);
        expect(result.value.balance.toCents()).toBe(0n);
      }
    });

    it("should create a wallet with initial balance", async () => {
      const result = await sut.execute({
        userId: new UniqueEntityId().toString(),
        initialBalanceCents: 100_00
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.balance.toCents()).toBe(10_000n);
      }
    });

    it("should persist the wallet", async () => {
      const userId = new UniqueEntityId().toString();

      await sut.execute({ userId });

      const saved = await walletRepository.findByUserId(
        new UniqueEntityId(userId)
      );
      expect(saved).not.toBeNull();
    });

    it("should return error when wallet already exists", async () => {
      const userId = new UniqueEntityId();
      const existing = WalletFactory.build({ userId });
      await walletRepository.save(existing);

      const result = await sut.execute({ userId: userId.toString() });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(ConflictException);
      }
    });

    it("should return error when repository throws", async () => {
      spyOn(walletRepository, "save").mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await sut.execute({
        userId: new UniqueEntityId().toString()
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value).toBeInstanceOf(InternalException);
      }
    });
  });
});
