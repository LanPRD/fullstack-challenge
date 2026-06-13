import { Money, UniqueEntityId, Wallet } from "@/domain";
import type {
  Prisma,
  Wallet as PrismaWallet
} from "../prisma/generated/client";

export class PrismaWalletMapper {
  static toDomain(raw: PrismaWallet): Wallet {
    const balanceResult = Money.fromCents(raw.balance);

    if (balanceResult.isLeft()) {
      throw new Error("Invalid balance in database");
    }

    return new Wallet(
      {
        userId: new UniqueEntityId(raw.userId),
        balance: balanceResult.value,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
      },
      new UniqueEntityId(raw.id)
    );
  }

  static toPrisma(wallet: Wallet): Prisma.WalletUncheckedCreateInput {
    return {
      id: wallet.id.toString(),
      userId: wallet.userId.toString(),
      balance: wallet.balance.toCents(),
      createdAt: wallet.createdAt,
      updatedAt: new Date()
    };
  }
}
