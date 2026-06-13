import { UniqueEntityId, Wallet, WalletRepository } from "@/domain";

export class InMemoryWalletRepository implements WalletRepository {
  private wallets: Wallet[] = [];

  async findById(id: UniqueEntityId): Promise<Wallet | null> {
    return this.wallets.find(w => w.id.toString() === id.toString()) ?? null;
  }

  async findByUserId(userId: UniqueEntityId): Promise<Wallet | null> {
    return (
      this.wallets.find(w => w.userId.toString() === userId.toString()) ?? null
    );
  }

  async save(wallet: Wallet): Promise<void> {
    const index = this.wallets.findIndex(
      w => w.id.toString() === wallet.id.toString()
    );

    if (index >= 0) {
      this.wallets[index] = wallet;
    } else {
      this.wallets.push(wallet);
    }
  }

  clear(): void {
    this.wallets = [];
  }

  getAll(): Wallet[] {
    return this.wallets;
  }
}
