import {
  Bet,
  BetRepository,
  UniqueEntityId,
  type PaginatedResult,
  type PaginationOptions
} from "@/domain";
import { Injectable } from "@nestjs/common";
import { PrismaBetMapper } from "../mappers";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrismaBetRepository implements BetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: UniqueEntityId): Promise<Bet | null> {
    const bet = await this.prisma.bet.findUnique({
      where: { id: id.toString() }
    });

    if (!bet) return null;

    return PrismaBetMapper.toDomain(bet);
  }

  async findByRoundId(roundId: UniqueEntityId): Promise<Bet[]> {
    const bets = await this.prisma.bet.findMany({
      where: { roundId: roundId.toString() }
    });

    return bets.map(PrismaBetMapper.toDomain);
  }

  async findByUserId(
    userId: UniqueEntityId,
    options: PaginationOptions
  ): Promise<PaginatedResult<Bet>> {
    const { limit, offset } = options;

    const [bets, total] = await Promise.all([
      this.prisma.bet.findMany({
        where: { userId: userId.toString() },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset
      }),
      this.prisma.bet.count({
        where: { userId: userId.toString() }
      })
    ]);

    return {
      data: bets.map(PrismaBetMapper.toDomain),
      total,
      limit,
      offset
    };
  }

  async save(bet: Bet): Promise<void> {
    const data = PrismaBetMapper.toPrisma(bet);

    await this.prisma.bet.upsert({
      where: { id: data.id },
      create: data,
      update: {
        status: data.status,
        cashoutMultiplier: data.cashoutMultiplier,
        payout: data.payout,
        updatedAt: data.updatedAt
      }
    });
  }

  async saveMany(bets: Bet[]): Promise<void> {
    await this.prisma.$transaction(async tx => {
      for (const bet of bets) {
        const data = PrismaBetMapper.toPrisma(bet);
        await tx.bet.upsert({
          where: { id: data.id },
          create: data,
          update: {
            status: data.status,
            cashoutMultiplier: data.cashoutMultiplier,
            payout: data.payout,
            updatedAt: data.updatedAt
          }
        });
      }
    });
  }
}
