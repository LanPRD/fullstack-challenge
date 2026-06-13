import type { UniqueEntityId, Wallet } from "../entities";

export abstract class WalletRepository {
  abstract findById(id: UniqueEntityId): Promise<Wallet | null>;
  abstract findByUserId(userId: UniqueEntityId): Promise<Wallet | null>;
  abstract save(wallet: Wallet): Promise<void>;
}
