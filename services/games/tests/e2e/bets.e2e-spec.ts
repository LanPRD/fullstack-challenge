import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from "bun:test";
import request from "supertest";
import {
  app,
  cleanDatabase,
  prisma,
  setupE2E,
  teardownE2E,
  TEST_USER
} from "./setup-e2e";

describe("Bets History E2E", () => {
  beforeAll(async () => {
    await setupE2E();
  });

  afterAll(async () => {
    await teardownE2E();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

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
      // Create round with bets from different users
      await prisma.round.create({
        data: {
          id: "round-1",
          status: "CRASHED",
          serverSeed: "seed",
          serverSeedHash: "hash",
          crashPoint: 2.5,
          startedAt: new Date(),
          endedAt: new Date(),
          bets: {
            createMany: {
              data: [
                {
                  id: "bet-1",
                  userId: TEST_USER.id,
                  amount: 1000,
                  status: "CASHED_OUT",
                  cashoutMultiplier: 2.0,
                  payout: 2000
                },
                {
                  id: "bet-2",
                  userId: "other-user-id",
                  amount: 500,
                  status: "LOST"
                }
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
      expect(response.body.data[0].amount).toBe(10); // 1000 cents = $10
      expect(response.body.data[0].status).toBe("CASHED_OUT");
    });

    test("returns bets ordered by creation time descending", async () => {
      // Create two rounds with bets
      await prisma.round.create({
        data: {
          id: "round-1",
          status: "CRASHED",
          serverSeed: "seed-1",
          serverSeedHash: "hash-1",
          crashPoint: 2.0,
          startedAt: new Date("2024-01-01T10:00:00Z"),
          endedAt: new Date("2024-01-01T10:00:10Z"),
          bets: {
            create: {
              id: "bet-old",
              userId: TEST_USER.id,
              amount: 500,
              status: "LOST",
              createdAt: new Date("2024-01-01T09:59:55Z")
            }
          }
        }
      });

      await prisma.round.create({
        data: {
          id: "round-2",
          status: "CRASHED",
          serverSeed: "seed-2",
          serverSeedHash: "hash-2",
          crashPoint: 3.0,
          startedAt: new Date("2024-01-01T11:00:00Z"),
          endedAt: new Date("2024-01-01T11:00:15Z"),
          bets: {
            create: {
              id: "bet-new",
              userId: TEST_USER.id,
              amount: 1000,
              status: "CASHED_OUT",
              cashoutMultiplier: 2.5,
              payout: 2500,
              createdAt: new Date("2024-01-01T10:59:55Z")
            }
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
        await prisma.round.create({
          data: {
            id: `round-${i}`,
            status: "CRASHED",
            serverSeed: `seed-${i}`,
            serverSeedHash: `hash-${i}`,
            crashPoint: 2.0,
            startedAt: new Date(),
            endedAt: new Date(),
            bets: {
              create: {
                id: `bet-${i}`,
                userId: TEST_USER.id,
                amount: i * 100,
                status: "LOST"
              }
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
