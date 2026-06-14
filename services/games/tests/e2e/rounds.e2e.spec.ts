import { RoundStatus, UniqueEntityId } from "@/domain";
import {
  PrismaBetMapper,
  PrismaRoundMapper
} from "@/infrastructure/database/mappers";
import { describe, expect, test } from "bun:test";
import request from "supertest";
import { BetFactory } from "tests/factories/bet-factory";
import { RoundFactory } from "tests/factories/round-factory";
import { app, prisma } from "./setup-e2e";

describe("Rounds E2E", () => {
  describe("GET /rounds/history", () => {
    test("returns empty list when no rounds exist", async () => {
      const response = await request(app.getHttpServer())
        .get("/rounds/history")
        .expect(200);

      expect(response.body).toEqual({
        data: [],
        total: 0,
        limit: 20,
        offset: 0
      });
    });

    test("returns paginated list of crashed rounds", async () => {
      const round1 = RoundFactory.build({
        status: RoundStatus.CRASHED,
        startedAt: new Date("2024-01-01T10:00:00Z"),
        endedAt: new Date("2024-01-01T10:00:10Z"),
        createdAt: new Date("2024-01-01T09:59:50Z")
      });

      const round2 = RoundFactory.build({
        status: RoundStatus.CRASHED,
        startedAt: new Date("2024-01-01T10:01:00Z"),
        endedAt: new Date("2024-01-01T10:01:05Z"),
        createdAt: new Date("2024-01-01T10:00:50Z")
      });

      // Create crashed rounds directly in DB
      await prisma.round.createMany({
        data: [
          PrismaRoundMapper.toPrisma(round1),
          PrismaRoundMapper.toPrisma(round2)
        ]
      });

      const response = await request(app.getHttpServer())
        .get("/rounds/history")
        .expect(200);

      expect(response.body.total).toBe(2);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].status).toBe("CRASHED");
    });

    test("respects pagination parameters", async () => {
      const round1 = RoundFactory.build({
        status: RoundStatus.CRASHED,
        startedAt: new Date(),
        endedAt: new Date()
      });

      const round2 = RoundFactory.build({
        status: RoundStatus.CRASHED,
        startedAt: new Date(),
        endedAt: new Date()
      });

      const round3 = RoundFactory.build({
        status: RoundStatus.CRASHED,
        startedAt: new Date(),
        endedAt: new Date()
      });

      // Create 3 rounds
      await prisma.round.createMany({
        data: [
          PrismaRoundMapper.toPrisma(round1),
          PrismaRoundMapper.toPrisma(round2),
          PrismaRoundMapper.toPrisma(round3)
        ]
      });

      const response = await request(app.getHttpServer())
        .get("/rounds/history?limit=2&offset=1")
        .expect(200);

      expect(response.body.total).toBe(3);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.limit).toBe(2);
      expect(response.body.offset).toBe(1);
    });
  });

  describe("GET /rounds/current", () => {
    test("returns 404 when no active round exists", async () => {
      const response = await request(app.getHttpServer())
        .get("/rounds/current")
        .expect(404);

      expect(response.body.message).toBe("No active round found");
    });

    test("returns current round in BETTING status", async () => {
      const round = RoundFactory.build();

      await prisma.round.create({
        data: PrismaRoundMapper.toPrisma(round)
      });

      const response = await request(app.getHttpServer())
        .get("/rounds/current")
        .expect(200);

      expect(response.body.id).toBe("round-betting");
      expect(response.body.status).toBe("BETTING");
      expect(response.body.serverSeedHash).toBe("hash-betting");
      // Server seed should not be exposed for active round
      expect(response.body.serverSeed).toBeUndefined();
    });

    test("returns current round in RUNNING status with bets", async () => {
      const round = RoundFactory.build({
        status: RoundStatus.RUNNING,
        startedAt: new Date()
      });

      const bet = BetFactory.build({}, undefined, round.id);

      await prisma.round.create({
        data: {
          ...PrismaRoundMapper.toPrisma(round),
          bets: {
            create: [PrismaBetMapper.toPrisma(bet)]
          }
        }
      });

      const response = await request(app.getHttpServer())
        .get("/rounds/current")
        .expect(200);

      expect(response.body.id).toBe("round-running");
      expect(response.body.status).toBe("RUNNING");
      expect(response.body.bets).toHaveLength(1);
      expect(response.body.bets[0].amount).toBe(10); // 1000 cents = $10.00
    });
  });

  describe("GET /rounds/:id/verify", () => {
    test("returns 404 for non-existent round", async () => {
      const response = await request(app.getHttpServer())
        .get("/rounds/non-existent-id/verify")
        .expect(404);

      expect(response.body.message).toBe("Round not found");
    });

    test("returns 400 for non-crashed round", async () => {
      const round = RoundFactory.build();

      await prisma.round.create({
        data: PrismaRoundMapper.toPrisma(round)
      });

      const response = await request(app.getHttpServer())
        .get("/rounds/round-betting/verify")
        .expect(400);

      expect(response.body.message).toContain("Round has not crashed yet");
    });

    test("returns verification data for crashed round", async () => {
      const round = RoundFactory.build(
        {
          status: RoundStatus.CRASHED,
          startedAt: new Date("2024-01-01T10:00:00Z"),
          endedAt: new Date("2024-01-01T10:00:15Z")
        },
        new UniqueEntityId("round-crashed")
      );

      await prisma.round.create({
        data: PrismaRoundMapper.toPrisma(round)
      });

      const response = await request(app.getHttpServer())
        .get("/rounds/round-crashed/verify")
        .expect(200);

      expect(response.body.roundId).toBe("round-crashed");
      expect(response.body.crashPoint).toBe(round.crashPoint);
      expect(response.body.serverSeed).toBe(round.provablyFair.serverSeed);
      expect(response.body.serverSeedHash).toBe(
        round.provablyFair.serverSeedHash
      );
    });
  });
});
