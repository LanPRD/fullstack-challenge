import { describe, expect, test } from "bun:test";
import request from "supertest";
import { app, prisma, TEST_USER } from "./setup-e2e";

describe("Wallets E2E", () => {
  describe("POST /wallets", () => {
    test("creates a wallet for authenticated user", async () => {
      const response = await request(app.getHttpServer())
        .post("/wallets")
        .expect(201);

      expect(response.body.userId).toBe(TEST_USER.id);
      expect(response.body.balance).toBe(0);
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    test("returns 409 when wallet already exists", async () => {
      await request(app.getHttpServer()).post("/wallets").expect(201);

      const response = await request(app.getHttpServer())
        .post("/wallets")
        .expect(409);

      expect(response.body.message).toContain("already exists");
    });

    test("persists wallet with zero balance in database", async () => {
      await request(app.getHttpServer()).post("/wallets").expect(201);

      const wallet = await prisma.wallet.findUnique({
        where: { userId: TEST_USER.id }
      });

      expect(wallet).not.toBeNull();
      expect(wallet?.userId).toBe(TEST_USER.id);
      expect(wallet?.balance).toBe(0n);
    });
  });

  describe("GET /wallets/me", () => {
    test("returns wallet for authenticated user", async () => {
      await prisma.wallet.create({
        data: {
          id: "wallet-1",
          userId: TEST_USER.id,
          balance: 50_000n,
          updatedAt: new Date()
        }
      });

      const response = await request(app.getHttpServer())
        .get("/wallets/me")
        .expect(200);

      expect(response.body.userId).toBe(TEST_USER.id);
      expect(response.body.balance).toBe(500); // 50000 cents = R$500.00
    });

    test("returns 404 when wallet does not exist", async () => {
      const response = await request(app.getHttpServer())
        .get("/wallets/me")
        .expect(404);

      expect(response.body.message).toBe("Wallet not found");
    });

    test("returns balance in currency units not cents", async () => {
      await prisma.wallet.create({
        data: {
          id: "wallet-1",
          userId: TEST_USER.id,
          balance: 1_00n, // 100 cents = R$1.00
          updatedAt: new Date()
        }
      });

      const response = await request(app.getHttpServer())
        .get("/wallets/me")
        .expect(200);

      expect(response.body.balance).toBe(1);
    });

    test("creates then retrieves wallet with consistent data", async () => {
      await request(app.getHttpServer()).post("/wallets").expect(201);

      const response = await request(app.getHttpServer())
        .get("/wallets/me")
        .expect(200);

      expect(response.body.userId).toBe(TEST_USER.id);
      expect(response.body.balance).toBe(0);
    });
  });

  describe("GET /wallets/health", () => {
    test("returns ok without authentication", async () => {
      const response = await request(app.getHttpServer())
        .get("/wallets/health")
        .expect(200);

      expect(response.body.status).toBe("ok");
      expect(response.body.service).toBe("wallets");
    });
  });
});
