import { UseCasesModule } from "@/application/use-cases/use-cases.module";
import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { AuthModule } from "./infrastructure/auth";
import { EnvModule } from "./infrastructure/env/env.module";
import { GameEngineModule } from "./infrastructure/game-engine/game-engine.module";
import { MessagingModule } from "./infrastructure/messaging";
import {
  BetController,
  BetsController,
  GamesController,
  RoundsController
} from "./presentation/controllers";
import { GameGateway } from "./presentation/gateways";

@Module({
  imports: [
    EnvModule,
    EventEmitterModule.forRoot(),
    AuthModule,
    GameEngineModule,
    MessagingModule,
    UseCasesModule
  ],
  controllers: [
    GamesController,
    RoundsController,
    BetsController,
    BetController
  ],
  providers: [GameGateway]
})
export class AppModule {}
