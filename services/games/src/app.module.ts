import { Module } from "@nestjs/common";
import { EnvModule } from "./infrastructure/env/env.module";
import { GameEngineModule } from "./infrastructure/game-engine/game-engine.module";
import { GamesController } from "./presentation/controllers/games.controller";

@Module({
  imports: [EnvModule, GameEngineModule],
  controllers: [GamesController]
})
export class AppModule {}
