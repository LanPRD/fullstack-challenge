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

describe("Bet E2E", () => {
  beforeAll(async () => {
    await setupE2E();
  });

  afterAll(async () => {
    await teardownE2E();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe("POST /bet", () => {
    test("returns 404 when no active round exists", async () => {
      const response = await request(app.getHttpServer())
        .post("/bet")
        .send({ amount: 1000 })
        .expect(404);

      expect(response.body.message).toBe("No active round");
    });

    test("returns 400 when amount is below minimum", async () => {
      await prisma.round.create({
        data: {
          id: "round-betting",
          status: "BETTING",
          serverSeed: "seed",
          serverSeedHash: "hash",
          crashPoint: 2.5
        }
      });

      const response = await request(app.getHttpServer())
        .post("/bet")
        .send({ amount: 50 }) // min is 100
        .expect(400);

      expect(response.body.message[0]).toContain("Minimum bet");
    });

    test("returns 400 when amount is above maximum", async () => {
      await prisma.round.create({
        data: {
          id: "round-betting",
          status: "BETTING",
          serverSeed: "seed",
          serverSeedHash: "hash",
          crashPoint: 2.5
        }
      });

      const response = await request(app.getHttpServer())
        .post("/bet")
        .send({ amount: 200000 }) // max is 100000
        .expect(400);

      expect(response.body.message[0]).toContain("Maximum bet");
    });

    test("returns 400 when round is not in betting phase", async () => {
      await prisma.round.create({
        data: {
          id: "round-running",
          status: "RUNNING",
          serverSeed: "seed",
          serverSeedHash: "hash",
          crashPoint: 2.5,
          startedAt: new Date()
        }
      });

      const response = await request(app.getHttpServer())
        .post("/bet")
        .send({ amount: 1000 })
        .expect(400);

      expect(response.body.message).toContain("Betting phase has ended");
    });

    test("places bet successfully during betting phase", async () => {
      await prisma.round.create({
        data: {
          id: "round-betting",
          status: "BETTING",
          serverSeed: "seed",
          serverSeedHash: "hash",
          crashPoint: 2.5
        }
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
      await prisma.round.create({
        data: {
          id: "round-betting",
          status: "BETTING",
          serverSeed: "seed",
          serverSeedHash: "hash",
          crashPoint: 2.5,
          bets: {
            create: {
              id: "existing-bet",
              userId: TEST_USER.id,
              amount: 500,
              status: "PENDING"
            }
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
      await prisma.round.create({
        data: {
          id: "round-running",
          status: "RUNNING",
          serverSeed: "seed",
          serverSeedHash: "hash",
          crashPoint: 2.5,
          startedAt: new Date()
        }
      });

      const response = await request(app.getHttpServer())
        .post("/bet/cashout")
        .expect(404);

      expect(response.body.message).toContain("No active bet found");
    });
  });
});
