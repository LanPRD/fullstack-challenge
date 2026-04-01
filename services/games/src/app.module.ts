import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { EnvModule } from "./infrastructure/env/env.module";
import { GameEngineModule } from "./infrastructure/game-engine/game-engine.module";
import { GamesController } from "./presentation/controllers/games.controller";
import { GameGateway } from "./presentation/gateways";

@Module({
  imports: [EnvModule, EventEmitterModule.forRoot(), GameEngineModule],
  controllers: [GamesController],
  providers: [GameGateway]
})
export class AppModule {}
