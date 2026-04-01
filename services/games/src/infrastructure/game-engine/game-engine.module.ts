import { RoundRepository } from "@/domain";
import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { GameEngineService } from "./game-engine.service";

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    GameEngineService,
    {
      provide: RoundRepository,
      useValue: {} // Will be replaced by actual implementation
    }
  ],
  exports: [GameEngineService]
})
export class GameEngineModule {}
