import { Bet, Money, UniqueEntityId, type BetProps } from "@/domain";

export class BetFactory {
  static build(
    overrides: Partial<BetProps> = {},
    userId?: UniqueEntityId,
    roundId?: UniqueEntityId,
    id?: UniqueEntityId
  ): Bet {
    return Bet.create(
      {
        userId: userId ?? new UniqueEntityId(),
        amount: BetFactory.createMoney(BigInt(10000)),
        roundId: roundId ?? new UniqueEntityId(),
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
