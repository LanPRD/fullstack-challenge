import type { Bet } from "@/domain";

export class BetResponseDto {
  id: string;
  userId: string;
  roundId: string;
  status: string;
  amount: number;
  cashoutMultiplier: number | null;
  payout: number | null;
  createdAt: Date;

  static fromDomain(bet: Bet): BetResponseDto {
    return {
      id: bet.id.toString(),
      userId: bet.userId.toString(),
      roundId: bet.roundId.toString(),
      status: bet.status,
      amount: Number(bet.amount.toCents()) / 100,
      cashoutMultiplier: bet.cashoutMultiplier,
      payout: bet.payout ? Number(bet.payout.toCents()) / 100 : null,
      createdAt: bet.createdAt
    };
  }
}
