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

describe("Bet E2E", () => {
  describe("POST /bet", () => {
    test("returns 404 when no active round exists", async () => {
      const response = await request(app.getHttpServer())
        .post("/bet")
        .send({ amount: 1000 })
        .expect(404);

      expect(response.body.message).toBe("No active round");
    });

    test("returns 400 when amount is below minimum", async () => {
      const round = RoundFactory.build(
        { status: RoundStatus.BETTING },
        new UniqueEntityId("round-betting")
      );

      await prisma.round.create({
        data: PrismaRoundMapper.toPrisma(round)
      });

      const response = await request(app.getHttpServer())
        .post("/bet")
        .send({ amount: 50 }) // min is 100
        .expect(400);

      expect(response.body.message[0]).toContain("Minimum bet");
    });

    test("returns 400 when amount is above maximum", async () => {
      const round = RoundFactory.build(
        { status: RoundStatus.BETTING },
        new UniqueEntityId("round-betting")
      );

      await prisma.round.create({
        data: PrismaRoundMapper.toPrisma(round)
      });

      const response = await request(app.getHttpServer())
        .post("/bet")
        .send({ amount: 200000 }) // max is 100000
        .expect(400);

      expect(response.body.message[0]).toContain("Maximum bet");
    });

    test("returns 400 when round is not in betting phase", async () => {
      const round = RoundFactory.build(
        {
          status: RoundStatus.RUNNING,
          startedAt: new Date()
        },
        new UniqueEntityId("round-running")
      );

      await prisma.round.create({
        data: PrismaRoundMapper.toPrisma(round)
      });

      const response = await request(app.getHttpServer())
        .post("/bet")
        .send({ amount: 1000 })
        .expect(400);

      expect(response.body.message).toContain("Betting phase has ended");
    });

    test("places bet successfully during betting phase", async () => {
      const round = RoundFactory.build(
        { status: RoundStatus.BETTING },
        new UniqueEntityId("round-betting")
      );

      await prisma.round.create({
        data: PrismaRoundMapper.toPrisma(round)
      });

      const response = await request(app.getHttpServer())
        .post("/bet")
        .send({ amount: 1000 })
        .expect(201);

      expect(response.body.amount).toBe(10); // 1000 cents = $10
      expect(response.body.status).toBe("PENDING");
      expect(response.body.roundId).toBe("round-betting");
      expect(response.body.userId).toBe(TEST_USER.id);
    });

    test("returns 400 when user already has a bet in the round", async () => {
      const round = RoundFactory.build(
        { status: RoundStatus.BETTING },
        new UniqueEntityId("round-betting")
      );

      const existingBet = BetFactory.build(
        {
          status: BetStatus.PENDING,
          amount: BetFactory.createMoney(BigInt(500))
        },
        new UniqueEntityId(TEST_USER.id),
        round.id,
        new UniqueEntityId("existing-bet")
      );

      const { roundId: _roundId, ...existingBetData } =
        PrismaBetMapper.toPrisma(existingBet);
      await prisma.round.create({
        data: {
          ...PrismaRoundMapper.toPrisma(round),
          bets: {
            create: existingBetData
          }
        }
      });

      const response = await request(app.getHttpServer())
        .post("/bet")
        .send({ amount: 1000 })
        .expect(400);

      expect(response.body.message).toContain("already placed a bet");
    });
  });

  describe("POST /bet/cashout", () => {
    test("returns 404 when no active bet found", async () => {
      const round = RoundFactory.build(
        {
          status: RoundStatus.RUNNING,
          startedAt: new Date()
        },
        new UniqueEntityId("round-running")
      );

      await prisma.round.create({
        data: PrismaRoundMapper.toPrisma(round)
      });

      const response = await request(app.getHttpServer())
        .post("/bet/cashout")
        .expect(404);

      expect(response.body.message).toContain("No active bet found");
    });
  });
});
