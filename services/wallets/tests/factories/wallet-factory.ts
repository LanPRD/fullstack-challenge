import { Money, UniqueEntityId, Wallet, type WalletProps } from "@/domain";

export class WalletFactory {
  static build(
    overrides: Partial<WalletProps> = {},
    id?: UniqueEntityId
  ): Wallet {
    return Wallet.create(
      {
        userId: new UniqueEntityId(),
        balance: WalletFactory.createMoney(100_00n), // R$100,00
        ...overrides
      },
      id ?? new UniqueEntityId()
    );
  }

  static createMoney(cents: bigint): Money {
    const result = Money.fromCents(cents);
    if (result.isLeft()) throw new Error("Failed to create Money");
    return result.value;
  }
}
