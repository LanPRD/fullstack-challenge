import { UseCasesModule } from "@/application/use-cases/use-cases.module";
import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { EnvModule } from "./infrastructure/env/env.module";
import { GameEngineModule } from "./infrastructure/game-engine/game-engine.module";
import {
  BetsController,
  GamesController,
  RoundsController
} from "./presentation/controllers";
import { GameGateway } from "./presentation/gateways";

@Module({
  imports: [
    EnvModule,
    EventEmitterModule.forRoot(),
    GameEngineModule,
    UseCasesModule
  ],
  controllers: [GamesController, RoundsController, BetsController],
  providers: [GameGateway]
})
export class AppModule {}
