import { BetRepository, RoundRepository } from "@/domain";
import { EnvModule } from "@/infrastructure/env/env.module";
import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";
import { InMemoryBetRepository } from "./repositories/in-memory-bet.repository";
import { InMemoryRoundRepository } from "./repositories/in-memory-round.repository";

@Module({
  imports: [EnvModule],
  providers: [
    PrismaService,
    {
      provide: RoundRepository,
      useClass: InMemoryRoundRepository
    },
    {
      provide: BetRepository,
      useClass: InMemoryBetRepository
    }
  ],
  exports: [PrismaService, RoundRepository, BetRepository]
})
export class DatabaseModule {}
