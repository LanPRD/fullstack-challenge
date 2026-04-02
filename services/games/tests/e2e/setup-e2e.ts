import "dotenv/config";

import { UseCasesModule } from "@/application/use-cases/use-cases.module";
import { DatabaseModule } from "@/infrastructure/database/database.module";
import { PrismaService } from "@/infrastructure/database/prisma/prisma.service";
import { EnvModule } from "@/infrastructure/env/env.module";
import { EnvService } from "@/infrastructure/env/env.service";
import { GameEngineModule } from "@/infrastructure/game-engine/game-engine.module";
import { WalletClientService } from "@/infrastructure/messaging";
import {
  BetController,
  BetsController,
  GamesController,
  RoundsController
} from "@/presentation/controllers";
import { GameGateway } from "@/presentation/gateways";
import type { ExecutionContext, INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { Test } from "@nestjs/testing";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";

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

class MockWalletClientService {
  async debit() {
    return "mock-correlation-id";
  }
  async credit() {
    return "mock-correlation-id";
  }
}

const schemaId = randomUUID();

function generateDatabaseURL(schema: string) {
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

  // Run migrations on isolated schema
  execSync("bunx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: databaseURL }
  });

  const moduleRef = await Test.createTestingModule({
    imports: [
      EnvModule,
      EventEmitterModule.forRoot(),
      DatabaseModule,
      GameEngineModule,
      UseCasesModule
    ],
    controllers: [
      GamesController,
      RoundsController,
      BetsController,
      BetController
    ],
    providers: [
      GameGateway,
      {
        provide: APP_GUARD,
        useClass: MockAuthGuard
      },
      {
        provide: WalletClientService,
        useClass: MockWalletClientService
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
  await prisma.bet.deleteMany();
  await prisma.round.deleteMany();
}
