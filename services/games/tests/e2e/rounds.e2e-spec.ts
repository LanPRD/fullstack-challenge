import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from "bun:test";
import request from "supertest";
import { app, cleanDatabase, prisma, setupE2E, teardownE2E } from "./setup-e2e";

describe("Rounds E2E", () => {
  beforeAll(async () => {
    await setupE2E();
  });

  afterAll(async () => {
    await teardownE2E();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

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
      // Create crashed rounds directly in DB
      await prisma.round.createMany({
        data: [
          {
            id: "round-1",
            status: "CRASHED",
            serverSeed: "seed-1",
            serverSeedHash: "hash-1",
            crashPoint: 2.5,
            startedAt: new Date("2024-01-01T10:00:00Z"),
            endedAt: new Date("2024-01-01T10:00:10Z"),
            createdAt: new Date("2024-01-01T09:59:50Z")
          },
          {
            id: "round-2",
            status: "CRASHED",
            serverSeed: "seed-2",
            serverSeedHash: "hash-2",
            crashPoint: 1.5,
            startedAt: new Date("2024-01-01T10:01:00Z"),
            endedAt: new Date("2024-01-01T10:01:05Z"),
            createdAt: new Date("2024-01-01T10:00:50Z")
          }
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
      // Create 3 rounds
      await prisma.round.createMany({
        data: [
          {
            id: "round-1",
            status: "CRASHED",
            serverSeed: "seed-1",
            serverSeedHash: "hash-1",
            crashPoint: 2.5,
            startedAt: new Date(),
            endedAt: new Date()
          },
          {
            id: "round-2",
            status: "CRASHED",
            serverSeed: "seed-2",
            serverSeedHash: "hash-2",
            crashPoint: 1.5,
            startedAt: new Date(),
            endedAt: new Date()
          },
          {
            id: "round-3",
            status: "CRASHED",
            serverSeed: "seed-3",
            serverSeedHash: "hash-3",
            crashPoint: 3.0,
            startedAt: new Date(),
            endedAt: new Date()
          }
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
      await prisma.round.create({
        data: {
          id: "round-betting",
          status: "BETTING",
          serverSeed: "seed-betting",
          serverSeedHash: "hash-betting",
          crashPoint: 2.5,
          createdAt: new Date()
        }
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
      await prisma.round.create({
        data: {
          id: "round-running",
          status: "RUNNING",
          serverSeed: "seed-running",
          serverSeedHash: "hash-running",
          crashPoint: 3.0,
          startedAt: new Date(),
          bets: {
            create: [
              {
                id: "bet-1",
                userId: "user-1",
                amount: 1000,
                status: "PENDING"
              }
            ]
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
      await prisma.round.create({
        data: {
          id: "round-betting",
          status: "BETTING",
          serverSeed: "seed",
          serverSeedHash: "hash",
          crashPoint: 2.0
        }
      });

      const response = await request(app.getHttpServer())
        .get("/rounds/round-betting/verify")
        .expect(400);

      expect(response.body.message).toContain("Round has not crashed yet");
    });

    test("returns verification data for crashed round", async () => {
      await prisma.round.create({
        data: {
          id: "round-crashed",
          status: "CRASHED",
          serverSeed: "my-secret-seed",
          serverSeedHash: "my-hash",
          crashPoint: 2.47,
          startedAt: new Date("2024-01-01T10:00:00Z"),
          endedAt: new Date("2024-01-01T10:00:15Z")
        }
      });

      const response = await request(app.getHttpServer())
        .get("/rounds/round-crashed/verify")
        .expect(200);

      expect(response.body.roundId).toBe("round-crashed");
      expect(response.body.serverSeed).toBe("my-secret-seed");
      expect(response.body.serverSeedHash).toBe("my-hash");
      expect(response.body.crashPoint).toBe(2.47);
    });
  });
});
