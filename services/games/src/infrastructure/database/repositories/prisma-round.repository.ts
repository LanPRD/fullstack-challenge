import {
  Round,
  RoundRepository,
  UniqueEntityId,
  type PaginatedResult,
  type PaginationOptions
} from "@/domain";
import { Injectable } from "@nestjs/common";
import { PrismaRoundMapper } from "../mappers";
import { PrismaBetMapper } from "../mappers/prisma-bet.mapper";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrismaRoundRepository implements RoundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: UniqueEntityId): Promise<Round | null> {
    const round = await this.prisma.round.findUnique({
      where: { id: id.toString() },
      include: { bets: true }
    });

    if (!round) return null;

    return PrismaRoundMapper.toDomain(round);
  }

  async findCurrent(): Promise<Round | null> {
    const raw = await this.prisma.round.findFirst({
      where: {
        status: { in: ["BETTING", "RUNNING"] }
      },
      include: { bets: true },
      orderBy: { createdAt: "desc" }
    });

    if (!raw) {
      return null;
    }

    const round = PrismaRoundMapper.toDomain(raw);

    return round;
  }

  async findMany(options: PaginationOptions): Promise<PaginatedResult<Round>> {
    const { limit, offset } = options;

    const [rounds, total] = await Promise.all([
      this.prisma.round.findMany({
        where: { status: "CRASHED" },
        include: { bets: true },
        orderBy: { crashedAt: "desc" },
        take: limit,
        skip: offset
      }),
      this.prisma.round.count({
        where: { status: "CRASHED" }
      })
    ]);

    return {
      data: rounds.map(PrismaRoundMapper.toDomain),
      total,
      limit,
      offset
    };
  }

  async save(round: Round): Promise<void> {
    const data = PrismaRoundMapper.toPrisma(round);

    await this.prisma.$transaction(async tx => {
      // Upsert the round
      await tx.round.upsert({
        where: { id: data.id },
        create: data,
        update: {
          status: data.status,
          endedAt: data.endedAt,
          crashedAt: data.crashedAt,
          updatedAt: data.updatedAt
        }
      });

      // Upsert all bets
      for (const bet of round.bets) {
        const betData = PrismaBetMapper.toPrisma(bet);
        await tx.bet.upsert({
          where: { id: betData.id },
          create: betData,
          update: {
            status: betData.status,
            cashoutMultiplier: betData.cashoutMultiplier,
            payout: betData.payout,
            updatedAt: betData.updatedAt
          }
        });
      }
    });
  }
}
