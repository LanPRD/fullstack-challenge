import { EnvService } from "@/infrastructure/env/env.service";
import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit
} from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(env: EnvService) {
    const databaseUrl = env.get("DATABASE_URL");
    const schema = PrismaService.extractSchema(databaseUrl);

    const adapter = new PrismaPg(
      { connectionString: databaseUrl.split("?")[0] },
      { schema }
    );

    super({
      log: ["warn", "error"],
      adapter
    });
  }

  private static extractSchema(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.searchParams.get("schema") ?? "public";
    } catch {
      return "public";
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
