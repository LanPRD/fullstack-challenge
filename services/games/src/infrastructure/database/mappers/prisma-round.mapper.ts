import { ProvablyFair, Round, RoundStatus, UniqueEntityId } from "@/domain";
import type {
  Prisma,
  Bet as PrismaBet,
  Round as PrismaRound,
  RoundStatus as PrismaRoundStatus
} from "../prisma/generated/client";
import { PrismaBetMapper } from "./prisma-bet.mapper";

type PrismaRoundWithBets = PrismaRound & { bets?: PrismaBet[] };

export class PrismaRoundMapper {
  static toDomain(raw: PrismaRoundWithBets): Round {
    const provablyFair = ProvablyFair.fromExisting(
      raw.serverSeed,
      raw.serverSeedHash,
      Number(raw.crashPoint)
    );

    const id = new UniqueEntityId(raw.id);

    const round = new Round(
      {
        status: PrismaRoundMapper.mapStatus(raw.status),
        provablyFair,
        startedAt: raw.startedAt,
        endedAt: raw.endedAt,
        crashedAt: raw.crashedAt,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
      },
      id
    );

    if (raw.bets) {
      for (const bet of raw.bets) {
        round.addBet(PrismaBetMapper.toDomain(bet));
      }
    }

    return round;
  }

  static toPrisma(round: Round): Prisma.RoundUncheckedCreateInput {
    return {
      id: round.id.toString(),
      status: round.status,
      serverSeed: round.provablyFair.serverSeed,
      serverSeedHash: round.provablyFair.serverSeedHash,
      crashPoint: round.crashPoint,
      startedAt: round.startedAt,
      endedAt: round.endedAt,
      crashedAt: round.crashedAt,
      createdAt: round.createdAt,
      updatedAt: round.updatedAt
    };
  }

  private static mapStatus(status: PrismaRoundStatus): RoundStatus {
    const statusMap: Record<PrismaRoundStatus, RoundStatus> = {
      BETTING: RoundStatus.BETTING,
      RUNNING: RoundStatus.RUNNING,
      CRASHED: RoundStatus.CRASHED
    };
    return statusMap[status];
  }
}
