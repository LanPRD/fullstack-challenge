import { BetRepository, RoundRepository } from "@/domain";
import { EnvModule } from "@/infrastructure/env/env.module";
import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";
import { PrismaBetRepository } from "./repositories/prisma-bet.repository";
import { PrismaRoundRepository } from "./repositories/prisma-round.repository";

@Module({
  imports: [EnvModule],
  providers: [
    PrismaService,
    {
      provide: RoundRepository,
      useClass: PrismaRoundRepository
    },
    {
      provide: BetRepository,
      useClass: PrismaBetRepository
    }
  ],
  exports: [PrismaService, RoundRepository, BetRepository]
})
export class DatabaseModule {}
