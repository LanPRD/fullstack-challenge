import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { EnvModule } from "./infrastructure/env/env.module";
import { GameEngineModule } from "./infrastructure/game-engine/game-engine.module";
import { GamesController } from "./presentation/controllers/games.controller";

@Module({
  imports: [EnvModule, EventEmitterModule.forRoot(), GameEngineModule],
  controllers: [GamesController]
})
export class AppModule {}
