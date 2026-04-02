import { Bet, BetStatus, Money, UniqueEntityId } from "@/domain";
import type {
  Prisma,
  Bet as PrismaBet,
  BetStatus as PrismaBetStatus
} from "../prisma/generated/client";

export class PrismaBetMapper {
  static toDomain(raw: PrismaBet): Bet {
    const moneyResult = Money.fromCents(BigInt(raw.amount));

    if (moneyResult.isLeft()) {
      throw new Error("Invalid amount in database");
    }

    let payout: Money | null = null;

    if (raw.payout !== null) {
      const payoutResult = Money.fromCents(raw.payout);

      if (payoutResult.isRight()) {
        payout = payoutResult.value;
      }
    }

    return new Bet(
      {
        userId: new UniqueEntityId(raw.userId),
        roundId: new UniqueEntityId(raw.roundId),
        status: PrismaBetMapper.mapStatus(raw.status),
        amount: moneyResult.value,
        cashoutMultiplier:
          raw.cashoutMultiplier ? Number(raw.cashoutMultiplier) : null,
        payout,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
      },
      new UniqueEntityId(raw.id)
    );
  }

  static toPrisma(bet: Bet): Prisma.BetUncheckedCreateInput {
    return {
      id: bet.id.toString(),
      userId: bet.userId.toString(),
      roundId: bet.roundId.toString(),
      status: bet.status as PrismaBetStatus,
      amount: Number(bet.amount.toCents()),
      cashoutMultiplier: bet.cashoutMultiplier ?? null,
      payout: bet.payout ? bet.payout.toCents() : null,
      createdAt: bet.createdAt,
      updatedAt: new Date()
    };
  }

  private static mapStatus(status: PrismaBetStatus): BetStatus {
    const statusMap: Record<PrismaBetStatus, BetStatus> = {
      PENDING: BetStatus.PENDING,
      CASHED_OUT: BetStatus.CASHED_OUT,
      LOST: BetStatus.LOST
    };
    return statusMap[status];
  }
}
