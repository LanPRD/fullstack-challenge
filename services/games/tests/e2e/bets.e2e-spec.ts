import { BetStatus, RoundStatus, UniqueEntityId } from "@/domain";
import {
  PrismaBetMapper,
  PrismaRoundMapper
} from "@/infrastructure/database/mappers";
import { describe, expect, test } from "bun:test";
import request from "supertest";
import { BetFactory } from "tests/factories/bet-factory";
import { RoundFactory } from "tests/factories/round-factory";
import { app, prisma, TEST_USER } from "./setup-e2e";

describe("Bets History E2E", () => {
  describe("GET /bets/me", () => {
    test("returns empty list when user has no bets", async () => {
      const response = await request(app.getHttpServer())
        .get("/bets/me")
        .expect(200);

      expect(response.body).toEqual({
        data: [],
        total: 0,
        limit: 20,
        offset: 0
      });
    });

    test("returns user bets only", async () => {
      const round = RoundFactory.build(
        {
          status: RoundStatus.CRASHED,
          startedAt: new Date(),
          endedAt: new Date()
        },
        new UniqueEntityId("round-1")
      );

      const userBet = BetFactory.build(
        {
          status: BetStatus.CASHED_OUT,
          cashoutMultiplier: 2.0,
          payout: BetFactory.createMoney(BigInt(2000))
        },
        new UniqueEntityId(TEST_USER.id),
        round.id,
        new UniqueEntityId("bet-1")
      );

      const otherUserBet = BetFactory.build(
        { status: BetStatus.LOST },
        new UniqueEntityId("other-user-id"),
        round.id,
        new UniqueEntityId("bet-2")
      );

      await prisma.round.create({
        data: {
          ...PrismaRoundMapper.toPrisma(round),
          bets: {
            createMany: {
              data: [
                PrismaBetMapper.toPrisma(userBet),
                PrismaBetMapper.toPrisma(otherUserBet)
              ]
            }
          }
        }
      });

      const response = await request(app.getHttpServer())
        .get("/bets/me")
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].userId).toBe(TEST_USER.id);
      expect(response.body.data[0].amount).toBe(100); // 10000 cents = $100
      expect(response.body.data[0].status).toBe("CASHED_OUT");
    });

    test("returns bets ordered by creation time descending", async () => {
      const round1 = RoundFactory.build(
        {
          status: RoundStatus.CRASHED,
          startedAt: new Date("2024-01-01T10:00:00Z"),
          endedAt: new Date("2024-01-01T10:00:10Z")
        },
        new UniqueEntityId("round-1")
      );

      const round2 = RoundFactory.build(
        {
          status: RoundStatus.CRASHED,
          startedAt: new Date("2024-01-01T11:00:00Z"),
          endedAt: new Date("2024-01-01T11:00:15Z")
        },
        new UniqueEntityId("round-2")
      );

      const oldBet = BetFactory.build(
        {
          status: BetStatus.LOST,
          amount: BetFactory.createMoney(BigInt(500)),
          createdAt: new Date("2024-01-01T09:59:55Z")
        },
        new UniqueEntityId(TEST_USER.id),
        round1.id,
        new UniqueEntityId("bet-old")
      );

      const newBet = BetFactory.build(
        {
          status: BetStatus.CASHED_OUT,
          cashoutMultiplier: 2.5,
          payout: BetFactory.createMoney(BigInt(2500)),
          createdAt: new Date("2024-01-01T10:59:55Z")
        },
        new UniqueEntityId(TEST_USER.id),
        round2.id,
        new UniqueEntityId("bet-new")
      );

      await prisma.round.create({
        data: {
          ...PrismaRoundMapper.toPrisma(round1),
          bets: {
            create: PrismaBetMapper.toPrisma(oldBet)
          }
        }
      });

      await prisma.round.create({
        data: {
          ...PrismaRoundMapper.toPrisma(round2),
          bets: {
            create: PrismaBetMapper.toPrisma(newBet)
          }
        }
      });

      const response = await request(app.getHttpServer())
        .get("/bets/me")
        .expect(200);

      expect(response.body.total).toBe(2);
      expect(response.body.data[0].id).toBe("bet-new"); // Most recent first
      expect(response.body.data[1].id).toBe("bet-old");
    });

    test("respects pagination parameters", async () => {
      // Create multiple rounds, each with one bet from the user
      for (let i = 1; i <= 3; i++) {
        const round = RoundFactory.build(
          {
            status: RoundStatus.CRASHED,
            startedAt: new Date(),
            endedAt: new Date()
          },
          new UniqueEntityId(`round-${i}`)
        );

        const bet = BetFactory.build(
          {
            status: BetStatus.LOST,
            amount: BetFactory.createMoney(BigInt(i * 100))
          },
          new UniqueEntityId(TEST_USER.id),
          round.id,
          new UniqueEntityId(`bet-${i}`)
        );

        await prisma.round.create({
          data: {
            ...PrismaRoundMapper.toPrisma(round),
            bets: {
              create: PrismaBetMapper.toPrisma(bet)
            }
          }
        });
      }

      const response = await request(app.getHttpServer())
        .get("/bets/me?limit=2&offset=1")
        .expect(200);

      expect(response.body.total).toBe(3);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.limit).toBe(2);
      expect(response.body.offset).toBe(1);
    });
  });
});
