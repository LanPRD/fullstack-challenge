import { BetRepository, RoundRepository } from "@/domain";
import { Module } from "@nestjs/common";
import { InMemoryBetRepository } from "./in-memory-bet.repository";
import { InMemoryRoundRepository } from "./in-memory-round.repository";

@Module({
  providers: [
    {
      provide: RoundRepository,
      useClass: InMemoryRoundRepository
    },
    {
      provide: BetRepository,
      useClass: InMemoryBetRepository
    }
  ],
  exports: [RoundRepository, BetRepository]
})
export class RepositoriesModule {}
