import "dotenv/config";

import {
  CreateWalletUseCase,
  GetWalletUseCase
} from "@/application/use-cases/wallet";
import { DatabaseModule } from "@/infrastructure/database/database.module";
import { PrismaService } from "@/infrastructure/database/prisma/prisma.service";
import { EnvModule } from "@/infrastructure/env/env.module";
import { EnvService } from "@/infrastructure/env/env.service";
import { GamesEventService } from "@/infrastructure/messaging/games-event.service";
import { WalletsController } from "@/presentation/controllers/wallets.controller";
import type { ExecutionContext, INestApplication } from "@nestjs/common";
import { Module, ValidationPipe } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach } from "bun:test";

export const TEST_USER = {
  id: "test-user-id",
  email: "test@example.com",
  username: "testuser"
};

class MockAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = TEST_USER;
    return true;
  }
}

class MockGamesEventService {
  async emitDebited() {}
  async emitDebitFailed() {}
  async emitCredited() {}
  async emitCreditFailed() {}
}

@Module({
  providers: [{ provide: GamesEventService, useClass: MockGamesEventService }],
  exports: [GamesEventService]
})
class MockMessagingModule {}

const useCases = [CreateWalletUseCase, GetWalletUseCase];

@Module({
  imports: [DatabaseModule, MockMessagingModule],
  providers: useCases,
  exports: useCases
})
class TestUseCasesModule {}

const schemaId = randomUUID();

function generateDatabaseURL(schema: string): string {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set("schema", schema);
  return url.toString();
}

export let app: INestApplication;
export let prisma: PrismaService;

export async function setupE2E() {
  const databaseURL = generateDatabaseURL(schemaId);
  process.env.DATABASE_URL = databaseURL;

  execSync("bunx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: databaseURL }
  });

  const moduleRef = await Test.createTestingModule({
    imports: [EnvModule, DatabaseModule, TestUseCasesModule],
    controllers: [WalletsController],
    providers: [
      {
        provide: APP_GUARD,
        useClass: MockAuthGuard
      }
    ]
  })
    .overrideProvider(EnvService)
    .useValue({
      get: (key: string) => {
        if (key === "DATABASE_URL") return databaseURL;
        return process.env[key];
      }
    })
    .compile();

  app = moduleRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })
  );

  prisma = moduleRef.get(PrismaService);

  await app.init();

  return { app, prisma };
}

export async function teardownE2E() {
  if (prisma) {
    try {
      await prisma.$executeRawUnsafe(
        `DROP SCHEMA IF EXISTS "${schemaId}" CASCADE`
      );
    } catch (error) {
      console.error(`Failed to drop schema ${schemaId}:`, error);
    }
  }

  if (app) {
    await app.close();
  }
}

export async function cleanDatabase() {
  await prisma.wallet.deleteMany();
}

beforeAll(async () => {
  await setupE2E();
});

afterAll(async () => {
  await teardownE2E();
});

beforeEach(async () => {
  await cleanDatabase();
});
