import { UseCasesModule } from "@/application/use-cases/use-cases.module";
import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { GameEngineService } from "./game-engine.service";

@Module({
  imports: [EventEmitterModule.forRoot(), UseCasesModule],
  providers: [GameEngineService],
  exports: [GameEngineService]
})
export class GameEngineModule {}
